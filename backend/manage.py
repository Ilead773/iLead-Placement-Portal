#!/usr/bin/env python
# backend/manage.py
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    try:
        import dotenv
        dotenv.load_dotenv()
    except ImportError:
        pass
    
    # Clean surrounding quotes from all environment variables (handles pasted values in Railway/Render)
    for key, value in list(os.environ.items()):
        if isinstance(value, str):
            val_stripped = value.strip()
            if (val_stripped.startswith('"') and val_stripped.endswith('"')) or \
               (val_stripped.startswith("'") and val_stripped.endswith("'")):
                os.environ[key] = val_stripped[1:-1].strip()

    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
