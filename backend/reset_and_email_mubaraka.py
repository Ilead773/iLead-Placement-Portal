import os
import sys
import random
import string
import pandas as pd
import django

sys.stdout.reconfigure(encoding='utf-8')

# Ensure environment variables are loaded
from pathlib import Path
try:
    import dotenv
    prod_env = Path(__file__).resolve().parent / '.env.production'
    if prod_env.exists():
        dotenv.load_dotenv(prod_env, override=True)
except ImportError:
    pass

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Student, User
from django.conf import settings
from django.core.mail import send_mail
from django.contrib.auth.hashers import make_password

roll = '28943124005'
print(f"=== RESETTING PASSWORD & SENDING EMAIL FOR ROLL: {roll} ===", flush=True)

student = Student.objects.filter(registration_number=roll).first()
if not student:
    print(f"Student with roll {roll} not found!", flush=True)
    sys.exit(1)

user = student.user
if not user:
    user = User.objects.filter(login_id=roll).first()

if not user:
    print(f"User account for roll {roll} not found!", flush=True)
    sys.exit(1)

print(f"Found Student: {student.name} | Email: {student.email}", flush=True)

# Generate new temporary password
chars = string.ascii_letters + string.digits
new_temp_pass = ''.join(random.choice(chars) for _ in range(10))

# Reset user authentication state
user.password = make_password(new_temp_pass)
user.temp_password_flag = True
user.password_reset_required = True
user.failed_login_attempts = 0
user.locked_until = None
user.is_active = True
user.save()

print(f"✅ Reset DB User state successfully! New Temp Password: {new_temp_pass}", flush=True)

# Prepare & Send Email
subject = "iLEAD Placement Portal - Account Login Credentials & Password Reset"
message = (
    f"Dear {student.name},\n\n"
    f"Your login credentials for the iLEAD Placement Portal have been reset.\n\n"
    f"Here are your updated login credentials:\n"
    f"- Login ID (Roll No): {user.login_id}\n"
    f"- Temporary Password: {new_temp_pass}\n\n"
    f"Please log in and update your password immediately at your first login: {settings.FRONTEND_URL}/login\n\n"
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
    <title>iLEAD Placement Portal - Password Reset</title>
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
                            <h2 style="color: #1e3a8a; margin: 0 0 16px 0; font-size: 20px;">iLEAD Placement Portal — Password Reset</h2>
                            <p style="color: #475569; font-size: 15px; line-height: 24px; margin: 0 0 24px 0;">
                                Dear {student.name},<br><br>
                                Your login credentials for the <strong>iLEAD Placement Portal</strong> have been updated. Here are your credentials:
                            </p>
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 8px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td style="padding: 4px 0; font-size: 14px; color: #64748b; width: 140px;"><strong>Login ID / Roll:</strong></td>
                                                <td style="padding: 4px 0; font-size: 15px; color: #1e293b; font-family: Consolas, Menlo, Monaco, 'Courier New', monospace; letter-spacing: 0.5px;">{user.login_id}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px 0; font-size: 14px; color: #64748b; width: 140px;"><strong>Temp Password:</strong></td>
                                                <td style="padding: 10px 12px; font-size: 18px; font-weight: 700; color: #1e3a8a; font-family: Consolas, Menlo, Monaco, 'Courier New', monospace; letter-spacing: 2px; background-color: #ffffff; border: 1px dashed #cbd5e1; border-radius: 4px; display: inline-block;">{new_temp_pass}</td>
                                            </tr>
                                            <tr>
                                                <td colspan="2" style="font-size: 11px; color: #64748b; padding-top: 12px; line-height: 1.4;">
                                                    <em>💡 Tip: Please copy-paste the temporary password exactly as shown with no extra spaces.</em>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                                <tr>
                                    <td align="center">
                                        <a href="{settings.FRONTEND_URL}/login" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: 600; font-size: 15px; text-decoration: none; padding: 12px 28px; border-radius: 6px; box-shadow: 0 4px 6px -1px rgba(37,99,235,0.2);">Log In to Portal</a>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #64748b; font-size: 13px; line-height: 20px; margin: 0;">
                                Please log in and set your new password.
                            </p>
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

send_mail(
    subject,
    message,
    None,
    [student.email],
    html_message=html_message
)

print(f"✉️ Email sent successfully to {student.email} via Brevo!", flush=True)

# Append to Excel log
file_path = r"c:\Users\shahi\OneDrive\Documents\iLEAD_Placement_portal\Sent_Emails_Updated.xlsx"
if os.path.exists(file_path):
    try:
        df_excel = pd.read_excel(file_path)
        new_row = {
            'Student Name': student.name,
            'Login ID (Roll Number)': int(user.login_id) if user.login_id.isdigit() else user.login_id,
            'Email Address': student.email,
            'Program / Course': new_temp_pass,
            'Department / Stream': student.course,
            'Semester': student.semester,
            'Status': 'Password Reset & Sent',
            'Unnamed: 7': 'Sent successfully'
        }
        df_excel = pd.concat([df_excel, pd.DataFrame([new_row])], ignore_index=True)
        df_excel.to_excel(file_path, index=False)
        print("Successfully updated Sent_Emails_Updated.xlsx!", flush=True)
    except Exception as e:
        print(f"Could not update Excel log file: {e}", flush=True)

print("=== COMPLETE ===", flush=True)
