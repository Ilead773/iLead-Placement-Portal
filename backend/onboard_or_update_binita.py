import os
import sys
import django
import random
import string
import pandas as pd
from django.utils import timezone
from django.contrib.auth.hashers import make_password

sys.stdout.reconfigure(encoding='utf-8')
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

# 1. Setup Student Details
reg_no = '29941923011'
target_email = 'binitaroy483@gmail.com'
target_name = 'Binita Roy'
target_course = 'BBA'
target_semester = 7

print("=== STARTING BINITA ROY ONBOARDING/UPDATE ===", flush=True)

student = Student.objects.filter(registration_number=reg_no).first()
if not student:
    student = Student.objects.filter(email=target_email).first()

if not student:
    print(f"Student {target_name} not found. Creating a new Student record...")
    # Generate user
    user = User.objects.create(
        login_id=reg_no,
        email=target_email,
        name=target_name,
        role='student',
        is_active=True
    )
    student = Student.objects.create(
        user=user,
        registration_number=reg_no,
        name=target_name,
        email=target_email,
        course=target_course,
        semester=target_semester,
        status='active'
    )
else:
    print(f"Found existing Student: {student.name}")
    student.email = target_email
    student.course = target_course
    student.semester = target_semester
    student.save()
    
    user = student.user
    if not user:
        print("Student had no user account. Creating one...")
        user = User.objects.create(
            login_id=reg_no,
            email=target_email,
            name=student.name,
            role='student',
            is_active=True
        )
        student.user = user
        student.save()
    else:
        print(f"Found existing User account: {user.login_id}")
        user.email = target_email
        user.save()

# 2. Generate a random temporary password
chars = string.ascii_letters + string.digits
temp_password = ''.join(random.choice(chars) for _ in range(10))
print(f"Generated Temp Password: {temp_password}")

# 3. Update User's password
user.password = make_password(temp_password)
user.temp_password_flag = True
user.save()

# 4. Trigger the welcome email synchronously using direct send_mail
subject = "Welcome to iLEAD Placement Portal - Account Details Updated"
message = (
    f"Dear {student.name},\n\n"
    f"Your student account has been set up on the iLEAD Placement Portal.\n\n"
    f"Here are your login credentials:\n"
    f"- Login ID: {user.login_id}\n"
    f"- Temporary Password: {temp_password}\n\n"
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
                            <h2 style="color: #1e3a8a; margin: 0 0 16px 0; font-size: 20px;">Welcome to iLEAD Placement Portal</h2>
                            <p style="color: #475569; font-size: 15px; line-height: 24px; margin: 0 0 24px 0;">
                                Dear {student.name},<br><br>
                                Your student account is ready on the <strong>iLEAD Placement Portal</strong>. Here are your login credentials:
                            </p>
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 8px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td style="padding: 4px 0; font-size: 14px; color: #64748b; width: 140px;"><strong>Login ID:</strong></td>
                                                <td style="padding: 4px 0; font-size: 15px; color: #1e293b; font-family: Consolas, Menlo, Monaco, 'Courier New', monospace; letter-spacing: 0.5px;">{user.login_id}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px 0; font-size: 14px; color: #64748b; width: 140px;"><strong>Temp Password:</strong></td>
                                                <td style="padding: 10px 12px; font-size: 18px; font-weight: 700; color: #1e3a8a; font-family: Consolas, Menlo, Monaco, 'Courier New', monospace; letter-spacing: 2px; background-color: #ffffff; border: 1px dashed #cbd5e1; border-radius: 4px; display: inline-block;">{temp_password}</td>
                                            </tr>
                                            <tr>
                                                <td colspan="2" style="font-size: 11px; color: #64748b; padding-top: 12px; line-height: 1.4;">
                                                    <em>💡 Tip: Please copy-paste the temporary password exactly as shown. Make sure there are no extra spaces before or after the password when entering it.</em>
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
                                Please log in and update your password immediately at your first login.
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
    [target_email],
    html_message=html_message
)
print("Welcome email successfully sent synchronously via Brevo backend!")

# 5. Log details in Sent_Emails_Updated.xlsx if it exists
file_path = r"c:\Users\shahi\OneDrive\Documents\iLEAD_Placement_portal\Sent_Emails_Updated.xlsx"
if os.path.exists(file_path):
    df = pd.read_excel(file_path)
    new_row = {
        'Student Name': student.name,
        'Login ID (Roll Number)': int(student.registration_number),
        'Email Address': student.email,
        'Program / Course': temp_password,
        'Department / Stream': student.course,
        'Semester': student.stream,
        'Status': student.semester,
        'Unnamed: 7': 'Sent successfully'
    }
    df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
    df.to_excel(file_path, index=False)
    print("Successfully appended record to Sent_Emails_Updated.xlsx!")
