import os, django, secrets, string, requests
from django.utils import timezone
from django.conf import settings

# Django Setup
os.environ['DATABASE_URL'] = "postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:6543/postgres"
os.environ['SECRET_KEY'] = "yPjQuXVBrcNdXyA1C3pi-mEYn5yHHFDSJKHDo_ohP"
os.environ['DEBUG'] = "False"
os.environ['ALLOWED_HOSTS'] = "ilead-backend-production-20f7.up.railway.app"
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Student, User, SentEmailLog

# Brevo Setup
BREVO_API_KEY = os.environ.get("BREVO_API_KEY", "your-api-key-here")
headers = {
    "api-key": BREVO_API_KEY,
    "Content-Type": "application/json",
    "Accept": "application/json"
}

targets = [
    {"name_query": "Triparna das", "new_email": "triparnadas04@gmail.com"},
    {"name_query": "Sudipto Podder"},
    {"name_query": "Bishal Sardar"},
    {"name_query": "Talha Muzaffar"},
    {"name_query": "Purbita Biswas"},
    {"name_query": "Md Mobashir Nawab"},
    {"name_query": "Swapnanil Maity"},
    {"name_query": "Sk md shamir"},
    {"name_query": "Md Sharique Ullah"},
    {"name_query": "Dibyojoti Dutta"},
    {"name_query": "Khushnama Khatoon"},
    {"name_query": "Sohan Das"},
    {"email_query": "avikjana590@gmail.com"},
    {"name_query": "Farhana Sultana"}
]

alphabet = string.ascii_letters + string.digits

print("=== STARTING DIRECT BATCH PASSWORD RESET AND BREVO SEND ===")
print(f"{'Student Name':<25} | {'Email':<32} | {'Login ID':<12} | {'New Temp Password'}")
print("-" * 95)

reset_count = 0
results_table = []

for target in targets:
    s = None
    if "email_query" in target:
        s_qs = Student.objects.filter(email__iexact=target["email_query"])
        if s_qs.exists():
            s = s_qs.first()
    elif "name_query" in target:
        s_qs = Student.objects.filter(name__icontains=target["name_query"])
        if s_qs.exists():
            s = s_qs.first()
            
    if not s:
        print(f"FAILED TO FIND TARGET: {target}")
        continue
        
    u = s.user
    if not u:
        print(f"No user found for student: {s.name}")
        continue
        
    # Generate new temporary password
    temp_password = ''.join(secrets.choice(alphabet) for _ in range(10))
    
    # Apply email change if specified (e.g. Triparna Das)
    if "new_email" in target:
        s.email = target["new_email"]
        u.email = target["new_email"]
        
    # Reset credentials and flags to default state
    u.set_password(temp_password)
    u.temp_password_flag = True
    u.password_reset_required = True
    u.failed_login_attempts = 0
    u.locked_until = None
    
    # Save both models
    u.save()
    s.save()
    
    reset_count += 1
    print(f"{s.name[:25]:<25} | {s.email[:32]:<32} | {u.login_id:<12} | {temp_password}")
    results_table.append({
        "name": s.name,
        "email": s.email,
        "login_id": u.login_id,
        "password": temp_password
    })
    
    # Prepare Welcome Email
    subject = "Welcome to iLEAD Placement Portal - Account Created"
    message = (
        f"Dear {s.name},\n\n"
        f"Your student account credentials have been reset on the iLEAD Placement Portal.\n\n"
        f"Here are your login credentials:\n"
        f"- Login ID: {u.login_id}\n"
        f"- Temporary Password: {temp_password}\n\n"
        f"Please log in and update your password immediately at your first login: https://placement.ilead.net.in/login\n\n"
        f"Best regards,\n"
        f"Placement Team\n"
        f"iLEAD Institute of Leadership, Entrepreneurship and Development"
    )
    
    html_message = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to iLEAD Placement Portal</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #fafafa; margin: 0; padding: 40px 0;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fafafa;">
            <tr>
                <td align="center" style="padding: 0 16px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; border: 1px solid #eef2f6; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); margin: 0 auto; text-align: left;">
                        <tr>
                            <td height="4" style="background: linear-gradient(90deg, #1e3a8a 0%, #3b82f6 100%); border-top-left-radius: 12px; border-top-right-radius: 12px;"></td>
                        </tr>
                        <tr>
                            <td style="padding: 32px 32px 24px 32px;">
                                <h2 style="color: #1e3a8a; margin: 0 0 16px 0; font-size: 20px;">Account Created / Reset</h2>
                                <p style="color: #475569; font-size: 15px; line-height: 24px; margin: 0 0 24px 0;">
                                    Dear {s.name},<br><br>
                                    Your student account credentials have been reset on the <strong>iLEAD Placement Portal</strong>.
                                </p>
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 8px; margin-bottom: 24px;">
                                    <tr>
                                        <td style="padding: 20px;">
                                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                                <tr>
                                                     <td style="padding: 4px 0; font-size: 14px; color: #64748b; width: 140px;"><strong>Login ID:</strong></td>
                                                     <td style="padding: 4px 0; font-size: 15px; color: #1e293b; font-family: Consolas, Menlo, Monaco, 'Courier New', monospace; letter-spacing: 0.5px;">{u.login_id}</td>
                                                 </tr>
                                                 <tr>
                                                     <td style="padding: 10px 0; font-size: 14px; color: #64748b; width: 140px;"><strong>Temp Password:</strong></td>
                                                     <td style="padding: 10px 12px; font-size: 18px; font-weight: 700; color: #1e3a8a; font-family: Consolas, Menlo, Monaco, 'Courier New', monospace; letter-spacing: 2px; background-color: #ffffff; border: 1px dashed #cbd5e1; border-radius: 4px; display: inline-block;">{temp_password}</td>
                                                 </tr>
                                                 <tr>
                                                     <td colspan="2" style="font-size: 11px; color: #64748b; padding-top: 12px; line-height: 1.4;">
                                                         <em>💡 Tip: Monospace characters are highly precise. Be careful to check the difference between a capital <strong>O</strong> (letter) vs <strong>0</strong> (number) and lowercase <strong>l</strong> (letter) vs <strong>1</strong> (number).</em>
                                                     </td>
                                                 </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                                    <tr>
                                        <td align="center">
                                            <a href="https://placement.ilead.net.in/login" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: 600; font-size: 15px; text-decoration: none; padding: 12px 28px; border-radius: 6px; box-shadow: 0 4px 6px -1px rgba(37,99,235,0.2);">Log In to Portal</a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style="background-color: #f8fafc; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; padding: 24px 32px; border-top: 1px solid #eef2f6;">
                                <p style="color: #475569; font-size: 14px; font-weight: 600; margin: 0 0 4px 0;">iLEAD Placement Team</p>
                                <p style="color: #94a3b8; font-size: 12px; margin: 0;">Institute of Leadership, Entrepreneurship and Development</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    # Send email directly via Brevo HTTP API
    payload = {
        "sender": {"name": "iLEAD Placement Team", "email": "contact@ilead.net.in"},
        "to": [{"email": s.email}],
        "subject": subject,
        "htmlContent": html_message,
        "textContent": message
    }
    
    try:
        response = requests.post("https://api.brevo.com/v3/smtp/email", json=payload, headers=headers, timeout=15)
        if response.status_code in (200, 201, 202):
            # Create SentEmailLog in database
            SentEmailLog.objects.create(
                recipient=s.email,
                subject=subject,
                body=message,
                sent_at=timezone.now()
            )
            print(f"  -> Email successfully sent to {s.email}")
        else:
            print(f"  -> Brevo returned error code {response.status_code}: {response.text}")
    except Exception as e:
        print(f"  -> Direct send failed: {e}")

print("-" * 95)
print(f"Successfully processed database updates and triggered direct email delivery for {reset_count} students.")
