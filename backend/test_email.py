import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.mail import EmailMultiAlternatives

try:
    print("Sending real email via Brevo backend to shahithu2004@gmail.com...")
    
    subject = 'iLEAD Placement Portal - Verified Sender Test'
    from_email = 'corporate.relations@ilead.net.in'
    to = ['shahithu2004@gmail.com']
    
    text_content = 'Hello! This is an official test notification from the iLEAD Placement Portal email system.'
    html_content = '''
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #1a56db; margin-top: 0;">iLEAD Placement Portal</h2>
        <p>Hello,</p>
        <p>This is an official notification email sent via Brevo to test real email delivery.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-left: 4px solid #1a56db; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold;">Status: Active & Authenticated</p>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #555;">Sender: corporate.relations@ilead.net.in</p>
        </div>
        <p>If you are receiving this, your Brevo email backend is working perfectly!</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888;">iLEAD Placement Portal &copy; 2026. All rights reserved.</p>
    </div>
    '''
    
    msg = EmailMultiAlternatives(subject, text_content, from_email, to)
    msg.attach_alternative(html_content, "text/html")
    result = msg.send()
    
    print(f"Success! Email sent. Result code: {result}")

except Exception as e:
    print(f"Failed to send email. An error occurred: {e}")

