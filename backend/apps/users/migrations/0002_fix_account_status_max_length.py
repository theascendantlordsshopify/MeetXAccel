"""
# Fix account_status max_length

1. Database Schema Fix
   - Increase max_length for User.account_status field from 20 to 50 characters
   - Ensures all choice values fit properly, especially 'password_expired_grace_period' (29 chars)

2. Data Integrity
   - No data migration needed as existing values are shorter than new limit
   - Prevents potential data truncation issues
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='account_status',
            field=models.CharField(
                choices=[
                    ('active', 'Active'),
                    ('inactive', 'Inactive'),
                    ('suspended', 'Suspended'),
                    ('pending_verification', 'Pending Verification'),
                    ('password_expired', 'Password Expired'),
                    ('password_expired_grace_period', 'Password Expired (Grace Period)'),
                ],
                default='pending_verification',
                max_length=50
            ),
        ),
    ]