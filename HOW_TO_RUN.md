# How to Run iLEAD Placement Portal

This guide provides the commands to run the Frontend, Backend, and Celery worker locally on your machine. You will need **three separate terminal windows** to run these services simultaneously.

---

### 1. Run the Backend (Django)

In your **first terminal**, start the Django backend server:

```powershell
# Navigate to the backend directory
cd backend

# Activate your virtual environment (if you are using one)
.\venv\Scripts\Activate

# Install dependencies (if not already installed)
pip install -r requirements.txt

# Run the Django development server
python manage.py runserver
```

The backend will be available at `http://127.0.0.1:8000/`.

---

### 2. Run the Frontend (React/Vite)

In your **second terminal**, start the frontend development server:

```powershell
# Navigate to the frontend directory
cd frontend

# Install dependencies (if you haven't already)
npm install

# Start the frontend server
npm run dev
# (or use 'npm start' if this is a Create React App project)
```

The frontend will typically be available at `http://localhost:5173/` or `http://localhost:3000/`.

---

### 3. Run Celery (Background Tasks for Resume PDF Generation)

Celery is required to generate the PDF resumes asynchronously. Since you are on Windows, you must use the `--pool=solo` flag.

*Note: Celery requires a message broker like Redis. Make sure Redis is installed and running on your machine.*

In your **third terminal**, start the Celery worker:

```powershell
# Navigate to the backend directory
cd backend

# Activate your virtual environment
venv\Scripts\Activate

# Start the Celery worker
celery -A config worker -l info --pool=solo
```

You should see logs indicating that Celery has successfully connected to the broker (e.g., Redis) and is ready to process tasks like `generate_resume_pdf`.

---

### Alternative: Run Everything with Docker

If you prefer to run everything in containers without managing separate terminals, you can use the provided `docker-compose.yml` file:

```powershell
# Make sure Docker Desktop is running, then execute:
docker-compose up --build
```
