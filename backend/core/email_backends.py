import logging
import resend
import base64
import requests
from email.utils import parseaddr
from django.core.mail.backends.base import BaseEmailBackend
from django.conf import settings

# Brevo imports
from brevo import Brevo
from brevo.transactional_emails import (
    SendTransacEmailRequestSender,
    SendTransacEmailRequestToItem,
    SendTransacEmailRequestCcItem,
    SendTransacEmailRequestBccItem,
    SendTransacEmailRequestReplyTo,
    SendTransacEmailRequestAttachmentItem
)

logger = logging.getLogger(__name__)

# Public email domains that cannot be verified on Resend
PUBLIC_DOMAINS = {'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'aol.com', 'yahoo.in'}


def _safe_from_email():
    """
    Returns a safe sender address. Falls back to onboarding@resend.dev
    if DEFAULT_FROM_EMAIL uses a public/unverified domain.
    """
    default_from = getattr(settings, 'DEFAULT_FROM_EMAIL', 'onboarding@resend.dev')
    domain = default_from.split('@')[-1].lower() if '@' in default_from else ''
    if domain in PUBLIC_DOMAINS or not domain:
        return 'onboarding@resend.dev'
    return default_from


class ResendEmailBackend(BaseEmailBackend):
    """
    A Django email backend that sends emails via the Resend API.

    In RESEND_TEST_MODE (default when no domain is verified), all emails are
    redirected to RESEND_TEST_REDIRECT_EMAIL so they still arrive without errors.
    The original intended recipients are prepended to the email subject/body for
    easy debugging.
    """

    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        self.api_key = getattr(settings, 'RESEND_API_KEY', None)
        if self.api_key:
            resend.api_key = self.api_key

        # Test redirect mode: when True, all emails are redirected to a single address
        self.test_mode = getattr(settings, 'RESEND_TEST_MODE', True)
        self.test_redirect_email = getattr(settings, 'RESEND_TEST_REDIRECT_EMAIL', None)

    def send_messages(self, email_messages):
        if not email_messages:
            return 0

        # Ensure API key is set
        if not resend.api_key:
            self.api_key = getattr(settings, 'RESEND_API_KEY', None)
            if not self.api_key:
                logger.error("Resend API key is not configured in settings.RESEND_API_KEY.")
                if not self.fail_silently:
                    raise ValueError("Resend API key is not configured.")
                return 0
            resend.api_key = self.api_key

        # Refresh test mode settings each call (allows dynamic env changes)
        test_mode = getattr(settings, 'RESEND_TEST_MODE', self.test_mode)
        # Fallback chain: RESEND_TEST_REDIRECT_EMAIL → ADMIN_EMAIL → None
        test_redirect_email = (
            getattr(settings, 'RESEND_TEST_REDIRECT_EMAIL', None)
            or getattr(settings, 'ADMIN_EMAIL', None)
            or self.test_redirect_email
        )

        sent_count = 0
        for message in email_messages:
            try:
                original_to = list(message.to)
                if not original_to:
                    continue

                # Resolve safe from address (no public/unverified domains)
                from_email = message.from_email or _safe_from_email()
                domain = from_email.split('@')[-1].lower() if '@' in from_email else ''
                if domain in PUBLIC_DOMAINS or not domain:
                    from_email = _safe_from_email()

                subject = message.subject

                # ── TEST MODE: redirect all emails to the admin/test address ──
                if test_mode and test_redirect_email:
                    to_emails = [test_redirect_email]
                    # Prepend original recipients to subject for visibility
                    original_to_str = ', '.join(original_to)
                    subject = f"[TEST → {original_to_str}] {subject}"
                    logger.info(
                        f"[RESEND TEST MODE] Redirecting email originally for "
                        f"{original_to_str} to {test_redirect_email}"
                    )
                else:
                    to_emails = original_to

                params = {
                    "from": from_email,
                    "to": to_emails,
                    "subject": subject,
                }

                # Add CC if present (skip in test mode to avoid unverified recipient errors)
                if message.cc and not test_mode:
                    params["cc"] = list(message.cc)

                # Add BCC if present (skip in test mode)
                if message.bcc and not test_mode:
                    params["bcc"] = list(message.bcc)

                # Add Reply-To if present
                if message.reply_to:
                    params["reply_to"] = list(message.reply_to)

                # Determine content type
                is_html = getattr(message, 'content_subtype', '') == 'html'

                # Check for HTML alternatives (multipart messages)
                html_content = None
                if hasattr(message, 'alternatives') and message.alternatives:
                    for alt_content, alt_mime in message.alternatives:
                        if alt_mime == 'text/html':
                            html_content = alt_content
                            break

                if is_html:
                    params["html"] = message.body
                elif html_content:
                    params["html"] = html_content
                    params["text"] = message.body
                else:
                    params["text"] = message.body

                # Support attachments (Base64 encoded)
                if message.attachments:
                    params_attachments = []
                    for attachment in message.attachments:
                        if isinstance(attachment, tuple):
                            filename = attachment[0]
                            content = attachment[1]
                            if isinstance(content, bytes):
                                file_content = base64.b64encode(content).decode("utf-8")
                            else:
                                file_content = base64.b64encode(
                                    str(content).encode("utf-8")
                                ).decode("utf-8")
                            params_attachments.append({
                                "filename": filename,
                                "content": file_content,
                            })
                        else:
                            logger.warning(
                                f"Skipping unsupported attachment format type: {type(attachment)}"
                            )
                    if params_attachments:
                        params["attachments"] = params_attachments

                # Send via Resend SDK
                resend.Emails.send(params)
                sent_count += 1

            except Exception as e:
                logger.error(f"Failed to send email via Resend: {e}", exc_info=True)
                if not self.fail_silently:
                    raise e

        return sent_count


class BrevoEmailBackend(BaseEmailBackend):
    """
    A Django email backend that sends emails via the Brevo Transactional Email API (using official SDK).

    In BREVO_TEST_MODE (default True), all emails are redirected to BREVO_TEST_REDIRECT_EMAIL
    (or ADMIN_EMAIL) so they still arrive without errors during testing. The original
    intended recipients are prepended to the email subject for easy debugging.
    """

    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        self.api_key = getattr(settings, 'BREVO_API_KEY', None)
        self.test_mode = getattr(settings, 'BREVO_TEST_MODE', True)
        self.test_redirect_email = getattr(settings, 'BREVO_TEST_REDIRECT_EMAIL', None)

    def send_messages(self, email_messages):
        if not email_messages:
            return 0

        if not self.api_key:
            self.api_key = getattr(settings, 'BREVO_API_KEY', None)
            if not self.api_key:
                logger.error("Brevo API key is not configured in settings.BREVO_API_KEY.")
                if not self.fail_silently:
                    raise ValueError("Brevo API key is not configured.")
                return 0

        # Refresh test mode settings each call
        test_mode = getattr(settings, 'BREVO_TEST_MODE', self.test_mode)
        test_redirect_email = (
            getattr(settings, 'BREVO_TEST_REDIRECT_EMAIL', None)
            or getattr(settings, 'ADMIN_EMAIL', None)
            or self.test_redirect_email
        )

        sent_count = 0
        try:
            client = Brevo(api_key=self.api_key)
        except Exception as e:
            logger.error(f"Failed to initialize Brevo client: {e}", exc_info=True)
            if not self.fail_silently:
                raise e
            return 0

        for message in email_messages:
            try:
                original_to = list(message.to)
                if not original_to:
                    continue

                # Resolve sender
                from_email = message.from_email or getattr(settings, 'DEFAULT_FROM_EMAIL', '')
                sender_name, sender_email = parseaddr(from_email)
                sender = SendTransacEmailRequestSender(
                    email=sender_email,
                    name=sender_name if sender_name else None
                )

                subject = message.subject

                # TEST MODE: redirect all emails to the admin/test address
                if test_mode and test_redirect_email:
                    to_emails = [test_redirect_email]
                    original_to_str = ', '.join(original_to)
                    subject = f"[TEST → {original_to_str}] {subject}"
                    logger.info(
                        f"[BREVO TEST MODE] Redirecting email originally for "
                        f"{original_to_str} to {test_redirect_email}"
                    )
                else:
                    to_emails = original_to

                # Map TO recipients
                to_list = []
                for email in to_emails:
                    name, email_addr = parseaddr(email)
                    to_list.append(
                        SendTransacEmailRequestToItem(
                            email=email_addr,
                            name=name if name else None
                        )
                    )

                kwargs_params = {
                    "sender": sender,
                    "to": to_list,
                    "subject": subject,
                }

                # Add CC if present (skip in test mode)
                if message.cc and not test_mode:
                    cc_list = []
                    for email in message.cc:
                        name, email_addr = parseaddr(email)
                        cc_list.append(
                            SendTransacEmailRequestCcItem(
                                email=email_addr,
                                name=name if name else None
                            )
                        )
                    kwargs_params["cc"] = cc_list

                # Add BCC if present (skip in test mode)
                if message.bcc and not test_mode:
                    bcc_list = []
                    for email in message.bcc:
                        name, email_addr = parseaddr(email)
                        bcc_list.append(
                            SendTransacEmailRequestBccItem(
                                email=email_addr,
                                name=name if name else None
                            )
                        )
                    kwargs_params["bcc"] = bcc_list

                # Add Reply-To if present
                if message.reply_to:
                    reply_name, reply_email = parseaddr(message.reply_to[0])
                    kwargs_params["reply_to"] = SendTransacEmailRequestReplyTo(
                        email=reply_email,
                        name=reply_name if reply_name else None
                    )

                # Determine content type
                is_html = getattr(message, 'content_subtype', '') == 'html'

                # Check for HTML alternatives (multipart messages)
                html_content = None
                if hasattr(message, 'alternatives') and message.alternatives:
                    for alt_content, alt_mime in message.alternatives:
                        if alt_mime == 'text/html':
                            html_content = alt_content
                            break

                if is_html:
                    kwargs_params["html_content"] = message.body
                elif html_content:
                    kwargs_params["html_content"] = html_content
                    kwargs_params["text_content"] = message.body
                else:
                    kwargs_params["text_content"] = message.body

                # Support attachments (Base64 encoded)
                if message.attachments:
                    attachment_list = []
                    for attachment in message.attachments:
                        if isinstance(attachment, tuple):
                            filename = attachment[0]
                            content = attachment[1]
                            if isinstance(content, bytes):
                                file_content = base64.b64encode(content).decode("utf-8")
                            else:
                                file_content = base64.b64encode(
                                    str(content).encode("utf-8")
                                ).decode("utf-8")
                            attachment_list.append(
                                SendTransacEmailRequestAttachmentItem(
                                    name=filename,
                                    content=file_content,
                                )
                            )
                        else:
                            logger.warning(
                                f"Skipping unsupported attachment format type: {type(attachment)}"
                            )
                    if attachment_list:
                        kwargs_params["attachment"] = attachment_list

                # Send via SDK client
                client.transactional_emails.send_transac_email(**kwargs_params)
                sent_count += 1

            except Exception as e:
                logger.error(f"Failed to send email via Brevo: {e}", exc_info=True)
                if not self.fail_silently:
                    raise e

        return sent_count
