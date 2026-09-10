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
            import re
            html_tpl = template.html_template
            if html_tpl:
                html_tpl = re.sub(r'<footer\s+class=["\']resume-footer["\'][^>]*>.*?</footer>', '', html_tpl, flags=re.DOTALL | re.IGNORECASE)
            django_template = Template(html_tpl)
            
            # Deep copy and format dates for clean display
            import copy
            
            raw_experience = copy.deepcopy(canonical_json.get('experience', []))
            experience_list = []
            for exp in raw_experience:
                if not isinstance(exp, dict):
                    continue
                has_content = any([
                    bool(str(exp.get('company', '')).strip()),
                    bool(str(exp.get('position', '')).strip()),
                    bool(str(exp.get('description', '')).strip()),
                    bool(exp.get('achievements'))
                ])
                if not has_content:
                    continue

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

                # If achievements (bullet points) is not set but description has multiple lines or bullets, parse into points
                if not exp.get('achievements') and exp.get('description'):
                    raw_lines = [l.strip().lstrip('•-* ').strip() for l in str(exp['description']).split('\n') if l.strip()]
                    if len(raw_lines) > 1:
                        exp['achievements'] = raw_lines

                experience_list.append(exp)

            raw_education = copy.deepcopy(canonical_json.get('education', []))
            education_list = []
            for edu in raw_education:
                if not isinstance(edu, dict):
                    continue
                has_edu = any([
                    bool(str(edu.get('degree', '')).strip()),
                    bool(str(edu.get('institution', '')).strip()),
                    bool(str(edu.get('field', '')).strip())
                ])
                if not has_edu:
                    continue
                if edu.get('graduation_date'):
                    edu['graduation_date_formatted'] = month_year_filter(edu['graduation_date'])
                education_list.append(edu)

            raw_certifications = copy.deepcopy(canonical_json.get('certifications', []))
            certifications_list = []
            for cert in raw_certifications:
                if not isinstance(cert, dict):
                    continue
                if not cert.get('name') or not str(cert.get('name', '')).strip():
                    continue
                if cert.get('date'):
                    cert['date_formatted'] = month_year_filter(cert.get('date'))
                certifications_list.append(cert)

            raw_projects = copy.deepcopy(canonical_json.get('projects', []))
            projects_list = []
            for proj in raw_projects:
                if not isinstance(proj, dict):
                    continue
                has_proj = any([
                    bool(str(proj.get('title', '')).strip()),
                    bool(str(proj.get('description', '')).strip()),
                    bool(proj.get('highlights')),
                    bool(proj.get('technologies'))
                ])
                if not has_proj:
                    continue
                if proj.get('date'):
                    proj['date_formatted'] = month_year_filter(proj.get('date'))

                # If highlights (bullet points) is not set but description has multiple lines or bullets, parse into points
                if not proj.get('highlights') and proj.get('description'):
                    raw_lines = [l.strip().lstrip('•-* ').strip() for l in str(proj['description']).split('\n') if l.strip()]
                    if len(raw_lines) > 1:
                        proj['highlights'] = raw_lines

                projects_list.append(proj)

            # Sanitize Skills (Never pass empty dictionary groups that render as Python dict literals)
            raw_skills = canonical_json.get('skills', [])
            skills_list = []
            for sg in raw_skills:
                if isinstance(sg, dict):
                    items = [str(i).strip() for i in sg.get('items', []) if i and str(i).strip()]
                    if items:
                        skills_list.append({'category': sg.get('category', 'Technical Skills'), 'items': items})
                elif isinstance(sg, str) and sg.strip():
                    skills_list.append(sg.strip())

            # Sanitize Achievements
            raw_achievements = canonical_json.get('achievements', [])
            achievements_list = []
            for ach in raw_achievements:
                if isinstance(ach, dict):
                    if ach.get('title') or ach.get('description'):
                        achievements_list.append(ach)
                elif isinstance(ach, str) and ach.strip():
                    achievements_list.append({'title': ach.strip()})

            # Sanitize Extracurricular Activities
            raw_extra = canonical_json.get('extra_curricular', [])
            extra_list = [str(x).strip() for x in raw_extra if x and str(x).strip()]

            # Sanitize Languages and Strengths
            raw_languages = canonical_json.get('languages', [])
            languages_list = [str(l).strip() for l in raw_languages if l and str(l).strip()]

            raw_strengths = canonical_json.get('strengths', [])
            strengths_list = [str(s).strip() for s in raw_strengths if s and str(s).strip()]

            context = Context({
                'resume': canonical_json,
                'personal': canonical_json.get('personal', {}),
                'skills': skills_list,
                'experience': experience_list,
                'projects': projects_list,
                'education': education_list,
                'certifications': certifications_list,
                'department': canonical_json.get('department', ''),
                'summary': canonical_json.get('professional_summary', ''),
                'achievements': achievements_list,
                'extra_curricular': extra_list,
                'strengths': strengths_list,
                'languages': languages_list,
                'institute_logo': canonical_json.get('personal', {}).get('institute_logo') or canonical_json.get('personal', {}).get('logo', ''),
            })
            body_html = django_template.render(context)

            # Screen preview styling so iframe renders with authentic A4 margins and footer in flow
            screen_styles = """
    @media screen {
        html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            width: 100% !important;
            box-sizing: border-box !important;
            overflow-x: hidden !important;
        }
        .resume-container {
            box-sizing: border-box !important;
            padding: 14mm 16mm 18mm 16mm !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: 100% !important;
            background: #ffffff !important;
        }
        .resume-footer {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
        }
    }
            """

            # Wrap in full HTML document with CSS
            full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{canonical_json.get('personal', {}).get('name', 'Resume')}</title>
    <style>
{template.css_styles}
{screen_styles}
.resume-footer {{ display: none !important; }}
    </style>
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
            import re
            custom_html = re.sub(r'<footer\s+class=["\']resume-footer["\'][^>]*>.*?</footer>', '', custom_html, flags=re.DOTALL | re.IGNORECASE)
            # If custom_html is provided, wrap it in the template's CSS styles
            # so that formatting is preserved in the PDF.
            html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
{template.css_styles}
.resume-footer {{ display: none !important; }}
    </style>
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
