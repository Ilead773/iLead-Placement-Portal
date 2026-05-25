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
) -> EmailMessage:
    """
    Builds an EmailMessage with all selected students' resumes attached.
    
    Each attachment filename: {StudentName}_{Department}_{Year}Year_CGPA{cgpa}.pdf
    Returns EmailMessage object ready to send.
    Raises ValueError if no valid resume files found.
    """
    from_email = from_email or settings.DEFAULT_FROM_EMAIL
    cc_emails = cc_emails or []

    email = EmailMessage(
        subject=subject,
        body=body,
        from_email=from_email,
        to=[to_email],
        cc=cc_emails,
    )

    attached_count = 0
    skipped = []

    for app in applications:
        student = app.student
        file_path = None
        
        # Check built resumes first
        primary_built = student.built_resumes.filter(is_primary=True, state__in=['active', 'generated']).first()
        if primary_built and primary_built.generated_pdf:
            file_path = primary_built.generated_pdf.path
        else:
            # Check uploaded resumes
            primary_upload = student.resume_uploads.filter(is_primary=True, status='parsed').first()
            if primary_upload and primary_upload.file:
                file_path = primary_upload.file.path

        if not file_path:
            skipped.append(f"{student.name} (no primary resume found)")
            continue

        if not os.path.exists(file_path):
            skipped.append(f"{student.name} (file not found on disk)")
            logger.warning(f"Resume file not found: {file_path} for application {app.id}")
            continue

        # Build descriptive filename
        student_name = student.name.replace(' ', '_')
        department = student.stream or 'Unknown'
        year = student.year or 'Unknown'
        cgpa = str(student.cgpa or '0').replace('.', '_')
        filename = f"{student_name}_{department}_{year}Year_CGPA{cgpa}.pdf"

        try:
            with open(file_path, 'rb') as f:
                email.attach(filename, f.read(), 'application/pdf')
            attached_count += 1
        except (IOError, OSError) as e:
            skipped.append(f"{student.name} (read error: {str(e)})")
            logger.error(f"Could not read resume file {file_path}: {e}")

    if attached_count == 0:
        raise ValueError(
            f"No valid resume files found. Skipped: {', '.join(skipped) if skipped else 'all files missing'}"
        )

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
