# Resume Customizer - Frontend Web App

Modern Next.js 15+ App Router application with TypeScript and Tailwind CSS v4 for tailoring resumes with AI and exporting ATS-compliant documents.

## Features

- **Document Dropzone**: Drag-and-drop or file picker supporting PDF and DOCX files (up to 5MB) with instant client-side validation and backend text extraction.
- **Raw Text & Edit Mode**: Allows candidates to view extracted text or paste resume markdown directly.
- **Target Role & Focus Directives**: Advanced tuning controls for guiding AI emphasis.
- **Truthful ATS Evaluation**:
  - Live radial ATS Match Rating gauge.
  - Highlighted capabilities badges.
  - **Honest Gap Analysis**: Explicitly lists missing job description requirements and confirms they were not fabricated.
- **Side-by-Side Diff Inspector**:
  - Compares original vs tailored bullet points.
  - Targeted keywords tags.
  - Explanatory rationale cards ("Why this was changed").
  - In-place manual editing of any bullet point.
- **Recruiter ATS Paper Preview**: Rendered clean document view matching standard recruiting formats.
- **Instant Document Exporters**:
  - Download as PDF
  - Download as DOCX
  - Download as TXT
  - Copy to Clipboard

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL for FastAPI backend | `http://localhost:8000` |

## Setup & Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

3. Build production bundle:
   ```bash
   npm run build
   ```
