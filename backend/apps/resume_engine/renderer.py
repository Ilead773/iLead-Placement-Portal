# apps/resume_engine/renderer.py
"""
Resume Rendering — Canonical JSON → HTML / PDF

Renders canonical resume data using a template's HTML/CSS
into final output formats (HTML string, PDF bytes).
"""

import logging
from django.template import Template, Context, Library
from django.template.base import TextNode

logger = logging.getLogger(__name__)

# Register a custom filter for date formatting
_register = Library()

@_register.filter(name='month_year')
def month_year_filter(value):
    """Convert YYYY-MM or YYYY-MM-DD to 'Mon YYYY' e.g. '2025-12' → 'Dec 2025'."""
    if not value:
        return value
    try:
        parts = str(value).split('-')
        if len(parts) >= 2:
            month_map = {
                '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
                '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
                '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
            }
            return f"{month_map.get(parts[1], parts[1])} {parts[0]}"
    except Exception:
        pass
    return value



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
            
            # Deep copy and format dates for clean display
            import copy
            
            experience_list = copy.deepcopy(canonical_json.get('experience', []))
            for exp in experience_list:
                dur = exp.get('duration', {})
                if dur:
                    if dur.get('start'):
                        dur['start_formatted'] = month_year_filter(dur['start'])
                    if dur.get('end'):
                        dur['end_formatted'] = month_year_filter(dur['end'])
                if exp.get('start_date'):
                    exp['start_date_formatted'] = month_year_filter(exp['start_date'])
                if exp.get('end_date'):
                    exp['end_date_formatted'] = month_year_filter(exp['end_date'])

            education_list = copy.deepcopy(canonical_json.get('education', []))
            for edu in education_list:
                if edu.get('graduation_date'):
                    edu['graduation_date_formatted'] = month_year_filter(edu['graduation_date'])

            certifications_list = copy.deepcopy(canonical_json.get('certifications', []))
            for cert in certifications_list:
                if cert.get('date'):
                    cert['date_formatted'] = month_year_filter(cert.get('date'))

            projects_list = copy.deepcopy(canonical_json.get('projects', []))
            for proj in projects_list:
                if proj.get('date'):
                    proj['date_formatted'] = month_year_filter(proj.get('date'))

            context = Context({
                'resume': canonical_json,
                'personal': canonical_json.get('personal', {}),
                'skills': canonical_json.get('skills', []),
                'experience': experience_list,
                'projects': projects_list,
                'education': education_list,
                'certifications': certifications_list,
                'summary': canonical_json.get('professional_summary', ''),
                'achievements': canonical_json.get('achievements', []),
                'extra_curricular': canonical_json.get('extra_curricular', []),
                'strengths': canonical_json.get('strengths', []),
                'languages': canonical_json.get('languages', []),
                'institute_logo': canonical_json.get('personal', {}).get('institute_logo') or canonical_json.get('personal', {}).get('logo', ''),
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
