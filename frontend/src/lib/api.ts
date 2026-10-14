import {
  ParseResumeResponse,
  AuthTokenResponse,
  CoverLetterResponse,
  CoverLetterItem,
  CoverLetterSaveRequest,
  MatchScoreResponse,
  ResumeVersionCreate,
  ResumeVersionItem,
  ResumeVersionSummary,
  ResumeVersionUpdate,
  TailorRequestPayload,
  TailoredResumeResponse,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function checkBackendHealth(): Promise<{
  status: string;
  service: string;
  llm_model: string;
  api_key_configured: boolean;
}> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new ApiError(res.status, "Backend service is unreachable.");
    }
    return await res.json();
  } catch (err: unknown) {
    throw new ApiError(503, err instanceof Error ? err.message : "Failed to connect to backend server.");
  }
}

export async function parseResumeFile(file: File): Promise<ParseResumeResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/api/resumes/parse`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    let errorDetail = "Failed to parse resume.";
    try {
      const data = await res.json();
      errorDetail = data.detail || errorDetail;
    } catch {
      // ignore json parsing error
    }
    throw new ApiError(res.status, errorDetail);
  }

  return await res.json();
}

export async function customizeResume(payload: {
  resume_content: string;
  job_description: string;
  target_role?: string;
  focus_notes?: string;
}): Promise<unknown> {
  const res = await fetch(`${API_BASE_URL}/api/resumes/customize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errorDetail = "Failed to customize resume.";
    try {
      const data = await res.json();
      errorDetail = data.detail || errorDetail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, errorDetail);
  }

  return await res.json();
}

export async function tailorResume(payload: TailorRequestPayload): Promise<TailoredResumeResponse> {
  const res = await fetch(`${API_BASE_URL}/api/tailor-resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errorDetail = "Failed to tailor resume.";
    try {
      const data = await res.json();
      errorDetail = data.detail || errorDetail;
    } catch {
      // ignore json parsing error
    }
    throw new ApiError(res.status, errorDetail);
  }

  return await res.json();
}

export async function downloadExportFile(
  format: "pdf" | "docx" | "txt",
  resumeData: TailoredResumeResponse
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/export/${format}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(resumeData),
  });

  if (!res.ok) {
    let errorDetail = `Failed to generate ${format.toUpperCase()} export.`;
    try {
      const data = await res.json();
      errorDetail = data.detail || errorDetail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, errorDetail);
  }

  // Parse filename from Content-Disposition header if provided
  let filename = "";
  const disposition = res.headers.get("Content-Disposition");
  if (disposition) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }
  }

  if (!filename) {
    const rawName =
      resumeData?.contact_info?.name ||
      "Tailored_Resume";
    const sanitized = rawName.trim().replace(/[^\w\-_\.]/g, "_");
    filename = `${sanitized}_Tailored.${format}`;
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// ============================================================================
// MATCH SCORE & ATS AUDIT
// ============================================================================

export async function getMatchScore(payload: {
  resume_text: string;
  job_description: string;
}): Promise<MatchScoreResponse> {
  const res = await fetch(`${API_BASE_URL}/api/resumes/match-score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new ApiError(res.status, "Failed to calculate match score.");
  }
  return await res.json();
}

export async function extractTechStack(jobDescription: string): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/resumes/extract-tech-stack`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_description: jobDescription }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.tech_stack || [];
  } catch {
    return [];
  }
}


// ============================================================================
// STREAMING TAILORING (SSE)
// ============================================================================

export async function tailorResumeStream(
  payload: TailorRequestPayload,
  onProgress: (step: string, message: string, percent: number) => void
): Promise<TailoredResumeResponse> {
  const response = await fetch(`${API_BASE_URL}/api/resumes/tailor-stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok || !response.body) {
    // Graceful fallback to regular POST
    return await tailorResume(payload);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completedData: TailoredResumeResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const evt of events) {
      const lines = evt.split("\n");
      let eventType = "";
      let dataStr = "";

      for (const line of lines) {
        if (line.startsWith("event: ")) eventType = line.slice(7).trim();
        else if (line.startsWith("data: ")) dataStr = line.slice(6).trim();
      }

      if (eventType === "progress" && dataStr) {
        try {
          const prog = JSON.parse(dataStr);
          onProgress(prog.step, prog.message, prog.percent);
        } catch {}
      } else if (eventType === "complete" && dataStr) {
        try {
          completedData = JSON.parse(dataStr);
        } catch {}
      } else if (eventType === "error") {
        try {
          const err = JSON.parse(dataStr);
          throw new Error(err.error || "Streaming error");
        } catch (e: unknown) {
          throw new Error(e instanceof Error ? e.message : "Streaming failed");
        }
      }
    }
  }

  if (completedData) return completedData;
  return await tailorResume(payload);
}

// ============================================================================
// COVER LETTER GENERATOR & EXPORTS
// ============================================================================

export async function generateCoverLetter(payload: {
  resume_text: string;
  job_description: string;
  company_name?: string;
  target_role?: string;
  tone?: string;
  focus_points?: string;
}): Promise<CoverLetterResponse> {
  const res = await fetch(`${API_BASE_URL}/api/cover-letter/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let err = "Failed to generate cover letter.";
    try {
      const data = await res.json();
      err = data.detail || err;
    } catch {}
    throw new ApiError(res.status, err);
  }
  return await res.json();
}

export async function downloadCoverLetterExport(
  format: "pdf" | "docx" | "txt",
  clData: CoverLetterResponse
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/cover-letter/export/${format}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(clData),
  });

  if (!res.ok) {
    throw new ApiError(res.status, `Failed to export cover letter as ${format.toUpperCase()}.`);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const name = (clData.candidate_name || "Candidate").trim().replace(/[^\w\-_\.]/g, "_");
  a.download = `${name}_Cover_Letter.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// ============================================================================
// MULTIPLE RESUME VERSIONS
// ============================================================================

export async function listVersions(token?: string): Promise<ResumeVersionSummary[]> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  // Tries /api/resume-versions first, with fallback to /api/versions
  let res = await fetch(`${API_BASE_URL}/api/resume-versions`, { headers });
  if (!res.ok && res.status === 404) {
    res = await fetch(`${API_BASE_URL}/api/versions`, { headers });
  }
  if (!res.ok) return [];
  return await res.json();
}

export async function saveVersion(
  payload: ResumeVersionCreate,
  token?: string
): Promise<ResumeVersionItem> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res = await fetch(`${API_BASE_URL}/api/resume-versions`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok && res.status === 404) {
    res = await fetch(`${API_BASE_URL}/api/versions`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  }

  if (!res.ok) {
    let err = "Failed to save resume version.";
    try {
      const d = await res.json();
      err = d.detail || err;
    } catch {}
    throw new ApiError(res.status, err);
  }
  return await res.json();
}

export async function updateVersion(
  id: string,
  payload: ResumeVersionUpdate,
  token?: string
): Promise<ResumeVersionItem> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res = await fetch(`${API_BASE_URL}/api/resume-versions/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok && res.status === 404) {
    res = await fetch(`${API_BASE_URL}/api/versions/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(payload),
    });
  }

  if (!res.ok) {
    let err = "Failed to update resume version.";
    try {
      const d = await res.json();
      err = d.detail || err;
    } catch {}
    throw new ApiError(res.status, err);
  }
  return await res.json();
}

export async function duplicateVersion(
  id: string,
  token?: string
): Promise<ResumeVersionItem> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res = await fetch(`${API_BASE_URL}/api/resume-versions/${id}/duplicate`, {
    method: "POST",
    headers,
  });
  if (!res.ok && res.status === 404) {
    res = await fetch(`${API_BASE_URL}/api/versions/${id}/duplicate`, {
      method: "POST",
      headers,
    });
  }

  if (!res.ok) {
    let err = "Failed to duplicate resume version.";
    try {
      const d = await res.json();
      err = d.detail || err;
    } catch {}
    throw new ApiError(res.status, err);
  }
  return await res.json();
}

export async function getVersion(id: string, token?: string): Promise<ResumeVersionItem> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res = await fetch(`${API_BASE_URL}/api/resume-versions/${id}`, { headers });
  if (!res.ok && res.status === 404) {
    res = await fetch(`${API_BASE_URL}/api/versions/${id}`, { headers });
  }

  if (!res.ok) {
    let err = "Failed to load version.";
    try {
      const d = await res.json();
      err = d.detail || err;
    } catch {}
    throw new ApiError(res.status, err);
  }
  return await res.json();
}

export async function deleteVersion(id: string, token?: string): Promise<void> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res = await fetch(`${API_BASE_URL}/api/resume-versions/${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok && res.status === 404) {
    res = await fetch(`${API_BASE_URL}/api/versions/${id}`, {
      method: "DELETE",
      headers,
    });
  }

  if (!res.ok) {
    let err = "Failed to delete version.";
    try {
      const d = await res.json();
      err = d.detail || err;
    } catch {}
    throw new ApiError(res.status, err);
  }
}

export async function registerOriginalResume(
  payload: {
    original_filename: string;
    file_type: string;
    protected_data: Record<string, unknown>;
    original_resume_data: Record<string, unknown>;
  },
  token?: string
): Promise<unknown> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/api/resumes`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let err = "Failed to register original resume.";
    try {
      const d = await res.json();
      err = d.detail || err;
    } catch {}
    throw new ApiError(res.status, err);
  }
  return await res.json();
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

export async function registerUser(email: string, password: string, fullName?: string): Promise<AuthTokenResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, full_name: fullName }),
  });
  if (!res.ok) {
    let err = "Registration failed.";
    try {
      const d = await res.json();
      err = d.detail || err;
    } catch {}
    throw new ApiError(res.status, err);
  }
  return await res.json();
}

export async function loginUser(email: string, password: string): Promise<AuthTokenResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    let err = "Login failed.";
    try {
      const d = await res.json();
      err = d.detail || err;
    } catch {}
    throw new ApiError(res.status, err);
  }
  return await res.json();
}

export async function getCurrentUser(token: string): Promise<AuthTokenResponse["user"] | null> {
  const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return await res.json();
}

// ============================================================================
// COVER LETTER PERSISTENCE
// ============================================================================

export async function saveCoverLetter(
  payload: CoverLetterSaveRequest,
  token?: string
): Promise<CoverLetterItem> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/api/cover-letters`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let err = "Failed to save cover letter.";
    try {
      const d = await res.json();
      err = d.detail || err;
    } catch {}
    throw new ApiError(res.status, err);
  }
  return await res.json();
}

export async function listCoverLetters(token?: string): Promise<CoverLetterItem[]> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE_URL}/api/cover-letters`, { headers });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function deleteCoverLetter(id: string, token?: string): Promise<void> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/api/cover-letters/${id}`, {
    method: "DELETE",
    headers,
  });

  if (!res.ok) {
    let err = "Failed to delete cover letter.";
    try {
      const d = await res.json();
      err = d.detail || err;
    } catch {}
    throw new ApiError(res.status, err);
  }
}


