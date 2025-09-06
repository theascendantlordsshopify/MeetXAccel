"""
Microsoft Teams integration client for video conferencing.

Note: This implementation uses only Python standard library modules
and provides basic Microsoft Graph API functionality for Teams meetings.
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


class MicrosoftTeamsClient:
    """
    Client for Microsoft Teams integration via Microsoft Graph API.
    
    Note: This is a basic implementation using standard library only.
    For production use, consider using the Microsoft Graph SDK.
    """
    
    def __init__(self, integration):
        """
        Initialize Microsoft Teams client.
        
        Args:
            integration: VideoConferenceIntegration instance
        """
        self.integration = integration
        self.organizer = integration.organizer
        self.base_url = "https://graph.microsoft.com/v1.0"
    
    def _get_headers(self):
        """Get authenticated headers for Microsoft Graph API."""
        if not self.integration.access_token:
            raise Exception("No access token available for Microsoft Teams")
        
        return {
            'Authorization': f'Bearer {self.integration.access_token}',
            'Content-Type': 'application/json',
            'User-Agent': 'Calendly-Clone/1.0'
        }
    
    def _make_graph_request(self, method, endpoint, data=None):
        """Make a Microsoft Graph API request using standard library."""
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
                error_message = error_data.get('error', {}).get('message', error_content)
            except:
                error_message = error_content
            
            raise Exception(f"Microsoft Graph API error {e.code}: {error_message}")
        except URLError as e:
            raise Exception(f"Microsoft Graph API connection error: {str(e)}")
        except Exception as e:
            raise Exception(f"Microsoft Graph API request failed: {str(e)}")
    
    def create_meeting(self, booking):
        """
        Create a Microsoft Teams meeting.
        
        Args:
            booking: Booking instance
        
        Returns:
            dict: Meeting details (link, id, etc.)
        """
        try:
            # Check rate limits
            if not self.integration.can_make_api_call():
                raise Exception("Daily API rate limit exceeded for Microsoft Teams")
            
            # Prepare meeting data for Microsoft Graph
            meeting_data = {
                'subject': f"{booking.event_type.name} with {booking.invitee_name}",
                'startTime': booking.start_time.isoformat(),
                'endTime': booking.end_time.isoformat(),
                'participants': {
                    'organizer': {
                        'identity': {
                            'user': {
                                'id': self.integration.provider_user_id,
                                'displayName': f"{self.organizer.first_name} {self.organizer.last_name}",
                                'userPrincipalName': self.organizer.email
                            }
                        }
                    },
                    'attendees': [
                        {
                            'identity': {
                                'user': {
                                    'displayName': booking.invitee_name,
                                    'userPrincipalName': booking.invitee_email
                                }
                            },
                            'role': 'attendee'
                        }
                    ]
                }
            }
            
            # Create the online meeting
            response = self._make_graph_request(
                'POST',
                '/me/onlineMeetings',
                data=meeting_data
            )
            
            # Record API call
            self.integration.record_api_call()
            
            if response['status_code'] == 201:
                meeting_response = response['data']
                
                meeting_details = {
                    'meeting_link': meeting_response.get('joinWebUrl', ''),
                    'meeting_id': meeting_response.get('id', ''),
                    'meeting_password': '',  # Teams doesn't use passwords like Zoom
                    'external_meeting_id': meeting_response.get('id', ''),
                    'dial_in_numbers': meeting_response.get('audioConferencing', {}).get('dialinUrl', ''),
                    'conference_id': meeting_response.get('audioConferencing', {}).get('conferenceId', '')
                }
                
                log_integration_activity(
                    organizer=self.organizer,
                    log_type='video_link_created',
                    integration_type='microsoft_teams',
                    message=f"Created Microsoft Teams meeting for booking {booking.id}",
                    success=True,
                    booking=booking,
                    details=meeting_details
                )
                
                return meeting_details
            else:
                raise Exception(f"Unexpected response status: {response['status_code']}")
            
        except Exception as e:
            logger.error(f"Error creating Microsoft Teams meeting: {str(e)}")
            log_integration_activity(
                organizer=self.organizer,
                log_type='video_link_created',
                integration_type='microsoft_teams',
                message=f"Failed to create Teams meeting: {str(e)}",
                success=False,
                booking=booking,
                details={'error': str(e)}
            )
            raise
    
    def update_meeting(self, booking, external_meeting_id):
        """
        Update a Microsoft Teams meeting.
        
        Args:
            booking: Booking instance
            external_meeting_id: Teams meeting ID
        
        Returns:
            bool: True if successful
        """
        try:
            # Prepare update data
            update_data = {
                'subject': f"{booking.event_type.name} with {booking.invitee_name}",
                'startTime': booking.start_time.isoformat(),
                'endTime': booking.end_time.isoformat()
            }
            
            # Update the meeting
            response = self._make_graph_request(
                'PATCH',
                f'/me/onlineMeetings/{external_meeting_id}',
                data=update_data
            )
            
            self.integration.record_api_call()
            
            if response['status_code'] == 200:
                log_integration_activity(
                    organizer=self.organizer,
                    log_type='video_meeting_updated',
                    integration_type='microsoft_teams',
                    message=f"Updated Microsoft Teams meeting for booking {booking.id}",
                    success=True,
                    booking=booking
                )
                return True
            else:
                raise Exception(f"Unexpected response status: {response['status_code']}")
            
        except Exception as e:
            logger.error(f"Error updating Microsoft Teams meeting: {str(e)}")
            log_integration_activity(
                organizer=self.organizer,
                log_type='video_meeting_updated',
                integration_type='microsoft_teams',
                message=f"Failed to update Teams meeting: {str(e)}",
                success=False,
                booking=booking,
                details={'error': str(e)}
            )
            return False
    
    def delete_meeting(self, external_meeting_id):
        """
        Delete a Microsoft Teams meeting.
        
        Args:
            external_meeting_id: Teams meeting ID
        
        Returns:
            bool: True if successful
        """
        try:
            response = self._make_graph_request(
                'DELETE',
                f'/me/onlineMeetings/{external_meeting_id}'
            )
            
            self.integration.record_api_call()
            
            if response['status_code'] in [200, 204, 404]:
                # 404 means already deleted, which is fine
                log_integration_activity(
                    organizer=self.organizer,
                    log_type='video_meeting_deleted',
                    integration_type='microsoft_teams',
                    message=f"Deleted Microsoft Teams meeting {external_meeting_id}",
                    success=True,
                    details={'external_meeting_id': external_meeting_id}
                )
                return True
            else:
                raise Exception(f"Unexpected response status: {response['status_code']}")
            
        except Exception as e:
            # If meeting doesn't exist, consider it successful
            if '404' in str(e) or 'not found' in str(e).lower():
                logger.info(f"Microsoft Teams meeting {external_meeting_id} already deleted")
                return True
            
            logger.error(f"Error deleting Microsoft Teams meeting: {str(e)}")
            log_integration_activity(
                organizer=self.organizer,
                log_type='video_meeting_deleted',
                integration_type='microsoft_teams',
                message=f"Failed to delete Teams meeting: {str(e)}",
                success=False,
                details={'error': str(e), 'external_meeting_id': external_meeting_id}
            )
            return False
    
    def test_connection(self):
        """
        Test the connection to Microsoft Teams.
        
        Returns:
            dict: Connection test results
        """
        try:
            # Test by getting user profile
            response = self._make_graph_request('GET', '/me')
            
            if response['status_code'] == 200:
                user_data = response['data']
                return {
                    'success': True,
                    'message': 'Successfully connected to Microsoft Teams',
                    'user_email': user_data.get('userPrincipalName', ''),
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