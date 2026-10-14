# Rezumio — AI Resume Customizer

Rezumio is a full-stack application that tailors resumes to job descriptions using Google Gemini. Upload a PDF or DOCX resume, review the customized content and ATS-oriented analysis, and export your resume.

## Features

- AI-powered, role-specific resume customization.
- PDF and DOCX parsing.
- ATS keyword matching and skill-gap analysis.
- Editable resume and cover letter generation.
- PDF, DOCX, and TXT exports.
- Authentication and saved resume versions using Supabase.
- Resume fact-preservation safeguards.

## Tech Stack

**Frontend:** Next.js, React, TypeScript, Tailwind CSS

**Backend:** Python, FastAPI

**AI:** Google Gemini API

**Database & Auth:** Supabase PostgreSQL and Supabase Auth

**Deployment:** Vercel (frontend), Render (backend)

## Project Structure

```text
Resume/
├── frontend/       # Next.js application
├── backend/        # FastAPI application
├── supabase/       # Database migrations
├── docs/           # Project audit and cleanup reports
├── render.yaml     # Render deployment configuration
└── README.md
```

## Prerequisites

- Node.js and npm
- Python 3.11+
- Gemini API key
- Supabase project (for cloud authentication and persistence)

## Local Setup

### 1. Backend

```bash
cd backend
python -m venv .venv
```

Activate the environment:

```bash
# Windows PowerShell
.venv\Scripts\Activate.ps1

# macOS/Linux
source .venv/bin/activate
```

Install dependencies and configure the environment:

```bash
pip install -r requirements.txt
```

Copy `backend/.env.example` to `backend/.env` and add the required configuration.

Start the API:

```bash
python -m uvicorn app.main:app --reload --port 8000
```

API documentation: `http://localhost:8000/docs`

### 2. Frontend

Open another terminal:

```bash
cd frontend
npm install
```

Copy `frontend/.env.example` to `frontend/.env.local` and configure:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Fill in the Supabase values if required by your configuration.

Start the frontend:

```bash
npm run dev
```

Open `http://localhost:3000`.

### 3. Database

For Supabase persistence, create a project and apply the SQL migrations in `supabase/migrations/` using the Supabase SQL Editor. Configure the required backend credentials and verify Row Level Security policies.

## Testing

Backend:

```bash
cd backend
python -m pytest
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

## Deployment

**Vercel — Frontend**
1. Import the GitHub repository.
2. Set the root directory to `frontend`.
3. Configure `NEXT_PUBLIC_API_URL` with your deployed Render backend URL.
4. Add the required Supabase public variables, if used, and deploy.

**Render — Backend**
1. Deploy the backend using the repository's Render configuration or a Python Web Service.
2. Configure the backend root directory and startup command.
3. Add the required Gemini and Supabase environment variables.
4. Set `CORS_ORIGINS` to include your actual Vercel frontend URL.
5. Deploy and verify `/api/health`.

**Live Demo:** https://rezumio.vercel.app/

## AI Tools

- **Google Gemini:** Resume customization and job-description alignment.

## Security

- Never commit `.env` files, API keys, or database credentials.
- Keep Supabase service-role keys on the backend.
- Validate uploaded files and enforce size limits.
- Enforce authentication and user ownership for saved resumes.
- Review AI-generated resume content before using it professionally.
