from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import CalendarIntegration, VideoConferenceIntegration, WebhookIntegration, IntegrationLog
from .serializers import (
    CalendarIntegrationSerializer, VideoConferenceIntegrationSerializer,
    WebhookIntegrationSerializer, IntegrationLogSerializer,
    OAuthInitiateSerializer, OAuthCallbackSerializer
)


class CalendarIntegrationListView(generics.ListAPIView):
    serializer_class = CalendarIntegrationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return CalendarIntegration.objects.filter(organizer=self.request.user)


class CalendarIntegrationDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CalendarIntegrationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return CalendarIntegration.objects.filter(organizer=self.request.user)


class VideoConferenceIntegrationListView(generics.ListAPIView):
    serializer_class = VideoConferenceIntegrationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return VideoConferenceIntegration.objects.filter(organizer=self.request.user)


class VideoConferenceIntegrationDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = VideoConferenceIntegrationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return VideoConferenceIntegration.objects.filter(organizer=self.request.user)


class WebhookIntegrationListCreateView(generics.ListCreateAPIView):
    serializer_class = WebhookIntegrationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return WebhookIntegration.objects.filter(organizer=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user)


class WebhookIntegrationDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = WebhookIntegrationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return WebhookIntegration.objects.filter(organizer=self.request.user)


class IntegrationLogListView(generics.ListAPIView):
    serializer_class = IntegrationLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return IntegrationLog.objects.filter(organizer=self.request.user)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def initiate_oauth(request):
    """Initiate OAuth flow for calendar or video integrations."""
    serializer = OAuthInitiateSerializer(data=request.data)
    
    if serializer.is_valid():
        provider = serializer.validated_data['provider']
        integration_type = serializer.validated_data['integration_type']
        redirect_uri = serializer.validated_data['redirect_uri']
        
        from .utils import get_provider_scopes
        import urllib.parse
        import secrets
        
        # Generate state parameter for security
        state = secrets.token_urlsafe(32)
        request.session[f'oauth_state_{provider}_{integration_type}'] = state
        request.session[f'oauth_redirect_{provider}_{integration_type}'] = redirect_uri
        
        # Get required scopes
        scopes = get_provider_scopes(provider, integration_type)
        
        # Build authorization URL
        if provider == 'google':
            auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode({
                'client_id': settings.GOOGLE_OAUTH_CLIENT_ID,
                'redirect_uri': settings.GOOGLE_OAUTH_REDIRECT_URI,
                'scope': ' '.join(scopes),
                'response_type': 'code',
                'access_type': 'offline',
                'prompt': 'consent',
                'state': f"{provider}:{integration_type}:{state}"
            })
        elif provider == 'outlook':
            auth_url = f"https://login.microsoftonline.com/{settings.MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize?" + urllib.parse.urlencode({
                'client_id': settings.MICROSOFT_CLIENT_ID,
                'redirect_uri': settings.MICROSOFT_REDIRECT_URI,
                'scope': ' '.join(scopes),
                'response_type': 'code',
                'state': f"{provider}:{integration_type}:{state}"
            })
        elif provider == 'zoom':
            auth_url = "https://zoom.us/oauth/authorize?" + urllib.parse.urlencode({
                'client_id': settings.ZOOM_CLIENT_ID,
                'redirect_uri': settings.ZOOM_REDIRECT_URI,
                'response_type': 'code',
                'state': f"{provider}:{integration_type}:{state}"
            })
        elif provider == 'apple':
            # Apple Calendar typically uses app-specific passwords
            # For OAuth, you would use Sign in with Apple
            auth_url = "https://appleid.apple.com/auth/authorize?" + urllib.parse.urlencode({
                'client_id': getattr(settings, 'APPLE_CLIENT_ID', ''),
                'redirect_uri': getattr(settings, 'APPLE_REDIRECT_URI', ''),
                'response_type': 'code',
                'scope': 'name email',
                'response_mode': 'form_post',
                'state': f"{provider}:{integration_type}:{state}"
            })
        elif provider == 'microsoft_teams':
            # Microsoft Teams uses same OAuth as Outlook/Graph
            scopes = get_provider_scopes(provider, integration_type)
            auth_url = f"https://login.microsoftonline.com/{settings.MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize?" + urllib.parse.urlencode({
                'client_id': settings.MICROSOFT_CLIENT_ID,
                'redirect_uri': settings.MICROSOFT_REDIRECT_URI,
                'scope': ' '.join(scopes),
                'response_type': 'code',
                'state': f"{provider}:{integration_type}:{state}"
            })
        elif provider == 'webex':
            auth_url = "https://webexapis.com/v1/authorize?" + urllib.parse.urlencode({
                'client_id': getattr(settings, 'WEBEX_CLIENT_ID', ''),
                'redirect_uri': getattr(settings, 'WEBEX_REDIRECT_URI', ''),
                'response_type': 'code',
                'scope': 'spark:meetings_write spark:meetings_read',
                'state': f"{provider}:{integration_type}:{state}"
            })
        else:
            return Response(
                {'error': f'Provider {provider} not supported'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            'authorization_url': auth_url,
            'provider': provider,
            'integration_type': integration_type,
            'state': state
        })
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def webhook_receiver(request):
    """
    Generic webhook receiver with signature validation.
    
    This endpoint can be used to receive webhooks from external services
    with proper signature validation for security.
    """
    try:
        # Get webhook integration by URL or identifier
        webhook_id = request.GET.get('webhook_id')
        if not webhook_id:
            return Response(
                {'error': 'webhook_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            webhook = WebhookIntegration.objects.get(id=webhook_id, is_active=True)
        except WebhookIntegration.DoesNotExist:
            return Response(
                {'error': 'Webhook integration not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get raw request body for signature validation
        raw_body = request.body
        
        # Get signature from headers (try common header names)
        signature = (
            request.META.get('HTTP_X_WEBHOOK_SIGNATURE') or
            request.META.get('HTTP_X_HUB_SIGNATURE_256') or
            request.META.get('HTTP_X_STRIPE_SIGNATURE') or
            request.META.get('HTTP_X_SIGNATURE')
        )
        
        # Validate signature if secret key is configured
        if webhook.secret_key:
            from .utils import validate_webhook_signature_multiple_formats
            
            validation_result = validate_webhook_signature_multiple_formats(
                raw_body, signature, webhook.secret_key
            )
            
            if not validation_result['valid']:
                logger.warning(
                    f"Webhook signature validation failed for {webhook.name}: {validation_result['error']}"
                )
                return Response(
                    {'error': 'Invalid webhook signature'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            logger.info(f"Webhook signature validated using {validation_result['format_detected']} format")
        
        # Parse JSON payload
        try:
            payload = request.data if hasattr(request, 'data') else json.loads(raw_body.decode('utf-8'))
        except json.JSONDecodeError:
            return Response(
                {'error': 'Invalid JSON payload'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Log the webhook receipt
        from .models import IntegrationLog
        IntegrationLog.objects.create(
            organizer=webhook.organizer,
            log_type='webhook_received',
            integration_type='webhook',
            message=f"Webhook received from {request.META.get('REMOTE_ADDR', 'unknown')}",
            details={
                'webhook_name': webhook.name,
                'payload_size': len(raw_body),
                'signature_validated': bool(webhook.secret_key),
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'payload_preview': str(payload)[:500]  # First 500 chars for debugging
            },
            success=True
        )
        
        # Process the webhook payload (customize based on your needs)
        # This is where you would implement business logic for handling
        # different types of webhook events
        
        return Response({
            'message': 'Webhook received successfully',
            'webhook_id': str(webhook.id),
            'timestamp': timezone.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        return Response(
            {'error': 'Internal server error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def oauth_callback(request):
    """Handle OAuth callback and store tokens."""
    serializer = OAuthCallbackSerializer(data=request.data)
    
    if serializer.is_valid():
        provider = serializer.validated_data['provider']
        integration_type = serializer.validated_data['integration_type']
        code = serializer.validated_data['code']
        state = serializer.validated_data.get('state', '')
        
        # Verify state parameter
        expected_state = request.session.get(f'oauth_state_{provider}_{integration_type}')
        if not expected_state or not state.endswith(expected_state):
            return Response(
                {'error': 'Invalid state parameter'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Exchange code for tokens
            token_data = exchange_oauth_code(provider, code)
            
            # Get user info from provider
            user_info = get_provider_user_info(provider, token_data['access_token'])
            
            # Create or update integration
            if integration_type == 'calendar':
                integration, created = CalendarIntegration.objects.update_or_create(
                    organizer=request.user,
                    provider=provider,
                    defaults={
                        'access_token': token_data['access_token'],
                        'refresh_token': token_data.get('refresh_token', ''),
                        'token_expires_at': timezone.now() + timedelta(seconds=token_data.get('expires_in', 3600)),
                        'provider_user_id': user_info.get('id', ''),
                        'provider_email': user_info.get('email', ''),
                        'calendar_id': user_info.get('calendar_id', ''),
                        'is_active': True,
                        'sync_enabled': True,
                        'sync_errors': 0
                    }
                )
            else:  # video
                integration, created = VideoConferenceIntegration.objects.update_or_create(
                    organizer=request.user,
                    provider=provider,
                    defaults={
                        'access_token': token_data['access_token'],
                        'refresh_token': token_data.get('refresh_token', ''),
                        'token_expires_at': timezone.now() + timedelta(seconds=token_data.get('expires_in', 3600)),
                        'provider_user_id': user_info.get('id', ''),
                        'provider_email': user_info.get('email', ''),
                        'is_active': True,
                        'auto_generate_links': True
                    }
                )
            
            # Trigger initial sync for calendar integrations
            if integration_type == 'calendar':
                from .tasks import sync_calendar_events
                sync_calendar_events.delay(integration.id)
            
            # Clean up session
            request.session.pop(f'oauth_state_{provider}_{integration_type}', None)
            request.session.pop(f'oauth_redirect_{provider}_{integration_type}', None)
            
            action = "connected" if created else "reconnected"
            
            return Response({
                'message': f'{provider.title()} {integration_type} integration {action} successfully',
                'provider': provider,
                'integration_type': integration_type,
                'provider_email': user_info.get('email', ''),
                'created': created
            })
            
        except Exception as e:
            logger.error(f"OAuth callback error for {provider}: {str(e)}")
            return Response(
                {'error': f'Failed to complete {provider} integration: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response({
            'message': f'{provider.title()} {integration_type} integration completed successfully',
            'provider': provider,
            'integration_type': integration_type
        })
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def exchange_oauth_code(provider, code):
    """
    Exchange OAuth authorization code for access tokens.
    
    Args:
        provider: Provider name (google, outlook, zoom)
        code: Authorization code from OAuth callback
    
    Returns:
        dict: Token data
    """
    if provider == 'google':
        token_url = "https://oauth2.googleapis.com/token"
        data = {
            'client_id': settings.GOOGLE_OAUTH_CLIENT_ID,
            'client_secret': settings.GOOGLE_OAUTH_CLIENT_SECRET,
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': settings.GOOGLE_OAUTH_REDIRECT_URI
        }
    elif provider == 'outlook':
        token_url = f"https://login.microsoftonline.com/{settings.MICROSOFT_TENANT_ID}/oauth2/v2.0/token"
        data = {
            'client_id': settings.MICROSOFT_CLIENT_ID,
            'client_secret': settings.MICROSOFT_CLIENT_SECRET,
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': settings.MICROSOFT_REDIRECT_URI
        }
    elif provider == 'zoom':
        token_url = "https://zoom.us/oauth/token"
        data = {
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': settings.ZOOM_REDIRECT_URI
        }
        # Zoom uses Basic Auth
        auth = (settings.ZOOM_CLIENT_ID, settings.ZOOM_CLIENT_SECRET)
        response = requests.post(token_url, data=data, auth=auth, timeout=30)
    elif provider == 'apple':
        token_url = "https://appleid.apple.com/auth/token"
        data = {
            'client_id': getattr(settings, 'APPLE_CLIENT_ID', ''),
            'client_secret': getattr(settings, 'APPLE_CLIENT_SECRET', ''),
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': getattr(settings, 'APPLE_REDIRECT_URI', '')
        }
    elif provider == 'microsoft_teams':
        # Microsoft Teams uses same OAuth as Outlook
        token_url = f"https://login.microsoftonline.com/{settings.MICROSOFT_TENANT_ID}/oauth2/v2.0/token"
        data = {
            'client_id': settings.MICROSOFT_CLIENT_ID,
            'client_secret': settings.MICROSOFT_CLIENT_SECRET,
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': settings.MICROSOFT_REDIRECT_URI
        }
    elif provider == 'webex':
        token_url = "https://webexapis.com/v1/access_token"
        data = {
            'grant_type': 'authorization_code',
            'client_id': getattr(settings, 'WEBEX_CLIENT_ID', ''),
            'client_secret': getattr(settings, 'WEBEX_CLIENT_SECRET', ''),
            'code': code,
            'redirect_uri': getattr(settings, 'WEBEX_REDIRECT_URI', '')
        }
    else:
        raise ValueError(f"Unsupported provider: {provider}")
    
    if provider not in ['zoom', 'webex']:
        response = requests.post(token_url, data=data, timeout=30)
    elif provider == 'webex':
        response = requests.post(token_url, data=data, timeout=30)
    
    if response.status_code != 200:
        raise Exception(f"Token exchange failed: {response.text}")
    
    return response.json()


def get_provider_user_info(provider, access_token):
    """
    Get user information from OAuth provider.
    
    Args:
        provider: Provider name
        access_token: Access token
    
    Returns:
        dict: User information
    """
    headers = {'Authorization': f'Bearer {access_token}'}
    
    if provider == 'google':
        response = requests.get('https://www.googleapis.com/oauth2/v2/userinfo', headers=headers, timeout=30)
    elif provider == 'outlook':
        response = requests.get('https://graph.microsoft.com/v1.0/me', headers=headers, timeout=30)
    elif provider == 'zoom':
        response = requests.get('https://api.zoom.us/v2/users/me', headers=headers, timeout=30)
    elif provider == 'apple':
        # Apple's user info endpoint
        response = requests.get('https://appleid.apple.com/auth/userinfo', headers=headers, timeout=30)
    elif provider == 'microsoft_teams':
        # Microsoft Teams uses same user info as Outlook
        response = requests.get('https://graph.microsoft.com/v1.0/me', headers=headers, timeout=30)
    elif provider == 'webex':
        response = requests.get('https://webexapis.com/v1/people/me', headers=headers, timeout=30)
    else:
        raise ValueError(f"Unsupported provider: {provider}")
    
    if response.status_code != 200:
        raise Exception(f"Failed to get user info: {response.text}")
    
    user_data = response.json()
    
    # Normalize user data across providers
    if provider == 'webex':
        # Webex returns emails as an array
        emails = user_data.get('emails', [])
        primary_email = next((email['value'] for email in emails if email.get('type') == 'work'), 
                           emails[0]['value'] if emails else '')
        return {
            'id': user_data.get('id', ''),
            'email': primary_email,
            'name': user_data.get('displayName', '')
        }
    elif provider == 'apple':
        # Apple returns limited user info
        return {
            'id': user_data.get('sub', ''),
            'email': user_data.get('email', ''),
            'name': user_data.get('name', {}).get('firstName', '') + ' ' + user_data.get('name', {}).get('lastName', '')
        }
    
    return user_data


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def integration_health(request):
    """Get health status of all integrations for the organizer."""
    from .utils import create_integration_health_report
    
    health_report = create_integration_health_report(request.user)
    
    return Response(health_report)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def force_calendar_sync(request, pk):
    """Force immediate calendar sync for a specific integration."""
    integration = get_object_or_404(CalendarIntegration, pk=pk, organizer=request.user)
    
    if not integration.is_active:
        return Response(
            {'error': 'Integration is not active'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Trigger immediate sync
    from .tasks import sync_calendar_events
    sync_calendar_events.delay(integration.id)
    
    return Response({'message': 'Calendar sync initiated'})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def calendar_conflicts(request):
    """Get calendar conflicts for the organizer."""
    from apps.availability.models import BlockedTime
    from .utils import detect_integration_conflicts
    
    # Get manual blocks
    manual_blocks = BlockedTime.objects.filter(
        organizer=request.user,
        source='manual',
        is_active=True,
        start_datetime__gte=timezone.now()
    )
    
    # Get synced blocks
    synced_blocks = BlockedTime.objects.filter(
        organizer=request.user,
        source__endswith='_calendar',
        is_active=True,
        start_datetime__gte=timezone.now()
    )
    
    # Convert synced blocks to external event format for conflict detection
    external_events = []
    for block in synced_blocks:
        external_events.append({
            'external_id': block.external_id,
            'summary': block.reason,
            'start_datetime': block.start_datetime,
            'end_datetime': block.end_datetime,
            'updated': block.external_updated_at or block.updated_at
        })
    
    conflicts = detect_integration_conflicts(request.user, external_events, manual_blocks)
    
    return Response({
        'conflicts': conflicts,
        'manual_blocks_count': manual_blocks.count(),
        'synced_blocks_count': synced_blocks.count()
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def test_webhook(request, pk):
    """Test a webhook integration."""
    webhook = get_object_or_404(WebhookIntegration, pk=pk, organizer=request.user)
    
    # Create test payload
    test_payload = {
        'event': 'test',
        'timestamp': timezone.now().isoformat(),
        'data': {
            'message': 'This is a test webhook from Calendly Clone',
            'webhook_id': str(webhook.id),
            'organizer_email': request.user.email,
            'test_mode': True
        }
    }
    
    # Trigger test webhook with signature
    from .tasks import send_webhook
    send_webhook.delay(
        webhook_id=webhook.id,
        event_type='test',
        data=test_payload
    )
    
    return Response({
        'message': 'Test webhook triggered',
        'payload': test_payload,
        'webhook_url': webhook.webhook_url
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def refresh_calendar_sync(request, pk):
    """Manually refresh calendar sync for a specific integration."""
    integration = get_object_or_404(CalendarIntegration, pk=pk, organizer=request.user)
    
    # Trigger calendar sync
    from .tasks import sync_calendar_events
    sync_calendar_events.delay(integration.id)
    
    return Response({'message': 'Calendar sync initiated'})