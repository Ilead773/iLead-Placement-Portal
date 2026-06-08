import os
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from django.core.mail import EmailMessage
from django.conf import settings

logger = logging.getLogger(__name__)

def build_resume_email(
    to_email: str,
    subject: str,
    body: str,
    applications: list,  # list of Application objects
    from_email: str = None,
    cc_emails: list = None,
    log_id: str = None,
) -> EmailMessage:
    """
    Builds an HTML EmailMessage with links to all selected students' resumes in a table
    along with an optional Master Link to view all resumes in a neat online table.
    Returns EmailMessage object ready to send.
    Raises ValueError if no valid resume files found.
    """
    from_email = from_email or settings.DEFAULT_FROM_EMAIL
    cc_emails = cc_emails or []

    attached_count = 0
    skipped = []

    backend_url = os.environ.get('BACKEND_URL', 'http://localhost:8000').rstrip('/')

    html_table_rows = []

    for app in applications:
        student = app.student
        file_url = None
        
        # Check built resumes first
        primary_built = student.built_resumes.filter(is_primary=True, state__in=['active', 'generated']).first()
        if primary_built and primary_built.generated_pdf:
            file_url = f"{backend_url}{primary_built.generated_pdf.url}"
        else:
            # Check uploaded resumes
            primary_upload = student.resume_uploads.filter(is_primary=True, status='parsed').first()
            if primary_upload and primary_upload.file:
                file_url = f"{backend_url}{primary_upload.file.url}"

        if not file_url:
            skipped.append(f"{student.name} (no primary resume found)")
            continue

        department = student.stream or 'Unknown'
        year = student.year or 'Unknown'
        cgpa = str(student.cgpa or 'N/A')

        html_table_rows.append(f"""
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd;">{student.name}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">{department}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">{year}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">{cgpa}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">
                    <a href="{file_url}" style="color: #2563eb; text-decoration: none; font-weight: bold;">Download Resume</a>
                </td>
            </tr>
        """)
        attached_count += 1

    if attached_count == 0:
        raise ValueError(
            f"No valid resumes found. Skipped: {', '.join(skipped) if skipped else 'all files missing'}"
        )

    body_html = body.replace('\n', '<br>')
    
    master_link_html = ""
    if log_id:
        master_url = f"{settings.FRONTEND_URL}/shared-resumes/{log_id}"
        master_link_html = f"""
        <div style="margin-top: 28px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <a href="{master_url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 99px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2); transition: all 0.2s;">
                View Master Resume Workspace →
            </a>
        </div>
        """

    full_html_content = f"""
    <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #334155; line-height: 1.6; padding: 24px; max-width: 650px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div style="font-size: 15px; color: #1e293b; font-family: inherit; whitespace: pre-line;">
                {body_html}
            </div>
            {master_link_html}
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-top: 32px; margin-bottom: 16px;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">Sent securely via iLEAD Placement Portal</p>
        </body>
    </html>
    """

    email = EmailMessage(
        subject=subject,
        body=full_html_content,
        from_email=from_email,
        to=[to_email],
        cc=cc_emails,
    )
    email.content_subtype = "html"

    return email, attached_count, skipped


def validate_email_payload(data: dict) -> dict:
    import re
    EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

    errors = {}

    company_email = data.get('company_email', '').strip()
    if not company_email:
        errors['company_email'] = 'Company email is required.'
    elif not EMAIL_REGEX.match(company_email):
        errors['company_email'] = f'"{company_email}" is not a valid email address.'

    subject = data.get('subject', '').strip()
    if not subject:
        errors['subject'] = 'Email subject is required.'
    elif len(subject) > 200:
        errors['subject'] = f'Subject too long ({len(subject)} chars). Maximum is 200.'

    body = data.get('body', '').strip()
    if not body:
        errors['body'] = 'Email body is required.'
    elif len(body) > 5000:
        errors['body'] = f'Body too long ({len(body)} chars). Maximum is 5000.'

    application_ids = data.get('application_ids', [])
    if not isinstance(application_ids, list) or len(application_ids) == 0:
        errors['application_ids'] = 'Select at least one student.'
    elif len(application_ids) > 50:
        errors['application_ids'] = f'Too many selected ({len(application_ids)}). Maximum is 50 per email.'

    cc_emails = data.get('cc_emails', [])
    if cc_emails:
        if len(cc_emails) > 5:
            errors['cc_emails'] = 'Maximum 5 CC email addresses allowed.'
        else:
            invalid_cc = [e for e in cc_emails if not EMAIL_REGEX.match(e.strip())]
            if invalid_cc:
                errors['cc_emails'] = f'Invalid CC emails: {", ".join(invalid_cc)}'

    if errors:
        raise ValueError(errors)

    return {
        'company_email': company_email,
        'subject': subject,
        'body': body,
        'application_ids': application_ids,
        'cc_emails': [e.strip() for e in cc_emails],
    }
