# Resume Customizer - Backend API

FastAPI-powered backend service for parsing candidate resumes (PDF & DOCX) using **PyMuPDF** and **python-docx**, tailoring bullet points and summaries truthfully with Google Gemini via an extensible LLM provider abstraction, and generating export files (PDF, DOCX, TXT).

---

## 📑 Resume Parser API Contract

### Endpoint: `POST /api/resumes/parse`

Multipart file upload that validates, sanitizes, and extracts normalized text and structured metadata from PDF and Word DOCX documents.

#### Request
- **Content-Type**: `multipart/form-data`
- **Parameter**: `file` (Binary file, `.pdf` or `.docx`, max 5MB)

#### Response Schema (`200 OK`)
```json
{
  "filename": "candidate_resume.pdf",
  "file_type": "pdf",
  "file_size_bytes": 102400,
  "page_count": 2,
  "word_count": 482,
  "character_count": 3120,
  "text": "<Extracted plaintext from uploaded candidate document>",
  "contact_info": {
    "name": "Jane Doe",
    "email": "candidate@example.com",
    "phone": "+1 (555) 000-0000",
    "location": "",
    "linkedin": "https://linkedin.com/in/candidate",
    "github": "https://github.com/candidate",
    "website": null
  },
  "is_scanned_or_low_text": false,
  "warnings": []
}
```

#### Validation & Error Handling
| Condition | HTTP Status | Response Detail |
|---|---|---|
| Unsupported extension | `400 Bad Request` | `"Unsupported file format '.xyz'. Only PDF (.pdf) and Word (.docx) files are supported."` |
| Empty file (0 bytes) | `400 Bad Request` | `"Uploaded file is empty (0 bytes). Please upload a valid resume document."` |
| Oversized upload (> 5MB) | `413 Payload Too Large` | `"File exceeds maximum allowed upload size of 5MB."` |
| Malformed / non-PDF/DOCX bytes | `422 Unprocessable Entity` | `"Malformed document: File has a .pdf extension but lacks valid PDF signature bytes."` |
| Password-protected PDF | `422 Unprocessable Entity` | `"The PDF document is password-protected or encrypted. Please upload an unencrypted file."` |
| Scanned / image-only PDF | `422 Unprocessable Entity` | `"Document contains no extractable text. Scanned or image-only documents require OCR (optical character recognition)..."` |

---

## 🛡️ Security & Privacy Guarantees

1. **Safe Temporary Files**: Uploads are processed in isolated `tempfile.NamedTemporaryFile` with explicit cleanup in `finally` blocks, preventing resource leaks.
2. **Never Execute Document Contents**: Word macros and embedded scripts are never executed.
3. **Never Log Private Text**: Candidate resume text is strictly excluded from server log outputs.
4. **No Stack Traces**: All parsing and schema exceptions are caught and returned as clean, informative HTTP status codes.

---

## ⚠️ Document Limitations & Scanned Documents

- **Native Text Documents (Supported)**: Resumes created via Google Docs, Microsoft Word, LaTeX, LibreOffice, or exported directly as text-based PDFs.
- **Scanned / Image-Only PDFs (Limitation)**: Scanned paper copies saved as image-only PDFs (with no underlying text layer) contain 0 extractable characters. The parser returns a clear HTTP 422 error notifying the user that OCR is required.

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API Key | `""` |
| `GEMINI_MODEL` | Gemini Model Identifier | `gemini-2.5-flash` |
| `MAX_FILE_SIZE_MB` | Maximum allowed file upload size in MB | `5` |
| `ALLOWED_EXTENSIONS` | Allowed document extensions | `[".pdf", ".docx"]` |
| `CORS_ORIGINS` | Permitted origins for web client | `["http://localhost:3000"]` |

---

## 🚀 Setup & Running Locally

1. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # macOS/Linux:
   source .venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Start development server:
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

4. Interactive API Documentation:
   - Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
   - ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 🧪 Running Automated Tests

Run the full pytest suite (17 unit and integration tests):

```bash
pytest tests -v
```
