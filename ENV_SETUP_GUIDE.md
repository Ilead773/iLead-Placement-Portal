# Environment Setup Guide

## Backend Setup

1. Create virtual environment:
```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate  # Windows
source venv/bin/activate  # Mac/Linux
```

2. Copy .env file:
```bash
cp .env.example .env
```

3. Edit `.env` with your settings:
- Change `SECRET_KEY` to a strong random key
- Add your database URL
- Add Redis URL
- Add OpenAI API key
- Add email settings

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Run migrations:
```bash
python manage.py migrate
```

6. Create superuser:
```bash
python manage.py createsuperuser
```

## Frontend Setup

1. Navigate to frontend:
```bash
cd frontend
```

2. Create .env file:
```bash
cp .env.example .env
```

3. Edit `.env` with your API URL:
```
VITE_API_URL=http://localhost:8000/api/v1
```

4. Install dependencies:
```bash
npm install
```

## Environment Variables Explained

### Backend (.env)
- `DEBUG`: Set to False in production
- `SECRET_KEY`: Generate strong random key for production
- `DATABASE_URL`: PostgreSQL recommended for production
- `REDIS_URL`: Required for Celery and caching
- `OPENAI_API_KEY`: For AI features
- `EMAIL_*`: Configure for sending emails

### Frontend (.env.*)
- `VITE_API_URL`: Backend API endpoint
- `.env.development`: Local development
- `.env.staging`: Staging environment
- `.env.production`: Production build

## Production Checklist

- [ ] Change DEBUG=False
- [ ] Generate new SECRET_KEY
- [ ] Use PostgreSQL database
- [ ] Set strong database password
- [ ] Configure Redis
- [ ] Add production CORS hosts
- [ ] Configure email backend (not console)
- [ ] Set ALLOWED_HOSTS in backend
- [ ] Build frontend: `npm run build`
