"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  History,
  X,
  Plus,
  Calendar,
  Building2,
  Briefcase,
  Trash2,
  Copy,
  FileDown,
  FileType,
  Edit3,
  ExternalLink,
  Check,
  AlertCircle,
  Loader2,
  Search,
  Sparkles,
  Layers,
  User,
} from "lucide-react";
import { ResumeVersionSummary, ResumeVersionItem, TailoredResumeResponse } from "@/lib/types";
import {
  listVersions,
  getVersion,
  deleteVersion,
  updateVersion,
  duplicateVersion,
  downloadExportFile,
} from "@/lib/api";

interface VersionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadVersion: (data: TailoredResumeResponse, version: ResumeVersionSummary) => void;
  authToken?: string | null;
  onRequireAuth?: () => void;
  onCreateNewResume?: () => void;
}

const getErrorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

export const VersionManagerModal: React.FC<VersionManagerModalProps> = ({
  isOpen,
  onClose,
  onLoadVersion,
  authToken,
  onRequireAuth,
  onCreateNewResume,
}) => {
  const [versions, setVersions] = useState<ResumeVersionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");

  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Preview state
  const [previewVersion, setPreviewVersion] = useState<ResumeVersionItem | null>(null);

  const fetchVersions = useCallback(async () => {
    if (!authToken) {
      setVersions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await listVersions(authToken || undefined);
      setVersions(data);
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err, "Failed to load versions from database."));
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => {
        void fetchVersions();
      });
    }
  }, [isOpen, fetchVersions]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (previewVersion) setPreviewVersion(null);
        else if (deleteConfirmId) setDeleteConfirmId(null);
        else if (renamingId) setRenamingId(null);
        else onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, previewVersion, deleteConfirmId, renamingId]);

  if (!isOpen) return null;

  // Filter versions by search
  const filteredVersions = versions.filter((v) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (v.version_name || v.label || "").toLowerCase().includes(q) ||
      (v.job_title || v.target_role || "").toLowerCase().includes(q) ||
      (v.company_name || "").toLowerCase().includes(q)
    );
  });

  // Action: Open version in editor
  const handleOpenVersion = async (versionSummary: ResumeVersionSummary) => {
    try {
      setActiveActionId(versionSummary.id);
      const fullVersion = await getVersion(versionSummary.id, authToken || undefined);
      onLoadVersion(fullVersion.resume_data, versionSummary);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err, "Failed to retrieve version data."));
    } finally {
      setActiveActionId(null);
    }
  };

  // Action: Preview version
  const handlePreviewVersion = async (versionSummary: ResumeVersionSummary) => {
    try {
      setActiveActionId(versionSummary.id);
      const fullVersion = await getVersion(versionSummary.id, authToken || undefined);
      setPreviewVersion(fullVersion);
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err, "Failed to load version for preview."));
    } finally {
      setActiveActionId(null);
    }
  };

  // Action: Download direct from version
  const handleDownloadDirect = async (versionId: string, format: "pdf" | "docx") => {
    try {
      setActiveActionId(versionId);
      const fullVersion = await getVersion(versionId, authToken || undefined);
      await downloadExportFile(format, fullVersion.resume_data);
      setStatusMessage(`Downloaded ${format.toUpperCase()} successfully.`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err, `Failed to download ${format.toUpperCase()}`));
    } finally {
      setActiveActionId(null);
    }
  };

  // Action: Rename version
  const handleStartRename = (v: ResumeVersionSummary) => {
    setRenamingId(v.id);
    setRenameInput(v.version_name || v.label);
  };

  const handleSaveRename = async (vId: string) => {
    if (!renameInput.trim()) return;
    try {
      setActiveActionId(vId);
      await updateVersion(vId, { version_name: renameInput.trim() }, authToken || undefined);
      setRenamingId(null);
      await fetchVersions();
      setStatusMessage("Version renamed successfully.");
      setTimeout(() => setStatusMessage(null), 2500);
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err, "Failed to rename version."));
    } finally {
      setActiveActionId(null);
    }
  };

  // Action: Duplicate version
  const handleDuplicateVersion = async (vId: string) => {
    try {
      setActiveActionId(vId);
      await duplicateVersion(vId, authToken || undefined);
      await fetchVersions();
      setStatusMessage("New version copy created.");
      setTimeout(() => setStatusMessage(null), 2500);
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err, "Failed to duplicate version."));
    } finally {
      setActiveActionId(null);
    }
  };

  // Action: Delete version
  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      setActiveActionId(deleteConfirmId);
      await deleteVersion(deleteConfirmId, authToken || undefined);
      setDeleteConfirmId(null);
      await fetchVersions();
      setStatusMessage("Version deleted.");
      setTimeout(() => setStatusMessage(null), 2500);
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err, "Failed to delete version."));
    } finally {
      setActiveActionId(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <History className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Resume Version History</h2>
              </div>
              <p className="text-xs text-slate-500">
                Independent tailored resumes generated for distinct job roles and organizations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onCreateNewResume && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onCreateNewResume();
                }}
                className="hidden sm:flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create New Resume</span>
              </button>
            )}

            <button
              onClick={onClose}
              aria-label="Close version manager"
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Notifications */}
        {statusMessage && (
          <div className="px-6 py-2 bg-emerald-50 border-b border-emerald-100 text-xs text-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span>{statusMessage}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="text-emerald-600 hover:text-emerald-800">×</button>
          </div>
        )}

        {errorMessage && (
          <div className="px-6 py-2 bg-red-50 border-b border-red-100 text-xs text-red-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-red-600" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-600 hover:text-red-800">×</button>
          </div>
        )}

        {authToken && (
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-white">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by role, company, or version..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {filteredVersions.length} {filteredVersions.length === 1 ? "Version" : "Versions"}
            </span>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
          {!authToken ? (
            <div className="py-16 text-center space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 mx-auto flex items-center justify-center text-indigo-600">
                <User className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Sign in to view saved versions</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Log in first, then you can view, edit, download, duplicate, and delete your saved resume versions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequireAuth?.();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-2xs cursor-pointer"
              >
                <User className="h-3.5 w-3.5" />
                <span>Sign In First</span>
              </button>
            </div>
          ) : loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
              <p className="text-xs">Loading saved resume versions...</p>
            </div>
          ) : filteredVersions.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No saved versions found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery
                  ? "No saved versions match your search criteria. Try a different query."
                  : "Customize a resume for a target job role and click Save Resume to preserve your version history."}
              </p>
              {onCreateNewResume && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onCreateNewResume();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-2xs cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create New Resume</span>
                </button>
              )}
            </div>
          ) : (
            filteredVersions.map((v) => {
              const isWorking = activeActionId === v.id;
              const formattedDate = new Date(v.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              const techList = v.target_tech_stack || [];

              return (
                <div
                  key={v.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    {renamingId === v.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={renameInput}
                          onChange={(e) => setRenameInput(e.target.value)}
                          className="px-2.5 py-1 rounded-lg border border-indigo-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          onClick={() => handleSaveRename(v.id)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold hover:bg-indigo-700 cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setRenamingId(null)}
                          className="px-2 py-1 rounded-lg text-slate-500 text-[11px] hover:bg-slate-100 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">
                          {v.version_name || v.label}
                        </h4>
                        <button
                          type="button"
                          onClick={() => handleStartRename(v)}
                          title="Rename version"
                          className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2 shrink-0">
                      {v.match_score !== undefined && v.match_score !== null && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold">
                          <Sparkles className="h-3 w-3 text-emerald-600" />
                          <span>ATS {v.match_score}%</span>
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 font-mono">
                        {v.id.slice(0, 8)}...
                      </span>
                    </div>
                  </div>

                  {/* Metadata: Role, Company, Date */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                    {(v.job_title || v.target_role) && (
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-800">
                          {v.job_title || v.target_role}
                        </span>
                      </div>
                    )}
                    {v.company_name && (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        <span>{v.company_name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>

                  {/* Tech stack tags */}
                  {techList.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 pt-0.5">
                      {techList.slice(0, 6).map((t, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md"
                        >
                          {t}
                        </span>
                      ))}
                      {techList.length > 6 && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          +{techList.length - 6} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      {/* Open / Edit */}
                      <button
                        type="button"
                        disabled={isWorking}
                        onClick={() => handleOpenVersion(v)}
                        className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isWorking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                        <span>Open & Edit</span>
                      </button>

                      {/* Quick Preview */}
                      <button
                        type="button"
                        disabled={isWorking}
                        onClick={() => handlePreviewVersion(v)}
                        className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                      >
                        <span>Preview</span>
                      </button>

                      {/* Download PDF */}
                      <button
                        type="button"
                        disabled={isWorking}
                        onClick={() => handleDownloadDirect(v.id, "pdf")}
                        className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
                        title="Download PDF"
                      >
                        <FileDown className="h-3.5 w-3.5 text-indigo-600" />
                        <span>PDF</span>
                      </button>

                      {/* Download DOCX */}
                      <button
                        type="button"
                        disabled={isWorking}
                        onClick={() => handleDownloadDirect(v.id, "docx")}
                        className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
                        title="Download DOCX"
                      >
                        <FileType className="h-3.5 w-3.5 text-blue-600" />
                        <span>DOCX</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Duplicate Version */}
                      <button
                        type="button"
                        disabled={isWorking}
                        onClick={() => handleDuplicateVersion(v.id)}
                        className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
                        title="Duplicate as new version"
                      >
                        <Copy className="h-3 w-3 text-slate-400" />
                        <span className="hidden sm:inline">Duplicate</span>
                      </button>

                      {/* Delete Version */}
                      <button
                        type="button"
                        disabled={isWorking}
                        onClick={() => setDeleteConfirmId(v.id)}
                        className="p-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete version"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4"
          >
            <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4">
              <div className="flex items-center gap-3 text-red-600">
                <div className="h-10 w-10 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Delete Resume Version</h4>
                  <p className="text-[11px] text-slate-500">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-xs text-slate-600">
                Are you sure you want to permanently delete this resume version?
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
                >
                  Delete Version
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Preview Modal */}
        {previewVersion && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4"
          >
            <div className="w-full max-w-2xl max-h-[85vh] bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 flex flex-col space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{previewVersion.version_name}</h3>
                  <p className="text-xs text-slate-500">{previewVersion.job_title} • ATS {previewVersion.match_score}%</p>
                </div>
                <button
                  onClick={() => setPreviewVersion(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 text-xs pr-1">
                {previewVersion.resume_data?.tailored_summary && (
                  <div>
                    <h5 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-1">
                      Professional Summary
                    </h5>
                    <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {previewVersion.resume_data.tailored_summary}
                    </p>
                  </div>
                )}

                {previewVersion.resume_data?.work_experience && (
                  <div className="space-y-2">
                    <h5 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                      Work Experience
                    </h5>
                    {previewVersion.resume_data.work_experience.map((exp, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-slate-100 space-y-1">
                        <div className="flex justify-between font-bold text-slate-900">
                          <span>{exp.position}</span>
                          <span className="text-slate-500 font-normal">{exp.company}</span>
                        </div>
                        <ul className="list-disc pl-4 space-y-1 text-slate-600">
                          {(exp.bullets || []).map((b, bIdx) => (
                            <li key={bIdx}>{b.tailored || b.original}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    onLoadVersion(previewVersion.resume_data, previewVersion);
                    setPreviewVersion(null);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Load into Studio Editor
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
