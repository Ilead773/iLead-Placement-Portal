from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings


class Command(BaseCommand):
    help = 'Send a test email using configured EMAIL_BACKEND (SMTP)'

    def add_arguments(self, parser):
        parser.add_argument('to', nargs='?', help='Recipient email address', default=None)

    def handle(self, *args, **options):
        recipient = options.get('to') or getattr(settings, 'ADMIN_EMAIL', None) or getattr(settings, 'DEFAULT_FROM_EMAIL', None)
        if not recipient:
            self.stdout.write(self.style.ERROR('No recipient specified and no ADMIN_EMAIL/DEFAULT_FROM_EMAIL configured.'))
            return

        subject = 'iLEAD Placement Portal — Test Email'
        message = 'This is a test email sent from the iLEAD Placement Portal to verify SMTP configuration.'
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', recipient)

        try:
            send_mail(subject, message, from_email, [recipient], fail_silently=False)
            self.stdout.write(self.style.SUCCESS(f'Successfully sent test email to {recipient}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Failed to send test email: {e}'))
