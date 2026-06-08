import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.mail import send_mail

try:
    print("Sending test email using Django mail...")
    # Resend sandbox (using onboarding@resend.dev) can only send to the owner of the API key
    res = send_mail(
        subject="Resend API Integration Test",
        message="This is a test email sent from the iLEAD portal via the Resend API backend.",
        from_email="onboarding@resend.dev",
        recipient_list=["shahithu2004@gmail.com"],
        fail_silently=False
    )
    print("Email send result (should be 1 if sent):", res)
except Exception as e:
    print("Failed to send email:")
    import traceback
    traceback.print_exc()
