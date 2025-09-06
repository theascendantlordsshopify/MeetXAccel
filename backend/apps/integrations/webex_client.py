"""
Cisco Webex integration client for video conferencing.

Note: This implementation uses only Python standard library modules
and provides basic Webex API functionality for meetings.
"""
import logging
import json
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from .utils import log_integration_activity

logger = logging.getLogger(__name__)


class WebexClient:
    """
    Client for Cisco Webex integration via Webex API.
    
    Note: This is a basic implementation using standard library only.
    For production use, consider using the Webex Teams SDK.
    """
    
    def __init__(self, integration):
        """
        Initialize Webex client.
        
        Args:
            integration: VideoConferenceIntegration instance
        """
        self.integration = integration
        self.organizer = integration.organizer
        self.base_url = "https://webexapis.com/v1"
    
    def _get_headers(self):
        """Get authenticated headers for Webex API."""
        if not self.integration.access_token:
            raise Exception("No access token available for Webex")
        
        return {
            'Authorization': f'Bearer {self.integration.access_token}',
            'Content-Type': 'application/json',
            'User-Agent': 'Calendly-Clone/1.0'
        }
    
    def _make_webex_request(self, method, endpoint, data=None):
        """Make a Webex API request using standard library."""
        try:
            url = f"{self.base_url}{endpoint}"
            headers = self._get_headers()
            
            if data and isinstance(data, dict):
                data = json.dumps(data).encode('utf-8')
            elif data and isinstance(data, str):
                data = data.encode('utf-8')
            
            request = Request(url, data=data, headers=headers, method=method)
            
            with urlopen(request, timeout=30) as response:
                response_data = response.read().decode('utf-8')
                return {
                    'status_code': response.status,
                    'data': json.loads(response_data) if response_data else {},
                    'headers': dict(response.headers)
                }
                
        except HTTPError as e:
            error_content = e.read().decode('utf-8') if hasattr(e, 'read') else str(e)
            try:
                error_data = json.loads(error_content)
                error_message = error_data.get('message', error_content)
            except:
                error_message = error_content
            
            raise Exception(f"Webex API error {e.code}: {error_message}")
        except URLError as e:
            raise Exception(f"Webex API connection error: {str(e)}")
        except Exception as e:
            raise Exception(f"Webex API request failed: {str(e)}")
    
    def create_meeting(self, booking):
        """
        Create a Webex meeting.
        
        Args:
            booking: Booking instance
        
        Returns:
            dict: Meeting details (link, id, password, etc.)
        """
        try:
            # Check rate limits
            if not self.integration.can_make_api_call():
                raise Exception("Daily API rate limit exceeded for Webex")
            
            # Prepare meeting data
            meeting_data = {
                'title': f"{booking.event_type.name} with {booking.invitee_name}",
                'start': booking.start_time.isoformat(),
                'end': booking.end_time.isoformat(),
                'timezone': self.organizer.profile.timezone_name,
                'agenda': f"Meeting with {booking.invitee_name} ({booking.invitee_email})",
                'enabledAutoRecordMeeting': False,
                'allowAnyUserToBeCoHost': False,
                'enabledJoinBeforeHost': False,
                'joinBeforeHostMinutes': 0,
                'enableConnectAudioBeforeHost': False,
                'excludePassword': False,
                'publicMeeting': False,
                'reminderTime': 15,
                'unlockedMeetingJoinSecurity': 'allowJoinWithLobby',
                'sessionTypeId': 1,  # Meeting type
                'invitees': [
                    {
                        'email': booking.invitee_email,
                        'displayName': booking.invitee_name,
                        'coHost': False
                    }
                ]
            }
            
            # Create the meeting
            response = self._make_webex_request(
                'POST',
                '/meetings',
                data=meeting_data
            )
            
            # Record API call
            self.integration.record_api_call()
            
            if response['status_code'] == 200:
                meeting_response = response['data']
                
                meeting_details = {
                    'meeting_link': meeting_response.get('webLink', ''),
                    'meeting_id': str(meeting_response.get('id', '')),
                    'meeting_password': meeting_response.get('password', ''),
                    'external_meeting_id': str(meeting_response.get('id', '')),
                    'sip_address': meeting_response.get('sipAddress', ''),
                    'meeting_number': meeting_response.get('meetingNumber', ''),
                    'host_key': meeting_response.get('hostKey', '')
                }
                
                log_integration_activity(
                    organizer=self.organizer,
                    log_type='video_link_created',
                    integration_type='webex',
                    message=f"Created Webex meeting for booking {booking.id}",
                    success=True,
                    booking=booking,
                    details=meeting_details
                )
                
                return meeting_details
            else:
                raise Exception(f"Unexpected response status: {response['status_code']}")
            
        except Exception as e:
            logger.error(f"Error creating Webex meeting: {str(e)}")
            log_integration_activity(
                organizer=self.organizer,
                log_type='video_link_created',
                integration_type='webex',
                message=f"Failed to create Webex meeting: {str(e)}",
                success=False,
                booking=booking,
                details={'error': str(e)}
            )
            raise
    
    def update_meeting(self, booking, external_meeting_id):
        """
        Update a Webex meeting.
        
        Args:
            booking: Booking instance
            external_meeting_id: Webex meeting ID
        
        Returns:
            bool: True if successful
        """
        try:
            # Prepare update data
            update_data = {
                'title': f"{booking.event_type.name} with {booking.invitee_name}",
                'start': booking.start_time.isoformat(),
                'end': booking.end_time.isoformat(),
                'timezone': self.organizer.profile.timezone_name
            }
            
            # Update the meeting
            response = self._make_webex_request(
                'PUT',
                f'/meetings/{external_meeting_id}',
                data=update_data
            )
            
            self.integration.record_api_call()
            
            if response['status_code'] == 200:
                log_integration_activity(
                    organizer=self.organizer,
                    log_type='video_meeting_updated',
                    integration_type='webex',
                    message=f"Updated Webex meeting for booking {booking.id}",
                    success=True,
                    booking=booking
                )
                return True
            else:
                raise Exception(f"Unexpected response status: {response['status_code']}")
            
        except Exception as e:
            logger.error(f"Error updating Webex meeting: {str(e)}")
            log_integration_activity(
                organizer=self.organizer,
                log_type='video_meeting_updated',
                integration_type='webex',
                message=f"Failed to update Webex meeting: {str(e)}",
                success=False,
                booking=booking,
                details={'error': str(e)}
            )
            return False
    
    def delete_meeting(self, external_meeting_id):
        """
        Delete a Webex meeting.
        
        Args:
            external_meeting_id: Webex meeting ID
        
        Returns:
            bool: True if successful
        """
        try:
            response = self._make_webex_request(
                'DELETE',
                f'/meetings/{external_meeting_id}'
            )
            
            self.integration.record_api_call()
            
            if response['status_code'] in [200, 204, 404]:
                # 404 means already deleted, which is fine
                log_integration_activity(
                    organizer=self.organizer,
                    log_type='video_meeting_deleted',
                    integration_type='webex',
                    message=f"Deleted Webex meeting {external_meeting_id}",
                    success=True,
                    details={'external_meeting_id': external_meeting_id}
                )
                return True
            else:
                raise Exception(f"Unexpected response status: {response['status_code']}")
            
        except Exception as e:
            # If meeting doesn't exist, consider it successful
            if '404' in str(e) or 'not found' in str(e).lower():
                logger.info(f"Webex meeting {external_meeting_id} already deleted")
                return True
            
            logger.error(f"Error deleting Webex meeting: {str(e)}")
            log_integration_activity(
                organizer=self.organizer,
                log_type='video_meeting_deleted',
                integration_type='webex',
                message=f"Failed to delete Webex meeting: {str(e)}",
                success=False,
                details={'error': str(e), 'external_meeting_id': external_meeting_id}
            )
            return False
    
    def test_connection(self):
        """
        Test the connection to Webex.
        
        Returns:
            dict: Connection test results
        """
        try:
            # Test by getting user profile
            response = self._make_webex_request('GET', '/people/me')
            
            if response['status_code'] == 200:
                user_data = response['data']
                return {
                    'success': True,
                    'message': 'Successfully connected to Webex',
                    'user_email': user_data.get('emails', [{}])[0].get('value', ''),
                    'display_name': user_data.get('displayName', '')
                }
            else:
                return {
                    'success': False,
                    'message': f'Connection test failed with status {response["status_code"]}',
                    'status_code': response['status_code']
                }
                
        except Exception as e:
            return {
                'success': False,
                'message': f'Connection test failed: {str(e)}',
                'error': str(e)
            }