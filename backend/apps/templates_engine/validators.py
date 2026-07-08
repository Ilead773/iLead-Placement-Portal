# apps/templates_engine/validators.py
"""
Layer 11: Template Security — HTML Sanitization & CSS Validation

Prevents XSS, script injection, and malicious content in admin-uploaded
resume templates. All templates pass through sanitization before save.
"""

import re
import logging

logger = logging.getLogger(__name__)

ALLOWED_TAGS = [
    'p', 'br', 'strong', 'em', 'u', 'b', 'i',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'table', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot',
    'div', 'span', 'section', 'header', 'footer', 'article', 'aside',
    'img', 'a', 'hr',
]

ALLOWED_ATTRIBUTES = {
    '*': ['class', 'id', 'style'],
    'a': ['href', 'title', 'target'],
    'img': ['src', 'alt', 'width', 'height'],
}

DANGEROUS_CSS_PATTERNS = [
    r'expression\s*\(',
    r'javascript\s*:',
    r'@import\s+url\s*\(',
    r'behavior\s*:',
    r'-moz-binding\s*:',
    r'vbscript\s*:',
]

DANGEROUS_HTML_PATTERNS = [
    r'<\s*script',
    r'<\s*iframe',
    r'<\s*embed',
    r'<\s*object',
    r'<\s*applet',
    r'<\s*form',
    r'<\s*input',
    r'<\s*textarea',
    r'<\s*select',
    r'on\w+\s*=',  # onclick, onload, onerror, etc.
    r'javascript\s*:',
    r'data\s*:text/html',
]


class TemplateSecurityValidator:
    """
    Sanitize and validate template HTML/CSS.

    Removes dangerous content while preserving layout tags.
    """

    @staticmethod
    def sanitize_html(html_content):
        """
        Clean HTML template of dangerous content.

        Removes: script tags, event handlers, javascript: URIs,
        iframes, embeds, forms, and other dangerous elements.
        """
        if not html_content:
            return html_content

        # Enforce bleach as a hard dependency for production-grade security
        try:
            import bleach
        except ImportError:
            logger.error("bleach package is not installed! Aborting HTML sanitization for safety.")
            raise ImportError("bleach is required for secure HTML template sanitization. Please install bleach.")

        # Temporarily extract <table>...</table> blocks to prevent HTML5 parser from hoisting Django template loops
        tables = []
        def replace_table(match):
            tables.append(match.group(0))
            return f"__TABLE_PLACEHOLDER_{len(tables)-1}__"

        placeholder_html = re.sub(r'<table\b[^>]*>.*?</table>', replace_table, html_content, flags=re.DOTALL | re.IGNORECASE)

        cleaned = bleach.clean(
            placeholder_html,
            tags=ALLOWED_TAGS,
            attributes=ALLOWED_ATTRIBUTES,
            protocols=['http', 'https', 'mailto', 'data'],
            strip=True,
        )

        # Restore <table>...</table> blocks and validate their security
        for idx, table_html in enumerate(tables):
            # Verify no dangerous elements are inside the table
            for pattern in DANGEROUS_HTML_PATTERNS:
                if re.search(pattern, table_html, re.IGNORECASE):
                    raise ValueError(f"Dangerous HTML pattern detected in table: {pattern}")
            
            cleaned = cleaned.replace(f"__TABLE_PLACEHOLDER_{idx}__", table_html)

        return cleaned

    @staticmethod
    def validate_css(css_content):
        """
        Validate CSS for dangerous patterns.

        Raises ValueError if dangerous patterns detected.
        """
        if not css_content:
            return css_content

        for pattern in DANGEROUS_CSS_PATTERNS:
            if re.search(pattern, css_content, re.IGNORECASE):
                raise ValueError(
                    f"Dangerous CSS pattern detected: {pattern}"
                )

        return css_content

    @classmethod
    def validate_template(cls, html_content, css_content):
        """
        Full template validation — sanitize HTML + validate CSS.

        Returns (sanitized_html, validated_css).
        Raises ValueError on dangerous CSS or templates with banned tags.
        """
        if html_content:
            # Check for banned template tags to prevent SSTI (Server-Side Template Injection)
            # Banned tags: extends, include, load, ssi, debug
            banned_tags_pattern = r'{%\s*(load|include|extends|ssi|debug)\b'
            if re.search(banned_tags_pattern, html_content, re.IGNORECASE):
                raise ValueError("Resume templates cannot use 'load', 'include', 'extends', 'ssi', or 'debug' tags for security reasons.")

        sanitized_html = cls.sanitize_html(html_content)
        validated_css = cls.validate_css(css_content)
        return sanitized_html, validated_css
