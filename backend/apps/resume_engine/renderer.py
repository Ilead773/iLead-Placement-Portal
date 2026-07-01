# apps/resume_engine/renderer.py
"""
Resume Rendering — Canonical JSON → HTML / PDF

Renders canonical resume data using a template's HTML/CSS
into final output formats (HTML string, PDF bytes).
"""

import logging
from django.template import Template, Context

logger = logging.getLogger(__name__)


class ResumeRenderer:
    """Render canonical resume JSON to HTML or PDF output."""

    def render_html(self, canonical_json, template):
        """
        Render canonical JSON to HTML using the template.

        Args:
            canonical_json: dict — canonical resume data
            template: ResumeTemplate instance (has html_template + css_styles)

        Returns:
            str — fully rendered HTML document
        """
        try:
            logger.info("Rendering resume HTML")
            django_template = Template(template.html_template)
            
            context = Context({
                'resume': canonical_json,
                'personal': canonical_json.get('personal', {}),
                'skills': canonical_json.get('skills', []),
                'experience': canonical_json.get('experience', []),
                'projects': canonical_json.get('projects', []),
                'education': canonical_json.get('education', []),
                'certifications': canonical_json.get('certifications', []),
                'summary': canonical_json.get('professional_summary', ''),
                'achievements': canonical_json.get('achievements', []),
                'extra_curricular': canonical_json.get('extra_curricular', []),
                'strengths': canonical_json.get('strengths', []),
                'languages': canonical_json.get('languages', []),
            })
            body_html = django_template.render(context)

            # Wrap in full HTML document with CSS
            full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{canonical_json.get('personal', {}).get('name', 'Resume')}</title>
    <style>{template.css_styles}</style>
</head>
<body>
{body_html}
</body>
</html>"""
            return full_html

        except Exception as exc:
            logger.error(f"HTML rendering failed: {exc}")
            raise

    def render_pdf(self, canonical_json, template, custom_html=None):
        """
        Render canonical JSON or custom_html to PDF bytes.

        Uses weasyprint if available, falls back to None.
        """
        if custom_html is not None:
            print(f"DEBUG RENDER: Using custom_html (length: {len(custom_html)})")
            # If custom_html is provided, wrap it in the template's CSS styles
            # so that formatting is preserved in the PDF.
            html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>{template.css_styles}</style>
</head>
<body>
<div class="resume-container">
{custom_html}
</div>
</body>
</html>"""
        else:
            html = self.render_html(canonical_json, template)

        try:
            from weasyprint import HTML
            pdf_bytes = HTML(string=html).write_pdf()
            logger.info("PDF rendered via weasyprint")
            return pdf_bytes
        except ImportError:
            logger.warning(
                "weasyprint not installed. PDF generation unavailable. "
                "Install with: pip install weasyprint"
            )
            return None
        except Exception as exc:
            logger.error(f"PDF rendering failed: {exc}")
            raise
