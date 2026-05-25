# Deploy iLEAD Placement Portal on Render

## 1) Push latest code
Make sure this repository (including `render.yaml`) is pushed to GitHub.

## 2) Create services using Blueprint
1. In Render dashboard, click `New +` -> `Blueprint`.
2. Connect your GitHub repo.
3. Render will detect `render.yaml` and create:
   - `ilead-postgres` (PostgreSQL)
   - `ilead-backend` (Django API)
   - `ilead-frontend` (Vite static app)

## 3) Update backend environment variables
Open `ilead-backend` -> `Environment`, then set:

- `ALLOWED_HOSTS` = your backend domain (example: `ilead-backend.onrender.com`)
- `CORS_ALLOWED_ORIGINS` = your frontend full URL (example: `https://ilead-frontend.onrender.com`)
- `FRONTEND_URL` = your frontend full URL
- `EMAIL_HOST_USER` = your email user
- `EMAIL_HOST_PASSWORD` = your email app password
- `DEFAULT_FROM_EMAIL` = sender email
- `CELERY_BROKER_URL` and `CELERY_RESULT_BACKEND` (only if you deploy Celery + Redis)
- `OPENAI_API_KEY` / `GROQ_API_KEY` / job API keys if features require them

Keep:
- `DEBUG=False`
- `DATABASE_URL` already auto-wired from Render PostgreSQL

## 4) Update frontend environment variable
Open `ilead-frontend` -> `Environment`:

- `VITE_API_URL` = `https://<your-backend-domain>/api/v1`

Then redeploy frontend.

## 5) Deploy order
1. Deploy backend first (it runs migrations automatically).
2. After backend is live, deploy frontend.

## 6) Verify
1. Open backend URL + `/admin/` and `/api/v1/` endpoints.
2. Open frontend URL and test login/API-driven pages.
3. Check Render logs for missing env vars if any page fails.

## Notes
- Static files are served by WhiteNoise in production.
- The project now reads database config from `DATABASE_URL` in Render.
- Email credentials are now environment-based (no hardcoded password in code).
