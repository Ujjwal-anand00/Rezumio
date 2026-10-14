# Rezumio — Professional ATS Resume Customizer

A full-stack, production-ready Resume Customizer web application built for the Full Stack Developer Assignment. Rezumio enables job seekers to parse existing resumes (PDF/DOCX), analyze target job descriptions, extract role requirements and technology stacks, generate tailored resumes with fact-preservation safeguards, review transparent ATS match scores, generate matching cover letters, and manage multiple saved resume versions with cloud persistence.

---

## 🌟 Key Implemented Features

1. **Role-Specific Tailoring & Fact-Preservation Safeguards**:
   - **Target Role Alignment**: Tailor resumes specifically for target roles (e.g., Full Stack Developer, Frontend Developer, Backend Developer, Software Engineer).
   - **Tech Stack Extraction**: Identifies and prioritizes target technologies from the job description and highlights candidate proficiencies.
   - **Fact-Preservation Engine**: Programmatic validation ([`protected_fields.py`](backend/app/services/protected_fields.py)) ensures personal contact info, degrees, academic institutions, employers, and employment dates cannot be falsified or fabricated by the LLM.
   - **Dual LLM Provider Architecture**: Powered by Google Gemini 2.5 Flash with an automatic deterministic offline mock fallback provider ([`mock.py`](backend/app/services/llm/mock.py)) for offline development and CI testing.

2. **Multi-Format Document Parsing & Export**:
   - **Multi-Engine PDF Parsing**: Resilient extraction via `pypdf`, `pymupdf` (PyMuPDF), and `pdfplumber` with automatic fallback.
   - **DOCX Parsing**: Structured paragraph and table extraction via `python-docx`.
   - **Multi-Format Document Export**: Clean, ATS-friendly exports in **PDF** (ReportLab layout with modern typography), **DOCX** (styled Microsoft Word document), and plain **TXT**.

3. **Interactive Resume Studio & Inline Canvas**:
   - **Interactive Document Canvas**: Real-time inline editing of candidate summary, technical skills, professional experience bullet points, education, and projects.
   - **Diff & Rationale Inspection**: Side-by-side view highlighting modified bullets with AI-generated reasoning for each change.
   - **Bottom-Docked Action Controls**: Side-by-side **[ Save Resume ]** and **[ Download PDF / DOCX ]** buttons at the bottom of the canvas.
   - **Save State Tracking**: Real-time status indicators (`Unsaved changes`, `Saving...`, `Saved`, `Save failed`) with unsaved-change browser warnings.

4. **ATS Compatibility & Match Score Engine**:
   - **Transparent Scoring Formula**: Weighted breakdown evaluating keyword coverage, experience alignment, ATS formatting compliance, and structural completeness.
   - **Skill Gap Analysis**: Identifies missing job requirements and provides actionable suggestions for interview preparation without fabricating experience.

5. **Tailored Cover Letter Studio**:
   - **AI Cover Letter Generation**: Generates targeted, role-aligned cover letters grounded in the candidate's verified experience.
   - **Inline Cover Letter Editing & Versioning**: Full in-browser editor with bottom-docked save and export controls (PDF, DOCX, TXT).

6. **Authentication & Dual-Tier Data Persistence**:
   - **Supabase Authentication**: Email/password registration, login, session tokens, and account profile management.
   - **Dual-Tier Persistence Architecture**:
     - **Primary (Cloud PostgreSQL via Supabase)**: Production storage enforcing Row Level Security (RLS) on all user-owned tables (`profiles`, `original_resumes`, `resume_versions`, `cover_letters`).
     - **Local Development Fallback (SQLite WAL)**: Automatic local file fallback (`backend/app/data/resume_app.db`) when Supabase credentials are not provided.
   - **Version Management Modal**: Browse, preview, duplicate, rename, download, and delete saved resume versions with strict user isolation.

---

## 🏗️ Architecture & Tech Stack

```
Resume/
├── backend/                              # FastAPI Service (Python 3.11+)
│   ├── app/
│   │   ├── api/
│   │   │   └── endpoints.py              # REST API endpoints (/resumes, /versions, /export, /cover-letter, etc.)
│   │   ├── core/
│   │   │   ├── config.py                 # Pydantic Settings & environment validation
│   │   │   ├── database.py               # Local SQLite WAL storage (local development fallback)
│   │   │   └── supabase.py               # Supabase PostgreSQL client & JWT auth verification
│   │   ├── models/                       # Pydantic data contracts (Resume, Version, CoverLetter, Match)
│   │   ├── services/
│   │   │   ├── auth_service.py           # User authentication & token management
│   │   │   ├── cover_letter_service.py   # Cover letter generation, persistence & export
│   │   │   ├── exporter.py               # PDF (ReportLab), DOCX (python-docx), and TXT generation
│   │   │   ├── match_engine.py           # ATS scoring algorithm & tech stack extraction
│   │   │   ├── parser.py                 # Multi-engine PDF/DOCX document parser
│   │   │   ├── protected_fields.py       # Grounding & fact-preservation validation
│   │   │   ├── version_service.py        # Version management & dual-tier persistence
│   │   │   └── llm/                      # Gemini 2.5 Flash provider, prompts, and offline mock provider
│   │   └── main.py                       # FastAPI application entrypoint, CORS & error handling
│   ├── tests/                            # 10 test suites (56 automated tests)
│   ├── requirements.txt                  # Production Python dependencies
│   ├── .env.example                      # Backend environment variable template
│   └── README.md
│
├── frontend/                             # Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4
│   ├── src/
│   │   ├── app/                          # Next.js App Router (layout.tsx, page.tsx, globals.css)
│   │   ├── components/
│   │   │   ├── AtsCompatibilityDashboard.tsx # Interactive ATS score breakdown
│   │   │   ├── AuthModal.tsx             # Supabase Sign Up, Sign In, Password Reset modal
│   │   │   ├── CoverLetterStudio.tsx     # Cover letter generation, editing & bottom action bar
│   │   │   ├── Footer.tsx                # Application footer
│   │   │   ├── InteractiveResumeCanvas.tsx # Inline editable A4 document canvas
│   │   │   ├── MatchScoreBreakdown.tsx   # Skill coverage, keyword overlap & gap analysis
│   │   │   ├── Navbar.tsx                # Brand header, auth status & account controls
│   │   │   ├── ResumeCustomizerHeroForm.tsx # Hero form: JD input, role selector, resume upload
│   │   │   ├── ResumeEditorSidebar.tsx   # Structured section sidebar editor
│   │   │   ├── ResumeSaveDownloadBar.tsx # Bottom-docked [ Save Resume ] [ Download PDF ] toolbar
│   │   │   ├── ResumeStudioSkeleton.tsx  # Polished loading animation skeleton
│   │   │   ├── TailorProgressModal.tsx   # Tailoring progress indicator modal
│   │   │   ├── VersionManagerModal.tsx   # Version history, rollback, duplicate & delete modal
│   │   │   └── results/
│   │   │       └── DiffViewer.tsx        # Side-by-side diff & rationale inspector
│   │   └── lib/
│   │       ├── api.ts                    # Strongly typed API client for FastAPI backend
│   │       ├── supabaseClient.ts         # Supabase browser authentication client
│   │       └── types.ts                  # Shared TypeScript models & interfaces
│   ├── package.json                      # Next.js dependencies (Tailwind v4, Lucide React, Supabase)
│   ├── .env.example                      # Frontend environment variable template
│   └── .env.local.example                # Local frontend environment override template
│
├── supabase/
│   └── migrations/
│       ├── 20261013000000_init_supabase_schema.sql # Profiles, original resumes, versions & RLS
│       └── 20261013000001_create_cover_letters.sql # Cover letters schema & RLS policies
│
├── docs/
│   ├── CLEANUP_REPORT.md                 # Full repository cleanup & verification audit
│   └── PROJECT_AUDIT.md                  # Assignment requirements audit report
│
├── docker-compose.yml                    # Multi-container local orchestration
├── render.yaml                           # Render Blueprint Infrastructure-as-Code manifest
└── README.md
```

---

## 🗄️ Database Architecture: Dual-Tier Persistence

Rezumio implements a dual-tier storage strategy to ensure reliability across both cloud production and offline local environments:

| Feature | Primary: Supabase PostgreSQL (Production) | Fallback: SQLite WAL (Local Development) |
|---|---|---|
| **Intended Environment** | Cloud production (Render + Vercel) | Offline development & automated testing |
| **Trigger Condition** | `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` configured and reachable | Supabase credentials absent or unreachable |
| **Multi-Tenant Isolation** | PostgreSQL Row Level Security (`auth.uid() = user_id`) | In-memory / local file isolation |
| **Persistence Guarantee** | Cloud database persistent across deployments | Local disk file (`backend/app/data/resume_app.db`) |
| **Production Readiness** | **Production Ready** | **Development / Testing Only** (ephemeral on cloud containers without volume mounts) |

### Setting Up Supabase (Production)

1. Create a free PostgreSQL project at [supabase.com](https://supabase.com).
2. Retrieve your **Project URL**, **Anon Public Key**, **Service Role Secret Key**, and **PostgreSQL Connection String (`DATABASE_URL`)**.
3. Open the **SQL Editor** in the Supabase Dashboard and apply the migrations in order:
   - First run: [`supabase/migrations/20261013000000_init_supabase_schema.sql`](supabase/migrations/20261013000000_init_supabase_schema.sql)
   - Then run: [`supabase/migrations/20261013000001_create_cover_letters.sql`](supabase/migrations/20261013000001_create_cover_letters.sql)

---

## ⚙️ Environment Configuration

### Frontend Configuration (`frontend/.env.local`)
Create `frontend/.env.local` by copying `frontend/.env.example`:

```env
# Optional Supabase browser authentication (leave blank to use backend local auth fallback)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# FastAPI backend API URL
# Local development: http://localhost:8000
# Production: https://your-backend-service.onrender.com
NEXT_PUBLIC_API_URL=http://localhost:8000
```

| Variable | Scope | Required? | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Public / Client | **Yes** | Base URL for FastAPI backend requests. |
| `NEXT_PUBLIC_SUPABASE_URL` | Public / Client | No (Optional) | Supabase project URL for browser-side authentication. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public / Client | No (Optional) | Supabase public anonymous key (never use the service role key). |

### Backend Configuration (`backend/.env`)
Create `backend/.env` by copying `backend/.env.example`:

```env
PROJECT_NAME="Resume Customizer API"
API_V1_PREFIX="/api"
PORT=8000
HOST="0.0.0.0"

# Gemini API Configuration (Backend only - KEEP SECRET)
# Leave empty to run with deterministic MockLLMProvider for testing
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL="gemini-2.5-flash"
GEMINI_TIMEOUT_SECONDS=45
GEMINI_MAX_RETRIES=3
GEMINI_MAX_OUTPUT_TOKENS=4096
GEMINI_TEMPERATURE=0.2

# Supabase Configuration (Backend only - KEEP SECRET)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# Security and Upload limits
MAX_FILE_SIZE_MB=5
ALLOWED_EXTENSIONS=[".pdf", ".docx"]

# CORS Allowed Origins
CORS_ORIGINS=["http://localhost:3000", "http://127.0.0.1:3000", "https://your-vercel-app.vercel.app"]
```

| Variable | Scope | Required? | Purpose |
|---|---|---|---|
| `PROJECT_NAME` | Server | No (Default set) | Display name for OpenAPI docs and health check. |
| `API_V1_PREFIX` | Server | No (Default set) | API route prefix (default: `/api`). |
| `PORT`, `HOST` | Server | No (Default set) | Server bind settings (Render injects `$PORT`). |
| `GEMINI_API_KEY` | Secret | **Yes for Live AI** | Google Gemini API key. If unset, the backend falls back to `MockLLMProvider`. |
| `GEMINI_MODEL` | Server | No (Default set) | Target LLM model (default: `gemini-2.5-flash`). |
| `SUPABASE_URL` | Secret | **Yes for Cloud DB** | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | **Yes for Cloud DB** | Admin key for backend database operations (bypasses RLS on server). |
| `DATABASE_URL` | Secret | Optional | Direct PostgreSQL connection string. |
| `MAX_FILE_SIZE_MB` | Server | No (Default: 5) | Maximum upload file size in megabytes. |
| `ALLOWED_EXTENSIONS` | Server | No (Default: `[".pdf", ".docx"]`) | Allowed resume upload extensions. |
| `CORS_ORIGINS` | Server | **Yes in Prod** | JSON array of origins permitted to make cross-origin requests. |

---

## 🚀 Running the Project Locally

### 1. Start the Backend (FastAPI)

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Linux / macOS:
source .venv/bin/activate
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On Windows (Command Prompt):
.venv\Scripts\activate.bat

# Install dependencies
pip install -r requirements.txt

# Start development server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- API Base URL: `http://127.0.0.1:8000`
- Interactive OpenAPI Docs: `http://127.0.0.1:8000/docs`
- Health Check: `http://127.0.0.1:8000/api/health`

### 2. Start the Frontend (Next.js)

```bash
cd frontend

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 🧪 Verified Automated Testing & Quality Checks

All test suites and build checks have been executed and verified in this environment:

### Backend Test Suite (56 Automated Tests)

Run tests cross-platform:

```bash
cd backend

# Linux / macOS:
python3 -m pytest
# Or run with explicit offline mock fallback:
GEMINI_API_KEY="" pytest

# Windows (PowerShell):
python -m pytest
# Or run with explicit offline mock fallback:
$env:GEMINI_API_KEY=""; python -m pytest
```

**Test Execution Results: 56 Passed (100% pass rate in 3.62s)** across 10 test suites:
- [`test_api.py`](backend/tests/test_api.py) (4 tests): Health check endpoint, document upload, CORS headers, API routing.
- [`test_cover_letter_persistence.py`](backend/tests/test_cover_letter_persistence.py) (2 tests): Cover letter creation, retrieval, and persistence.
- [`test_customizer.py`](backend/tests/test_customizer.py) (4 tests): Role tailoring, grounding validation, and diff generation.
- [`test_exporter.py`](backend/tests/test_exporter.py) (3 tests): PDF (ReportLab), DOCX, and TXT document generation.
- [`test_features.py`](backend/tests/test_features.py) (4 tests): Keyword matching, ATS scoring, and authentication sessions.
- [`test_full_stack_audit.py`](backend/tests/test_full_stack_audit.py) (6 tests): End-to-end integration, prompt injection defenses, input limits.
- [`test_parser.py`](backend/tests/test_parser.py) (10 tests): Multi-engine PDF/DOCX document extraction and metadata extraction.
- [`test_requirements_matching.py`](backend/tests/test_requirements_matching.py) (10 tests): Tech stack identification, keyword coverage, and scoring accuracy.
- [`test_role_specific_resume.py`](backend/tests/test_role_specific_resume.py) (8 tests): Role tailoring (Full Stack, Frontend, Backend, etc.) and fact preservation.
- [`test_supabase_and_versions.py`](backend/tests/test_supabase_and_versions.py) (5 tests): Dual-tier version persistence, duplication, update in-place, and RLS authorization.

### Frontend Lint & Production Build Verification

```bash
cd frontend

# Run ESLint (Flat Config ESLint 9)
npm run lint

# Run Next.js 16 Production Build with Turbopack & TypeScript checks
npm run build
```

**Verification Results:**
- **ESLint:** Passed with **0 errors and 0 warnings**.
- **Next.js Production Build:** Compiled successfully in 344ms with Turbopack; TypeScript checks passed in 2.1s with 0 errors; all static routes prerendered (`/` and `/_not-found`).

---

## 🚢 Deployment Guide

### Frontend Deployment (Vercel)

1. Push your repository to GitHub.
2. In the [Vercel Dashboard](https://vercel.com), import your repository.
3. Configure project settings:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (or `next build`)
   - **Output Directory**: `.next`
4. Set Environment Variables in the Vercel dashboard:
   - `NEXT_PUBLIC_API_URL`: Your deployed Render backend HTTPS URL (e.g., `https://resume-customizer-api.onrender.com`).
   - `NEXT_PUBLIC_SUPABASE_URL`: (Optional) Your Supabase project URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (Optional) Your Supabase anon public key.
5. Deploy.

> [!IMPORTANT]
> Never set `NEXT_PUBLIC_API_URL` to `localhost` in Vercel. Browser requests will fail with mixed-content or connection errors.

### Backend Deployment (Render)

The repository includes a ready-to-use [`render.yaml`](render.yaml) Blueprint:

1. In the [Render Dashboard](https://render.com), create a new **Web Service** or use **Blueprints** with [`render.yaml`](render.yaml).
2. Configure settings:
   - **Root Directory**: `backend`
   - **Runtime**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/api/health`
3. Add Environment Variables in Render:
   - `GEMINI_API_KEY`: Your Google Gemini API key.
   - `SUPABASE_URL`: Your Supabase project URL.
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role secret key.
   - `DATABASE_URL`: Your Supabase PostgreSQL database connection string.
   - `CORS_ORIGINS`: JSON array including your production Vercel frontend URL, e.g. `["https://your-app.vercel.app"]`.

### Live Deployment Status

- **Frontend (Vercel)**: `To be configured upon production push`
- **Backend (Render)**: `To be configured upon production push`

*(Replace with verified live URLs once deployed to production platforms).*

---

## 🔒 Security & Privacy Implementation

- **Strict Environment Isolation**: Credentials, database connection strings, and API keys are stored solely in environment variables and excluded by `.gitignore`.
- **JWT Authorization on Mutations**: All version and cover letter mutations (create, update, duplicate, delete) require a valid authentication token.
- **Client User-ID Invalidation**: Client-supplied `user_id` values in request payloads are disregarded in favor of the identity extracted from the verified session token.
- **Service Role Secret Protection**: `SUPABASE_SERVICE_ROLE_KEY` is exclusively accessed server-side and never exposed to the frontend bundle.
- **CORS Protection**: Access to backend endpoints is restricted to authorized origins specified in `CORS_ORIGINS`.
