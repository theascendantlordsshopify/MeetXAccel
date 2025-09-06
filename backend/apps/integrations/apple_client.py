"""
Apple Calendar integration client using CalDAV protocol.

Note: This implementation uses only Python standard library modules
and provides basic CalDAV functionality for Apple Calendar integration.
"""
import logging
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
import base64
import json
from .utils import log_integration_activity

logger = logging.getLogger(__name__)


class AppleCalendarClient:
    """
    Client for Apple Calendar integration using CalDAV protocol.
    
    Note: This is a basic implementation using standard library only.
    For production use, consider using a dedicated CalDAV library.
    """
    
    def __init__(self, integration):
        """
        Initialize Apple Calendar client.
        
        Args:
            integration: CalendarIntegration instance
        """
        self.integration = integration
        self.organizer = integration.organizer
        
        # Apple Calendar CalDAV endpoints
        self.caldav_base_url = "https://caldav.icloud.com"
        self.calendar_home_url = f"{self.caldav_base_url}/{integration.provider_user_id}/calendars/"
        
        # Use calendar_id if specified, otherwise use default
        self.calendar_url = f"{self.calendar_home_url}{integration.calendar_id or 'home'}/"
    
    def _get_auth_headers(self):
        """Get authentication headers for CalDAV requests."""
        if not self.integration.access_token:
            raise Exception("No access token available for Apple Calendar")
        
        # For Apple Calendar, the access_token is typically an app-specific password
        # or the user's Apple ID credentials (in a real implementation)
        auth_string = f"{self.integration.provider_email}:{self.integration.access_token}"
        auth_bytes = auth_string.encode('utf-8')
        auth_b64 = base64.b64encode(auth_bytes).decode('ascii')
        
        return {
            'Authorization': f'Basic {auth_b64}',
            'Content-Type': 'application/xml; charset=utf-8',
            'User-Agent': 'Calendly-Clone/1.0',
            'Depth': '1'
        }
    
    def _make_caldav_request(self, method, url, data=None, headers=None):
        """Make a CalDAV request using standard library."""
        try:
            request_headers = self._get_auth_headers()
            if headers:
                request_headers.update(headers)
            
            if isinstance(data, str):
                data = data.encode('utf-8')
            
            request = Request(url, data=data, headers=request_headers, method=method)
            
            with urlopen(request, timeout=30) as response:
                response_data = response.read().decode('utf-8')
                return {
                    'status_code': response.status,
                    'content': response_data,
                    'headers': dict(response.headers)
                }
                
        except HTTPError as e:
            error_content = e.read().decode('utf-8') if hasattr(e, 'read') else str(e)
            raise Exception(f"CalDAV HTTP error {e.code}: {error_content}")
        except URLError as e:
            raise Exception(f"CalDAV connection error: {str(e)}")
        except Exception as e:
            raise Exception(f"CalDAV request failed: {str(e)}")
    
    def get_busy_times(self, start_date, end_date):
        """
        Get busy times from Apple Calendar using CalDAV REPORT.
        
        Args:
            start_date: Start date for sync
            end_date: End date for sync
        
        Returns:
            list: List of parsed events
        """
        try:
            # Convert dates to CalDAV format (ISO 8601)
            start_datetime = datetime.combine(start_date, datetime.min.time()).replace(tzinfo=timezone.utc)
            end_datetime = datetime.combine(end_date, datetime.max.time()).replace(tzinfo=timezone.utc)
            
            start_iso = start_datetime.strftime('%Y%m%dT%H%M%SZ')
            end_iso = end_datetime.strftime('%Y%m%dT%H%M%SZ')
            
            # CalDAV REPORT query for events in date range
            report_xml = f"""<?xml version="1.0" encoding="utf-8" ?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
    <D:prop>
        <D:getetag />
        <C:calendar-data />
    </D:prop>
    <C:filter>
        <C:comp-filter name="VCALENDAR">
            <C:comp-filter name="VEVENT">
                <C:time-range start="{start_iso}" end="{end_iso}"/>
            </C:comp-filter>
        </C:comp-filter>
    </C:filter>
</C:calendar-query>"""
            
            response = self._make_caldav_request(
                'REPORT',
                self.calendar_url,
                data=report_xml
            )
            
            # Parse CalDAV response
            events = self._parse_caldav_events_response(response['content'])
            
            log_integration_activity(
                organizer=self.organizer,
                log_type='calendar_sync',
                integration_type='apple',
                message=f"Successfully fetched {len(events)} events from Apple Calendar",
                success=True,
                details={'event_count': len(events), 'date_range': f"{start_date} to {end_date}"}
            )
            
            return events
            
        except Exception as e:
            logger.error(f"Error fetching Apple Calendar events: {str(e)}")
            log_integration_activity(
                organizer=self.organizer,
                log_type='calendar_sync',
                integration_type='apple',
                message=f"Failed to fetch events: {str(e)}",
                success=False,
                details={'error': str(e)}
            )
            raise
    
    def create_event(self, booking):
        """
        Create an event in Apple Calendar using CalDAV PUT.
        
        Args:
            booking: Booking instance
        
        Returns:
            str: External event ID (UID)
        """
        try:
            # Generate unique UID for the event
            import uuid
            event_uid = f"booking-{booking.id}@calendly-clone.com"
            
            # Create iCalendar event data
            ical_data = self._create_ical_event(booking, event_uid)
            
            # PUT the event to CalDAV server
            event_url = f"{self.calendar_url}{event_uid}.ics"
            
            response = self._make_caldav_request(
                'PUT',
                event_url,
                data=ical_data,
                headers={'Content-Type': 'text/calendar; charset=utf-8'}
            )
            
            if response['status_code'] in [201, 204]:
                log_integration_activity(
                    organizer=self.organizer,
                    log_type='calendar_event_created',
                    integration_type='apple',
                    message=f"Created Apple Calendar event for booking {booking.id}",
                    success=True,
                    booking=booking,
                    details={'external_event_id': event_uid}
                )
                
                return event_uid
            else:
                raise Exception(f"Unexpected response status: {response['status_code']}")
            
        except Exception as e:
            logger.error(f"Error creating Apple Calendar event: {str(e)}")
            log_integration_activity(
                organizer=self.organizer,
                log_type='calendar_event_created',
                integration_type='apple',
                message=f"Failed to create event: {str(e)}",
                success=False,
                booking=booking,
                details={'error': str(e)}
            )
            raise
    
    def update_event(self, booking):
        """
        Update an event in Apple Calendar.
        
        Args:
            booking: Booking instance with external_calendar_event_id
        
        Returns:
            bool: True if successful
        """
        if not booking.external_calendar_event_id:
            raise ValueError("No external calendar event ID found")
        
        try:
            # Create updated iCalendar event data
            ical_data = self._create_ical_event(booking, booking.external_calendar_event_id)
            
            # PUT the updated event
            event_url = f"{self.calendar_url}{booking.external_calendar_event_id}.ics"
            
            response = self._make_caldav_request(
                'PUT',
                event_url,
                data=ical_data,
                headers={'Content-Type': 'text/calendar; charset=utf-8'}
            )
            
            if response['status_code'] in [200, 204]:
                log_integration_activity(
                    organizer=self.organizer,
                    log_type='calendar_event_updated',
                    integration_type='apple',
                    message=f"Updated Apple Calendar event for booking {booking.id}",
                    success=True,
                    booking=booking
                )
                return True
            else:
                raise Exception(f"Unexpected response status: {response['status_code']}")
            
        except Exception as e:
            logger.error(f"Error updating Apple Calendar event: {str(e)}")
            log_integration_activity(
                organizer=self.organizer,
                log_type='calendar_event_updated',
                integration_type='apple',
                message=f"Failed to update event: {str(e)}",
                success=False,
                booking=booking,
                details={'error': str(e)}
            )
            return False
    
    def delete_event(self, booking):
        """
        Delete an event from Apple Calendar.
        
        Args:
            booking: Booking instance with external_calendar_event_id
        
        Returns:
            bool: True if successful
        """
        if not booking.external_calendar_event_id:
            return True  # Nothing to delete
        
        try:
            event_url = f"{self.calendar_url}{booking.external_calendar_event_id}.ics"
            
            response = self._make_caldav_request('DELETE', event_url)
            
            if response['status_code'] in [200, 204, 404]:
                # 404 means already deleted, which is fine
                log_integration_activity(
                    organizer=self.organizer,
                    log_type='calendar_event_deleted',
                    integration_type='apple',
                    message=f"Deleted Apple Calendar event for booking {booking.id}",
                    success=True,
                    booking=booking
                )
                return True
            else:
                raise Exception(f"Unexpected response status: {response['status_code']}")
            
        except Exception as e:
            # If event doesn't exist, consider it successful
            if '404' in str(e) or 'not found' in str(e).lower():
                logger.info(f"Apple Calendar event already deleted for booking {booking.id}")
                return True
            
            logger.error(f"Error deleting Apple Calendar event: {str(e)}")
            log_integration_activity(
                organizer=self.organizer,
                log_type='calendar_event_deleted',
                integration_type='apple',
                message=f"Failed to delete event: {str(e)}",
                success=False,
                booking=booking,
                details={'error': str(e)}
            )
            return False
    
    def _create_ical_event(self, booking, event_uid):
        """
        Create iCalendar event data for Apple Calendar.
        
        Args:
            booking: Booking instance
            event_uid: Unique identifier for the event
        
        Returns:
            str: iCalendar formatted event data
        """
        # Format times in UTC for iCalendar
        start_utc = booking.start_time.strftime('%Y%m%dT%H%M%SZ')
        end_utc = booking.end_time.strftime('%Y%m%dT%H%M%SZ')
        created_utc = booking.created_at.strftime('%Y%m%dT%H%M%SZ')
        
        # Create iCalendar event
        ical_lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Calendly Clone//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'BEGIN:VEVENT',
            f'UID:{event_uid}',
            f'DTSTART:{start_utc}',
            f'DTEND:{end_utc}',
            f'DTSTAMP:{created_utc}',
            f'CREATED:{created_utc}',
            f'SUMMARY:{booking.event_type.name} with {booking.invitee_name}',
            f'DESCRIPTION:Booking created via Calendly Clone\\n\\nInvitee: {booking.invitee_name} ({booking.invitee_email})\\nEvent Type: {booking.event_type.name}',
            f'ORGANIZER;CN={self.organizer.first_name} {self.organizer.last_name}:mailto:{self.organizer.email}',
            f'ATTENDEE;CN={booking.invitee_name};RSVP=TRUE:mailto:{booking.invitee_email}',
            'STATUS:CONFIRMED',
            'TRANSP:OPAQUE',
            'SEQUENCE:0'
        ]
        
        # Add meeting link if available
        if booking.meeting_link:
            ical_lines.append(f'DESCRIPTION:Booking created via Calendly Clone\\n\\nInvitee: {booking.invitee_name} ({booking.invitee_email})\\nEvent Type: {booking.event_type.name}\\n\\nMeeting Link: {booking.meeting_link}')
        
        # Add location if specified
        if booking.event_type.location_details:
            ical_lines.append(f'LOCATION:{booking.event_type.location_details}')
        
        ical_lines.extend([
            'END:VEVENT',
            'END:VCALENDAR'
        ])
        
        return '\r\n'.join(ical_lines)
    
    def _parse_caldav_events_response(self, xml_content):
        """
        Parse CalDAV REPORT response and extract events.
        
        Args:
            xml_content: XML response from CalDAV server
        
        Returns:
            list: List of parsed events
        """
        events = []
        
        try:
            # Parse XML response
            root = ET.fromstring(xml_content)
            
            # Define namespaces
            namespaces = {
                'D': 'DAV:',
                'C': 'urn:ietf:params:xml:ns:caldav'
            }
            
            # Find all response elements
            responses = root.findall('.//D:response', namespaces)
            
            for response in responses:
                try:
                    # Get calendar data
                    calendar_data_elem = response.find('.//C:calendar-data', namespaces)
                    if calendar_data_elem is None or not calendar_data_elem.text:
                        continue
                    
                    # Parse iCalendar data
                    ical_data = calendar_data_elem.text
                    event = self._parse_ical_event(ical_data)
                    
                    if event:
                        events.append(event)
                        
                except Exception as e:
                    logger.warning(f"Error parsing individual CalDAV event: {str(e)}")
                    continue
            
            return events
            
        except Exception as e:
            logger.error(f"Error parsing CalDAV response: {str(e)}")
            return []
    
    def _parse_ical_event(self, ical_data):
        """
        Parse iCalendar event data.
        
        Args:
            ical_data: iCalendar formatted event data
        
        Returns:
            dict: Parsed event data or None if invalid
        """
        try:
            lines = ical_data.strip().split('\n')
            event_data = {}
            in_event = False
            
            for line in lines:
                line = line.strip()
                
                if line == 'BEGIN:VEVENT':
                    in_event = True
                    continue
                elif line == 'END:VEVENT':
                    break
                elif not in_event:
                    continue
                
                # Parse property lines
                if ':' in line:
                    prop, value = line.split(':', 1)
                    
                    # Handle properties with parameters (e.g., DTSTART;TZID=...)
                    if ';' in prop:
                        prop = prop.split(';')[0]
                    
                    event_data[prop] = value
            
            # Extract required fields
            if 'UID' not in event_data or 'DTSTART' not in event_data or 'DTEND' not in event_data:
                return None
            
            # Parse datetime fields
            start_datetime = self._parse_ical_datetime(event_data['DTSTART'])
            end_datetime = self._parse_ical_datetime(event_data['DTEND'])
            
            if not start_datetime or not end_datetime:
                return None
            
            # Check if event is cancelled or transparent (free time)
            status = event_data.get('STATUS', 'CONFIRMED')
            transp = event_data.get('TRANSP', 'OPAQUE')
            
            if status == 'CANCELLED' or transp == 'TRANSPARENT':
                return None
            
            return {
                'external_id': event_data['UID'],
                'summary': event_data.get('SUMMARY', 'Busy'),
                'start_datetime': start_datetime,
                'end_datetime': end_datetime,
                'updated': timezone.now(),  # CalDAV doesn't always provide last-modified
                'status': 'confirmed',
                'transparency': 'opaque'
            }
            
        except Exception as e:
            logger.warning(f"Error parsing iCalendar event: {str(e)}")
            return None
    
    def _parse_ical_datetime(self, dt_string):
        """
        Parse iCalendar datetime string.
        
        Args:
            dt_string: iCalendar datetime string
        
        Returns:
            datetime: Parsed datetime object in UTC
        """
        try:
            # Handle different iCalendar datetime formats
            if dt_string.endswith('Z'):
                # UTC time
                return datetime.strptime(dt_string, '%Y%m%dT%H%M%SZ').replace(tzinfo=timezone.utc)
            elif 'T' in dt_string:
                # Local time (assume organizer's timezone)
                dt = datetime.strptime(dt_string, '%Y%m%dT%H%M%S')
                # Convert to UTC using organizer's timezone
                from zoneinfo import ZoneInfo
                org_tz = ZoneInfo(self.organizer.profile.timezone_name)
                local_dt = dt.replace(tzinfo=org_tz)
                return local_dt.astimezone(timezone.utc)
            else:
                # Date only (all-day event)
                date_obj = datetime.strptime(dt_string, '%Y%m%d').date()
                return datetime.combine(date_obj, datetime.min.time()).replace(tzinfo=timezone.utc)
                
        except Exception as e:
            logger.warning(f"Error parsing iCalendar datetime '{dt_string}': {str(e)}")
            return None
    
    def test_connection(self):
        """
        Test the CalDAV connection to Apple Calendar.
        
        Returns:
            dict: Connection test results
        """
        try:
            # Try to access the calendar home
            response = self._make_caldav_request('PROPFIND', self.calendar_home_url)
            
            if response['status_code'] in [200, 207]:  # 207 is Multi-Status for WebDAV
                return {
                    'success': True,
                    'message': 'Successfully connected to Apple Calendar',
                    'status_code': response['status_code']
                }
            else:
                return {
                    'success': False,
                    'message': f'Connection failed with status {response["status_code"]}',
                    'status_code': response['status_code']
                }
                
        except Exception as e:
            return {
                'success': False,
                'message': f'Connection test failed: {str(e)}',
                'error': str(e)
            }