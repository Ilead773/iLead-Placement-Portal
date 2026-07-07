# backend/Dockerfile
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Install system dependencies required by WeasyPrint, psycopg2, Pillow, cffi
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libharfbuzz0b \
    libpangoft2-1.0-0 \
    libffi-dev \
    libjpeg-dev \
    libopenjp2-7-dev \
    libglib2.0-0 \
    libcairo2 \
    libpq5 \
    fontconfig \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project source
COPY . .

# Create media directory for local file storage
RUN mkdir -p /app/media/resumes /app/media/profile_pictures /app/media/uploads

# Collect static files (WhiteNoise serves them at runtime)
# Supply dummy environment variables during the build phase so collectstatic succeeds
RUN SECRET_KEY=dummy-key-for-collectstatic-only DATABASE_URL=sqlite:////tmp/dummy.db python manage.py collectstatic --noinput

EXPOSE 8000

# Railway injects $PORT. Gunicorn binds to it.
# Workers set to 2 to stay within Railway's free-tier memory (512MB)
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-8000} --workers 2 --threads 4 --timeout 120 config.wsgi:application"]
