"""
Utility functions for external integrations with robust error handling and rate limiting.
"""
import logging
import time
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
from django.core.cache import cache
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import requests
from .models import IntegrationLog

logger = logging.getLogger(__name__)


class RateLimitError(Exception):
    """Custom exception for rate limit errors."""
    pass


class TokenExpiredError(Exception):
    """Custom exception for expired tokens."""
    pass


class IntegrationError(Exception):
    """Base exception for integration errors."""
    pass


def rate_limit_key(provider, organizer_id):
    """Generate rate limit cache key."""
    return f"rate_limit:{provider}:{organizer_id}"


def check_rate_limit(provider, organizer_id):
    """Check if we're within rate limits for a provider."""
    cache_key = rate_limit_key(provider, organizer_id)
    current_count = cache.get(cache_key, 0)
    
    # Rate limits per minute (conservative estimates)
    limits = {
        'google': getattr(settings, 'INTEGRATION_RATE_LIMIT_GOOGLE', 100),
        'outlook': getattr(settings, 'INTEGRATION_RATE_LIMIT_MICROSOFT', 60),
        'zoom': getattr(settings, 'INTEGRATION_RATE_LIMIT_ZOOM', 80),
    }
    
    limit = limits.get(provider, 50)
    
    if current_count >= limit:
        raise RateLimitError(f"Rate limit exceeded for {provider}: {current_count}/{limit}")
    
    return True


def record_api_call(provider, organizer_id):
    """Record an API call for rate limiting."""
    cache_key = rate_limit_key(provider, organizer_id)
    current_count = cache.get(cache_key, 0)
    cache.set(cache_key, current_count + 1, timeout=60)  # 1 minute window


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10),
    retry=retry_if_exception_type((RateLimitError, requests.exceptions.RequestException))
)
def make_api_request(method, url, headers=None, json_data=None, params=None, provider=None, organizer_id=None):
    """
    Make an API request with automatic retry and rate limiting.
    
    Args:
        method: HTTP method (GET, POST, PUT, DELETE)
        url: API endpoint URL
        headers: Request headers
        json_data: JSON payload for POST/PUT requests
        params: Query parameters
        provider: Provider name for rate limiting
        organizer_id: Organizer ID for rate limiting
    
    Returns:
        requests.Response object
    
    Raises:
        RateLimitError: If rate limit is exceeded
        TokenExpiredError: If token is expired
        IntegrationError: For other API errors
    """
    if provider and organizer_id:
        check_rate_limit(provider, organizer_id)
    
    try:
        response = requests.request(
            method=method,
            url=url,
            headers=headers,
            json=json_data,
            params=params,
            timeout=30
        )
        
        # Record successful API call for rate limiting
        if provider and organizer_id:
            record_api_call(provider, organizer_id)
        
        # Handle common HTTP error codes
        if response.status_code == 401:
            raise TokenExpiredError("Access token expired or invalid")
        elif response.status_code == 403:
            raise IntegrationError("Insufficient permissions or quota exceeded")
        elif response.status_code == 429:
            # Extract retry-after header if available
            retry_after = response.headers.get('Retry-After', 60)
            raise RateLimitError(f"Rate limit exceeded. Retry after {retry_after} seconds")
        elif response.status_code >= 400:
            raise IntegrationError(f"API error: {response.status_code} - {response.text}")
        
        return response
        
    except requests.exceptions.Timeout:
        raise IntegrationError("API request timeout")
    except requests.exceptions.ConnectionError:
        raise IntegrationError("API connection error")


def refresh_access_token(integration):
    """
    Refresh access token for an integration.
    
    Args:
        integration: CalendarIntegration or VideoConferenceIntegration instance
    
    Returns:
        bool: True if refresh successful, False otherwise
    """
    if not integration.refresh_token:
        logger.error(f"No refresh token available for {integration.provider} integration")
        return False
    
    try:
        if integration.provider == 'google':
            return _refresh_google_token(integration)
        elif integration.provider == 'outlook':
            return _refresh_microsoft_token(integration)
        elif integration.provider == 'zoom':
            return _refresh_zoom_token(integration)
        elif integration.provider == 'apple':
            return _refresh_apple_token(integration)
        elif integration.provider == 'microsoft_teams':
            return _refresh_microsoft_token(integration)  # Uses same OAuth as Outlook
        elif integration.provider == 'webex':
            return _refresh_webex_token(integration)
        else:
            logger.error(f"Token refresh not implemented for provider: {integration.provider}")
            return False
            
    except Exception as e:
        logger.error(f"Error refreshing token for {integration.provider}: {str(e)}")
        return False


def _refresh_google_token(integration):
    """Refresh Google OAuth token."""
    token_url = "https://oauth2.googleapis.com/token"
    
    data = {
        'client_id': settings.GOOGLE_OAUTH_CLIENT_ID,
        'client_secret': settings.GOOGLE_OAUTH_CLIENT_SECRET,
        'refresh_token': integration.refresh_token,
        'grant_type': 'refresh_token'
    }
    
    response = make_api_request('POST', token_url, json_data=data)
    token_data = response.json()
    
    # Update integration with new token
    integration.access_token = token_data['access_token']
    integration.token_expires_at = timezone.now() + timedelta(seconds=token_data.get('expires_in', 3600))
    
    # Update refresh token if provided
    if 'refresh_token' in token_data:
        integration.refresh_token = token_data['refresh_token']
    
    integration.save(update_fields=['access_token', 'refresh_token', 'token_expires_at'])
    
    logger.info(f"Successfully refreshed Google token for {integration.organizer.email}")
    return True


def _refresh_microsoft_token(integration):
    """Refresh Microsoft OAuth token."""
    token_url = f"https://login.microsoftonline.com/{settings.MICROSOFT_TENANT_ID}/oauth2/v2.0/token"
    
    data = {
        'client_id': settings.MICROSOFT_CLIENT_ID,
        'client_secret': settings.MICROSOFT_CLIENT_SECRET,
        'refresh_token': integration.refresh_token,
        'grant_type': 'refresh_token',
        'scope': 'https://graph.microsoft.com/calendars.readwrite offline_access'
    }
    
    response = make_api_request('POST', token_url, json_data=data)
    token_data = response.json()
    
    # Update integration with new token
    integration.access_token = token_data['access_token']
    integration.token_expires_at = timezone.now() + timedelta(seconds=token_data.get('expires_in', 3600))
    
    if 'refresh_token' in token_data:
        integration.refresh_token = token_data['refresh_token']
    
    integration.save(update_fields=['access_token', 'refresh_token', 'token_expires_at'])
    
    logger.info(f"Successfully refreshed Microsoft token for {integration.organizer.email}")
    return True


def _refresh_zoom_token(integration):
    """Refresh Zoom OAuth token."""
    token_url = "https://zoom.us/oauth/token"
    
    data = {
        'grant_type': 'refresh_token',
        'refresh_token': integration.refresh_token
    }
    
    auth = (settings.ZOOM_CLIENT_ID, settings.ZOOM_CLIENT_SECRET)
    
    response = requests.post(token_url, data=data, auth=auth, timeout=30)
    
    if response.status_code != 200:
        raise IntegrationError(f"Zoom token refresh failed: {response.text}")
    
    token_data = response.json()
    
    # Update integration with new token
    integration.access_token = token_data['access_token']
    integration.token_expires_at = timezone.now() + timedelta(seconds=token_data.get('expires_in', 3600))
    
    if 'refresh_token' in token_data:
        integration.refresh_token = token_data['refresh_token']
    
    integration.save(update_fields=['access_token', 'refresh_token', 'token_expires_at'])
    
    logger.info(f"Successfully refreshed Zoom token for {integration.organizer.email}")
    return True


def _refresh_apple_token(integration):
    """
    Refresh Apple Calendar token.
    
    Note: Apple Calendar typically uses app-specific passwords or
    Sign in with Apple OAuth. This is a simplified implementation.
    """
    # Apple Calendar integration often uses app-specific passwords
    # which don't expire in the traditional OAuth sense.
    # For a full implementation, you would need to handle
    # Sign in with Apple OAuth refresh flow.
    
    logger.info(f"Apple Calendar token refresh not required for {integration.organizer.email}")
    return True  # App-specific passwords don't typically expire


def _refresh_webex_token(integration):
    """Refresh Webex OAuth token."""
    token_url = "https://webexapis.com/v1/access_token"
    
    data = {
        'grant_type': 'refresh_token',
        'client_id': settings.WEBEX_CLIENT_ID,
        'client_secret': settings.WEBEX_CLIENT_SECRET,
        'refresh_token': integration.refresh_token
    }
    
    response = make_api_request('POST', token_url, json_data=data)
    token_data = response.json()
    
    # Update integration with new token
    integration.access_token = token_data['access_token']
    integration.token_expires_at = timezone.now() + timedelta(seconds=token_data.get('expires_in', 3600))
    
    if 'refresh_token' in token_data:
        integration.refresh_token = token_data['refresh_token']
    
    integration.save(update_fields=['access_token', 'refresh_token', 'token_expires_at'])
    
    logger.info(f"Successfully refreshed Webex token for {integration.organizer.email}")
    return True


def ensure_valid_token(integration):
    """
    Ensure integration has a valid access token, refreshing if necessary.
    
    Args:
        integration: CalendarIntegration or VideoConferenceIntegration instance
    
    Returns:
        bool: True if token is valid, False if refresh failed
    """
    if not integration.is_token_expired:
        return True
    
    logger.info(f"Token expired for {integration.provider} integration, attempting refresh")
    return refresh_access_token(integration)


def log_integration_activity(organizer, log_type, integration_type, message, success=True, 
                           booking=None, details=None):
    """
    Log integration activity for monitoring and debugging.
    
    Args:
        organizer: User instance
        log_type: Type of log entry
        integration_type: Provider type (google, outlook, zoom, etc.)
        message: Log message
        success: Whether the operation was successful
        booking: Related booking (optional)
        details: Additional details (optional)
    """
    IntegrationLog.objects.create(
        organizer=organizer,
        log_type=log_type,
        integration_type=integration_type,
        booking=booking,
        message=message,
        details=details or {},
        success=success
    )


def parse_google_calendar_event(event_data):
    """
    Parse Google Calendar event data into our format.
    
    Args:
        event_data: Event data from Google Calendar API
    
    Returns:
        dict: Parsed event data
    """
    # Handle different date/time formats
    start = event_data.get('start', {})
    end = event_data.get('end', {})
    
    # All-day events
    if 'date' in start:
        start_datetime = datetime.strptime(start['date'], '%Y-%m-%d').replace(tzinfo=timezone.utc)
        end_datetime = datetime.strptime(end['date'], '%Y-%m-%d').replace(tzinfo=timezone.utc)
    else:
        # Timed events
        start_datetime = datetime.fromisoformat(start['dateTime'].replace('Z', '+00:00'))
        end_datetime = datetime.fromisoformat(end['dateTime'].replace('Z', '+00:00'))
    
    return {
        'external_id': event_data['id'],
        'summary': event_data.get('summary', 'Busy'),
        'start_datetime': start_datetime,
        'end_datetime': end_datetime,
        'updated': datetime.fromisoformat(event_data['updated'].replace('Z', '+00:00')),
        'status': event_data.get('status', 'confirmed'),
        'transparency': event_data.get('transparency', 'opaque'),  # opaque = busy, transparent = free
    }


def parse_outlook_calendar_event(event_data):
    """
    Parse Outlook Calendar event data into our format.
    
    Args:
        event_data: Event data from Microsoft Graph API
    
    Returns:
        dict: Parsed event data
    """
    start = event_data.get('start', {})
    end = event_data.get('end', {})
    
    # Parse datetime with timezone
    start_datetime = datetime.fromisoformat(start['dateTime'])
    end_datetime = datetime.fromisoformat(end['dateTime'])
    
    # Convert to UTC if needed
    if start_datetime.tzinfo is None:
        start_datetime = start_datetime.replace(tzinfo=timezone.utc)
    if end_datetime.tzinfo is None:
        end_datetime = end_datetime.replace(tzinfo=timezone.utc)
    
    return {
        'external_id': event_data['id'],
        'summary': event_data.get('subject', 'Busy'),
        'start_datetime': start_datetime.astimezone(timezone.utc),
        'end_datetime': end_datetime.astimezone(timezone.utc),
        'updated': datetime.fromisoformat(event_data['lastModifiedDateTime']),
        'status': 'confirmed' if not event_data.get('isCancelled', False) else 'cancelled',
        'transparency': 'opaque' if event_data.get('showAs') != 'free' else 'transparent',
    }


def parse_apple_calendar_event(ical_data):
    """
    Parse Apple Calendar event data (iCalendar format) into our format.
    
    Args:
        ical_data: iCalendar formatted event data
    
    Returns:
        dict: Parsed event data
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
        start_datetime = _parse_ical_datetime(event_data['DTSTART'])
        end_datetime = _parse_ical_datetime(event_data['DTEND'])
        
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
            'updated': timezone.now(),  # iCalendar may not always provide LAST-MODIFIED
            'status': 'confirmed',
            'transparency': 'opaque' if transp != 'TRANSPARENT' else 'transparent'
        }
        
    except Exception as e:
        logger.warning(f"Error parsing Apple Calendar event: {str(e)}")
        return None


def _parse_ical_datetime(dt_string):
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
            # Local time (assume UTC for simplicity)
            dt = datetime.strptime(dt_string, '%Y%m%dT%H%M%S')
            return dt.replace(tzinfo=timezone.utc)
        else:
            # Date only (all-day event)
            date_obj = datetime.strptime(dt_string, '%Y%m%d').date()
            return datetime.combine(date_obj, datetime.min.time()).replace(tzinfo=timezone.utc)
            
    except Exception as e:
        logger.warning(f"Error parsing iCalendar datetime '{dt_string}': {str(e)}")
        return None


def validate_webhook_signature(payload, signature, secret):
    """
    Validate webhook signature for security.
    
    Args:
        payload: Raw webhook payload (bytes)
        signature: Signature from webhook headers (string)
        secret: Webhook secret key (string)
    
    Returns:
        bool: True if signature is valid
    """
    import hmac
    import hashlib
    
    if not secret or not signature:
        logger.warning("Webhook signature validation failed: missing secret or signature")
        return False
    
    try:
        # Ensure payload is bytes
        if isinstance(payload, str):
            payload = payload.encode('utf-8')
        
        # Handle different signature formats
        if signature.startswith('sha256='):
            # GitHub/Stripe style: "sha256=<hex_digest>"
            provided_signature = signature[7:]  # Remove 'sha256=' prefix
            hash_function = hashlib.sha256
        elif signature.startswith('sha1='):
            # Legacy style: "sha1=<hex_digest>"
            provided_signature = signature[5:]  # Remove 'sha1=' prefix
            hash_function = hashlib.sha1
        else:
            # Assume raw hex digest (no prefix)
            provided_signature = signature
            hash_function = hashlib.sha256
        
        # Calculate expected signature
        expected_signature = hmac.new(
            secret.encode('utf-8'),
            payload,
            hash_function
        ).hexdigest()
        
        # Compare signatures securely (constant-time comparison)
        is_valid = hmac.compare_digest(expected_signature, provided_signature)
        
        if not is_valid:
            logger.warning(f"Webhook signature validation failed: expected {expected_signature}, got {provided_signature}")
        
        return is_valid
        
    except Exception as e:
        logger.error(f"Error validating webhook signature: {str(e)}")
        return False


def validate_webhook_signature_multiple_formats(payload, signature_header, secret):
    """
    Validate webhook signature supporting multiple common formats.
    
    Args:
        payload: Raw webhook payload (bytes or string)
        signature_header: Full signature header value
        secret: Webhook secret key
    
    Returns:
        dict: Validation result with details
    """
    if not secret or not signature_header:
        return {
            'valid': False,
            'error': 'Missing secret or signature header',
            'format_detected': None
        }
    
    # Common webhook signature formats
    signature_formats = [
        {
            'name': 'github',
            'pattern': r'^sha256=([a-f0-9]{64})$',
            'hash_function': hashlib.sha256,
            'prefix': 'sha256='
        },
        {
            'name': 'stripe',
            'pattern': r'^v1,t=\d+,v1=([a-f0-9]{64})$',
            'hash_function': hashlib.sha256,
            'extract_signature': lambda s: s.split('v1=')[1] if 'v1=' in s else None
        },
        {
            'name': 'slack',
            'pattern': r'^v0=([a-f0-9]{64})$',
            'hash_function': hashlib.sha256,
            'prefix': 'v0='
        },
        {
            'name': 'generic_sha256',
            'pattern': r'^([a-f0-9]{64})$',
            'hash_function': hashlib.sha256,
            'prefix': ''
        },
        {
            'name': 'generic_sha1',
            'pattern': r'^sha1=([a-f0-9]{40})$',
            'hash_function': hashlib.sha1,
            'prefix': 'sha1='
        }
    ]
    
    try:
        # Ensure payload is bytes
        if isinstance(payload, str):
            payload = payload.encode('utf-8')
        
        for format_config in signature_formats:
            import re
            match = re.match(format_config['pattern'], signature_header)
            
            if match:
                # Extract signature based on format
                if 'extract_signature' in format_config:
                    provided_signature = format_config['extract_signature'](signature_header)
                    if not provided_signature:
                        continue
                elif format_config['prefix']:
                    provided_signature = signature_header[len(format_config['prefix']):]
                else:
                    provided_signature = match.group(1)
                
                # Calculate expected signature
                expected_signature = hmac.new(
                    secret.encode('utf-8'),
                    payload,
                    format_config['hash_function']
                ).hexdigest()
                
                # Compare signatures securely
                is_valid = hmac.compare_digest(expected_signature, provided_signature)
                
                return {
                    'valid': is_valid,
                    'format_detected': format_config['name'],
                    'error': None if is_valid else 'Signature mismatch'
                }
        
        return {
            'valid': False,
            'error': 'Unrecognized signature format',
            'format_detected': None
        }
        
    except Exception as e:
        logger.error(f"Error validating webhook signature: {str(e)}")
        return {
            'valid': False,
            'error': f'Validation error: {str(e)}',
            'format_detected': None
        }
    


def get_provider_scopes(provider, integration_type):
    """
    Get required OAuth scopes for a provider and integration type.
    
    Args:
        provider: Provider name (google, outlook, zoom)
        integration_type: Type of integration (calendar, video)
    
    Returns:
        list: Required OAuth scopes
    """
    scopes = {
        'google': {
            'calendar': [
                'https://www.googleapis.com/auth/calendar',
                'https://www.googleapis.com/auth/calendar.events'
            ],
            'video': [
                'https://www.googleapis.com/auth/calendar',
                'https://www.googleapis.com/auth/calendar.events'
            ]
        },
        'outlook': {
            'calendar': [
                'https://graph.microsoft.com/calendars.readwrite',
                'offline_access'
            ],
            'video': [
                'https://graph.microsoft.com/calendars.readwrite',
                'https://graph.microsoft.com/onlineMeetings.readwrite',
                'offline_access'
            ]
        },
        'zoom': {
            'video': [
                'meeting:write',
                'meeting:read'
            ]
        },
        'apple': {
            'calendar': [
                'calendar:read',
                'calendar:write'
            ]
        },
        'microsoft_teams': {
            'video': [
                'https://graph.microsoft.com/OnlineMeetings.ReadWrite',
                'https://graph.microsoft.com/User.Read',
                'offline_access'
            ]
        },
        'webex': {
            'video': [
                'spark:meetings_write',
                'spark:meetings_read'
            ]
        }
    }
    
    return scopes.get(provider, {}).get(integration_type, [])


def batch_process_items(items, batch_size=50, processor_func=None, *args, **kwargs):
    """
    Process items in batches to avoid overwhelming APIs.
    
    Args:
        items: List of items to process
        batch_size: Number of items per batch
        processor_func: Function to process each batch
        *args, **kwargs: Additional arguments for processor_func
    
    Returns:
        list: Results from each batch
    """
    results = []
    
    for i in range(0, len(items), batch_size):
        batch = items[i:i + batch_size]
        
        if processor_func:
            try:
                batch_result = processor_func(batch, *args, **kwargs)
                results.append(batch_result)
                
                # Small delay between batches to be respectful to APIs
                time.sleep(0.1)
                
            except Exception as e:
                logger.error(f"Error processing batch {i//batch_size + 1}: {str(e)}")
                results.append({'error': str(e), 'batch_index': i//batch_size + 1})
    
    return results


def detect_integration_conflicts(organizer, external_events, existing_blocked_times):
    """
    Detect conflicts between external calendar events and manual blocks.
    
    Args:
        organizer: User instance
        external_events: List of events from external calendar
        existing_blocked_times: QuerySet of existing BlockedTime objects
    
    Returns:
        dict: Conflict analysis results
    """
    conflicts = []
    overlaps = []
    
    for event in external_events:
        event_start = event['start_datetime']
        event_end = event['end_datetime']
        
        # Check for overlaps with manual blocks
        overlapping_blocks = existing_blocked_times.filter(
            source='manual',
            start_datetime__lt=event_end,
            end_datetime__gt=event_start
        )
        
        for block in overlapping_blocks:
            overlap_info = {
                'external_event': {
                    'id': event['external_id'],
                    'summary': event['summary'],
                    'start': event_start.isoformat(),
                    'end': event_end.isoformat()
                },
                'manual_block': {
                    'id': str(block.id),
                    'reason': block.reason,
                    'start': block.start_datetime.isoformat(),
                    'end': block.end_datetime.isoformat()
                },
                'overlap_type': _determine_overlap_type(
                    event_start, event_end,
                    block.start_datetime, block.end_datetime
                )
            }
            
            if overlap_info['overlap_type'] == 'complete_overlap':
                conflicts.append(overlap_info)
            else:
                overlaps.append(overlap_info)
    
    return {
        'conflicts': conflicts,
        'overlaps': overlaps,
        'total_external_events': len(external_events),
        'total_manual_blocks': existing_blocked_times.filter(source='manual').count()
    }


def _determine_overlap_type(start1, end1, start2, end2):
    """Determine the type of overlap between two time periods."""
    if start1 <= start2 and end1 >= end2:
        return 'complete_overlap'  # First period completely contains second
    elif start2 <= start1 and end2 >= end1:
        return 'contained_overlap'  # Second period completely contains first
    elif start1 < end2 and end1 > start2:
        return 'partial_overlap'  # Partial overlap
    else:
        return 'no_overlap'


def create_integration_health_report(organizer):
    """
    Create a health report for all integrations of an organizer.
    
    Args:
        organizer: User instance
    
    Returns:
        dict: Health report
    """
    from .models import CalendarIntegration, VideoConferenceIntegration
    
    report = {
        'organizer_id': str(organizer.id),
        'organizer_email': organizer.email,
        'timestamp': timezone.now().isoformat(),
        'calendar_integrations': [],
        'video_integrations': [],
        'overall_health': 'healthy'
    }
    
    # Check calendar integrations
    calendar_integrations = CalendarIntegration.objects.filter(organizer=organizer)
    for integration in calendar_integrations:
        health_status = {
            'provider': integration.provider,
            'is_active': integration.is_active,
            'sync_enabled': integration.sync_enabled,
            'token_expired': integration.is_token_expired,
            'last_sync': integration.last_sync_at.isoformat() if integration.last_sync_at else None,
            'sync_errors': integration.sync_errors,
            'health': 'healthy' if integration.is_active and not integration.is_token_expired and integration.sync_errors < 3 else 'unhealthy'
        }
        report['calendar_integrations'].append(health_status)
        
        if health_status['health'] == 'unhealthy':
            report['overall_health'] = 'degraded'
    
    # Check video integrations
    video_integrations = VideoConferenceIntegration.objects.filter(organizer=organizer)
    for integration in video_integrations:
        health_status = {
            'provider': integration.provider,
            'is_active': integration.is_active,
            'auto_generate_links': integration.auto_generate_links,
            'token_expired': integration.is_token_expired,
            'api_calls_today': integration.api_calls_today,
            'health': 'healthy' if integration.is_active and not integration.is_token_expired else 'unhealthy'
        }
        report['video_integrations'].append(health_status)
        
        if health_status['health'] == 'unhealthy':
            report['overall_health'] = 'degraded'
    
    return report