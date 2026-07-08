# apps/resume_engine/normalizer.py
"""
Layer 1: Resume Normalization to Canonical JSON Format

Converts ANY resume source into a unified canonical format:
- Profile data → canonical JSON
- Uploaded PDF text → canonical JSON
- Template data → canonical JSON

This is THE single source of truth for all resume operations.
"""

import logging
import re
from datetime import date

logger = logging.getLogger(__name__)

# Canonical schema definition
CANONICAL_SCHEMA = {
    "personal": {
        "name": "", "email": "", "phone": "", "location": "",
        "linkedin": "", "github": "", "portfolio": "", "photo": "",
    },
    "professional_summary": "",
    "skills": [],        # [{"category": str, "items": [str]}]
    "experience": [],    # [{"company","position","duration","description","achievements"}]
    "projects": [],      # [{"title","description","technologies","link","date"}]
    "education": [],     # [{"institution","degree","field","graduation_date","gpa","honors"}]
    "certifications": [], # [{"name","issuer","date","credential_url"}]
    "achievements": [],
    "extra_curricular": [], # list of strings
    "strengths": [],        # list of strings
    "languages": [],        # list of strings
    "metadata": {
        "source_type": "profile",
        "version": 1,
        "normalized_at": None,
    },
}

class ResumeNormalizer:
    """Convert any resume source to canonical JSON format."""

    def normalize(self, data, source_type='profile'):
        if source_type == 'profile':
            return self.normalize_from_profile(data)
        elif source_type == 'uploaded':
            return self._normalize_uploaded_text(data)
        elif source_type == 'file':
            return self.normalize_from_file(data)
        else:
            raise ValueError(f"Unknown source type: {source_type}")

    def normalize_from_file(self, file_or_path):
        """Extract text from PDF and normalize it."""
        text = ""
        try:
            import PyPDF2
            if isinstance(file_or_path, (str, bytes)):
                with open(file_or_path, 'rb') as f:
                    reader = PyPDF2.PdfReader(f)
                    for page in reader.pages:
                        text += page.extract_text() + "\n"
            else:
                reader = PyPDF2.PdfReader(file_or_path)
                for page in reader.pages:
                    text += page.extract_text() + "\n"
            
            logger.info(f"Extracted {len(text)} characters from resume.")
            return self._normalize_uploaded_text(text)
        except Exception as e:
            logger.error(f"Failed to extract text: {e}")
            raise

    def normalize_from_profile(self, profile):
        from apps.profiles.models import StudentProfile
        canonical = self._empty_canonical()
        
        photo_url = ''
        try:
            if profile.profile_picture:
                import os
                import base64
                try:
                    with profile.profile_picture.open('rb') as f:
                        encoded = base64.b64encode(f.read()).decode('utf-8')
                    ext = os.path.splitext(profile.profile_picture.name)[1].lower().replace('.', '')
                    if ext == 'jpg': ext = 'jpeg'
                    if not ext: ext = 'png'
                    photo_url = f"data:image/{ext};base64,{encoded}"
                except Exception as e:
                    logger.error(f"Error reading profile picture file: {e}")
                    photo_url = ''
            elif profile.profile_picture and hasattr(profile.profile_picture, 'url'):
                photo_url = profile.profile_picture.url
        except Exception as e:
            logger.error(f"Error processing profile picture: {e}")
            photo_url = ''

        canonical['personal'] = {
            'name': profile.student.name,
            'email': profile.student.email,
            'phone': profile.phone or '',
            'location': profile.location or '',
            'linkedin': profile.linkedin or '',
            'github': profile.github or '',
            'portfolio': profile.portfolio or '',
            'photo': photo_url,
        }
        canonical['professional_summary'] = profile.professional_summary or ''
        skills_by_category = {}
        for skill in profile.skills.all():
            cat = skill.category
            if cat not in skills_by_category: skills_by_category[cat] = []
            clean_name = re.sub(r'^[•\-\*–\s]+', '', skill.name).strip()
            skills_by_category[cat].append(clean_name)

        canonical['skills'] = [{'category': cat, 'items': items} for cat, items in skills_by_category.items()]
        canonical['languages'] = profile.languages_known if profile.languages_known else skills_by_category.get('Language', [])
        canonical['strengths'] = profile.strengths if profile.strengths else skills_by_category.get('Soft Skill', [])
        canonical['extra_curricular'] = [act.title for act in profile.extracurricular_activities.all()]
        
        canonical['experience'] = [
            {
                'company': re.sub(r'^[•\-\*–\s]+', '', exp.company).strip(),
                'position': re.sub(r'^[•\-\*–\s]+', '', exp.position).strip(),
                'duration': {
                    'start': exp.start_date.isoformat() if exp.start_date else None,
                    'end': exp.end_date.isoformat() if exp.end_date else None,
                    'current': exp.is_current,
                },
                'description': exp.description,
                'achievements': [re.sub(r'^[•\-\*–\s]+', '', ach).strip() for ach in (exp.achievements or [])],
            }
            for exp in profile.experiences.all()
        ]
        
        canonical['projects'] = [
            {
                'title': re.sub(r'^[•\-\*–\s]+', '', proj.title).strip(),
                'description': proj.description,
                'technologies': proj.technologies or [],
                'link': proj.link or '',
                'date': proj.date.isoformat() if proj.date else None,
            }
            for proj in profile.projects.all()
        ]

        canonical['education'] = [
            {
                'institution': re.sub(r'^[•\-\*–\s]+', '', edu.institution).strip(),
                'degree': re.sub(r'^[•\-\*–\s]+', '', edu.degree).strip(),
                'field': edu.field or '',
                'graduation_date': edu.graduation_date.isoformat() if edu.graduation_date else None,
                'gpa': edu.gpa,
                'honors': edu.honors or '',
            }
            for edu in profile.education_entries.all()
        ]

        canonical['certifications'] = [
            {
                'name': re.sub(r'^[•\-\*–\s]+', '', cert.name).strip(),
                'issuer': cert.issuer,
                'date': cert.date.isoformat() if cert.date else None,
                'credential_url': cert.credential_url or '',
            }
            for cert in profile.certifications.all()
        ]

        canonical['achievements'] = [
            {
                'title': re.sub(r'^[•\-\*–\s]+', '', ach.title).strip(),
                'issuer': ach.issuer or '',
                'date': ach.date.isoformat() if ach.date else None,
                'description': ach.description or '',
            }
            for ach in profile.achievements.all()
        ]

        from django.utils import timezone
        canonical['metadata'] = {
            'source_type': 'profile',
            'version': 1,
            'normalized_at': timezone.now().isoformat(),
        }
        return canonical

    def _normalize_uploaded_text(self, text):
        """Advanced Fuzzy Parser for unstructured resume text."""
        if not text: return self._empty_canonical()
        
        canonical = self._empty_canonical()
        text_clean = re.sub(r'\s+', ' ', text) # Collapse whitespace for easier regex
        
        # 1. Personal Info Extraction
        email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
        if email_match: canonical['personal']['email'] = email_match.group(0)
        
        phone_match = re.search(r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text)
        if phone_match: canonical['personal']['phone'] = phone_match.group(0)

        # 2. Section Segmentation using Fuzzy Markers
        sections = {
            'summary': ['summary', 'profile', 'objective', 'about me'],
            'experience': ['experience', 'work history', 'employment', 'background'],
            'education': ['education', 'academic', 'qualifications'],
            'skills': ['skills', 'technical skills', 'expertise', 'capabilities'],
            'projects': ['projects', 'key projects', 'featured work']
        }
        
        content = {}
        found_markers = []
        
        # Find start positions of all sections
        for sec, markers in sections.items():
            for m in markers:
                match = re.search(rf'\b{m}\b', text_clean, re.IGNORECASE)
                if match:
                    found_markers.append((match.start(), sec))
                    break
        
        found_markers.sort()
        
        # Split text into sections based on markers
        for i in range(len(found_markers)):
            start, sec = found_markers[i]
            end = found_markers[i+1][0] if i+1 < len(found_markers) else len(text_clean)
            content[sec] = text_clean[start:end].strip()

        # 3. Clean up the Summary (remove the header word)
        if 'summary' in content:
            raw = content['summary']
            canonical['professional_summary'] = re.sub(rf'^({"|".join(sections["summary"])})\s*', '', raw, flags=re.IGNORECASE)
        
        # 4. Clean up Skills
        if 'skills' in content:
            raw = content['skills']
            skills_text = re.sub(rf'^({"|".join(sections["skills"])})\s*', '', raw, flags=re.IGNORECASE)
            # Split by dots, commas, or bullets
            items = [s.strip() for s in re.split(r'[•,·|]|\s{2,}', skills_text) if s.strip()]
            canonical['skills'] = [{'category': 'Technical Skills', 'items': items[:20]}]

        # 5. Experience (Rough splitting)
        if 'experience' in content:
            raw = content['experience']
            exp_text = re.sub(rf'^({"|".join(sections["experience"])})\s*', '', raw, flags=re.IGNORECASE)
            # Simple heuristic: Split by years
            entries = re.split(r'(\d{4})', exp_text)
            if len(entries) > 1:
                # Basic reconstruct
                canonical['experience'] = [{
                    'company': 'Experience Entry',
                    'position': entries[0][:50].strip(),
                    'description': " ".join(entries[1:5]).strip(),
                    'duration': {'start': entries[1] if len(entries)>1 else None, 'current': True}
                }]
            else:
                canonical['experience'] = [{'company': 'Extracted Experience', 'description': exp_text[:500]}]

        return canonical

    def _empty_canonical(self):
        import copy
        return copy.deepcopy(CANONICAL_SCHEMA)
