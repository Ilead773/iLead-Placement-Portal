import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.mail import send_mail

try:
    print("Attempting to send a test email via Brevo...")
    
    # We will send it to a dummy address or back to the sender
    result = send_mail(
        subject='Brevo API Test',
        message='This is an automated test to check if the Brevo API key is working.',
        from_email='contact@ilead.net.in',
        recipient_list=['contact@ilead.net.in'], # Sending to itself
        fail_silently=False,
    )
    
    print(f"Success! Email sent. Result code: {result}")
    print("The Brevo API accepted the request, meaning your API key and configuration are working properly!")

except Exception as e:
    print(f"Failed to send email. An error occurred: {e}")
