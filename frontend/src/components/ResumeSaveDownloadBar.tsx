"use client";

import React, { useState } from "react";
import {
  Save,
  FileDown,
  FileType,
  Loader2,
  Check,
  AlertCircle,
  Copy,
  ChevronDown,
  FolderPlus,
  RefreshCw,
} from "lucide-react";
import { downloadExportFile, saveVersion, updateVersion } from "@/lib/api";
import { TailoredResumeResponse, ResumeVersionItem } from "@/lib/types";

export type SaveStatus = "unsaved" | "saving" | "saved" | "error";

const getErrorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

interface ResumeSaveDownloadBarProps {
  data: TailoredResumeResponse;
  currentVersionId?: string | null;
  currentVersionName?: string | null;
  targetRole?: string;
  companyName?: string;
  jobDescription?: string;
  targetTechStack?: string[];
  authToken?: string | null;
  onRequireAuth?: () => void;
  onSavedSuccess?: (version: ResumeVersionItem) => void;
  saveStatus?: SaveStatus;
  setSaveStatus?: (status: SaveStatus) => void;
  compact?: boolean;
}

export const ResumeSaveDownloadBar: React.FC<ResumeSaveDownloadBarProps> = ({
  data,
  currentVersionId,
  currentVersionName,
  targetRole,
  companyName,
  jobDescription,
  targetTechStack,
  authToken,
  onRequireAuth,
  onSavedSuccess,
  saveStatus = "unsaved",
  setSaveStatus,
  compact = false,
}) => {
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<"pdf" | "docx" | "txt">("pdf");
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [versionNameInput, setVersionNameInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Download Handler
  const handleDownload = async (format: "pdf" | "docx" | "txt") => {
    try {
      setStatusMessage(null);
      setDownloadingFormat(format);
      await downloadExportFile(format, data);
    } catch (err: unknown) {
      setStatusMessage(getErrorMessage(err, `Failed to download ${format.toUpperCase()}`));
    } finally {
      setDownloadingFormat(null);
    }
  };

  // Open Save Prompt
  const handleOpenSavePrompt = () => {
    if (!authToken && onRequireAuth) {
      onRequireAuth();
      return;
    }
    const defaultName = currentVersionName
      ? `${currentVersionName} (Edited)`
      : `${targetRole || "Role"} Resume — v${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    setVersionNameInput(defaultName);
    setShowSaveModal(true);
  };

  // Perform Save: Either update existing or save as new version
  const executeSave = async (saveAsNew: boolean) => {
    if (isSaving) return; // Prevent double-clicks / repeated requests
    try {
      setIsSaving(true);
      setSaveStatus?.("saving");
      setStatusMessage(null);

      let savedResult: ResumeVersionItem;

      if (!saveAsNew && currentVersionId) {
        // Update current version
        savedResult = await updateVersion(
          currentVersionId,
          {
            version_name: versionNameInput.trim() || currentVersionName || "Tailored Resume",
            job_title: targetRole,
            company_name: companyName,
            job_description: jobDescription,
            target_tech_stack: targetTechStack,
            professional_summary: data.tailored_summary,
            match_score: data.ats_score_estimate,
            resume_data: data,
          },
          authToken || undefined
        );
      } else {
        // Save as new version
        savedResult = await saveVersion(
          {
            version_name: versionNameInput.trim() || `${targetRole || "Tailored"} Resume`,
            job_title: targetRole,
            company_name: companyName,
            job_description: jobDescription,
            target_tech_stack: targetTechStack,
            professional_summary: data.tailored_summary,
            match_score: data.ats_score_estimate,
            resume_data: data,
            parent_version_id: currentVersionId || undefined,
          },
          authToken || undefined
        );
      }

      setSaveStatus?.("saved");
      setStatusMessage(`Saved "${savedResult.version_name}" successfully.`);
      setShowSaveModal(false);
      onSavedSuccess?.(savedResult);
    } catch (err: unknown) {
      setSaveStatus?.("error");
      setStatusMessage(getErrorMessage(err, "Failed to save version."));
    } finally {
      setIsSaving(false);
    }
  };

  // Copy plain text handler
  const handleCopy = () => {
    try {
      const summaryText = data.tailored_summary ? `SUMMARY:\n${data.tailored_summary}\n\n` : "";
      const expText = (data.work_experience || [])
        .map(
          (e) =>
            `${e.position} | ${e.company} (${e.start_date || ""} - ${e.is_current ? "Present" : e.end_date || "Present"})\n` +
            (e.bullets || []).map((b) => `• ${b.tailored || b.original}`).join("\n")
        )
        .join("\n\n");

      const skillsText = Object.entries(data.skills || {})
        .map(([k, v]) => `${k}: ${v.join(", ")}`)
        .join("\n");

      const fullText = `${data.contact_info.name}\n${data.contact_info.email} | ${data.contact_info.phone}\n\n${summaryText}EXPERIENCE:\n${expText}\n\nSKILLS:\n${skillsText}`;

      navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2.5 ${compact ? "w-auto" : "w-full justify-between"}`}>
      {/* Live Save Status Indicator */}
      <div className="flex items-center gap-1.5 text-[11px] font-medium" role="status">
        {saveStatus === "saving" && (
          <span className="inline-flex items-center gap-1.5 text-blue-700 font-semibold bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
            <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
            <span>Saving...</span>
          </span>
        )}
        {saveStatus === "saved" && (
          <span className="inline-flex items-center gap-1.5 text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <Check className="h-3 w-3 text-emerald-600" />
            <span>Saved</span>
          </span>
        )}
        {saveStatus === "unsaved" && (
          <span className="inline-flex items-center gap-1.5 text-amber-800 font-medium bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <span>Unsaved changes</span>
          </span>
        )}
        {saveStatus === "error" && (
          <span className="inline-flex items-center gap-1.5 text-red-700 font-medium bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
            <AlertCircle className="h-3 w-3 text-red-600" />
            <span>Save failed</span>
          </span>
        )}
      </div>

      {/* Mandatory Results Toolbar: [ Save Resume ] [ Download PDF / DOCX ] Side-by-Side */}
      <div className="flex flex-wrap items-center gap-2">
        {/* SAVE BUTTON */}
        <button
          type="button"
          onClick={handleOpenSavePrompt}
          disabled={isSaving}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 px-3.5 py-2 text-xs font-bold text-white shadow-2xs disabled:opacity-50 transition-all cursor-pointer"
          title="Save resume version"
          aria-label="Save resume version"
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5 text-emerald-400" />
          )}
          <span>Save Resume</span>
        </button>

        {/* DOWNLOAD BUTTON WITH FORMAT SELECTOR */}
        <div className="flex items-center rounded-xl bg-indigo-600 text-white shadow-2xs overflow-hidden">
          <button
            type="button"
            onClick={() => handleDownload(downloadFormat)}
            disabled={downloadingFormat !== null}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
            title={`Download as ${downloadFormat.toUpperCase()}`}
          >
            {downloadingFormat === downloadFormat ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : downloadFormat === "docx" ? (
              <FileType className="h-3.5 w-3.5 text-blue-200" />
            ) : (
              <FileDown className="h-3.5 w-3.5 text-indigo-200" />
            )}
            <span>Download {downloadFormat.toUpperCase()}</span>
          </button>

          {/* Quick Format Toggle Dropdown */}
          <div className="relative border-l border-indigo-500/80">
            <select
              value={downloadFormat}
              onChange={(e) => setDownloadFormat(e.target.value as "pdf" | "docx" | "txt")}
              className="appearance-none bg-indigo-600 text-white font-bold text-xs py-2 pl-2 pr-5 hover:bg-indigo-700 focus:outline-none cursor-pointer"
              aria-label="Select download export format"
            >
              <option value="pdf" className="bg-white text-slate-900">PDF</option>
              <option value="docx" className="bg-white text-slate-900">DOCX</option>
              <option value="txt" className="bg-white text-slate-900">TXT</option>
            </select>
            <ChevronDown className="absolute right-1.5 top-2.5 h-3 w-3 pointer-events-none text-indigo-200" />
          </div>
        </div>

        {/* Copy Text Action */}
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
          title="Copy formatted resume text"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-emerald-700 font-semibold">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 text-slate-400" />
              <span className="hidden sm:inline">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Status / Error Toast Notice */}
      {statusMessage && (
        <div className="w-full text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl flex items-center justify-between">
          <span>{statusMessage}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 ml-2 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* SAVE DIALOG MODAL: Handles "Update Current" vs "Save as New" without silent overwrites */}
      {showSaveModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowSaveModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                  <Save className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Save Resume Version</h3>
                  <p className="text-[11px] text-slate-500">Save this tailored resume to your version history</p>
                </div>
              </div>
              <button
                onClick={() => setShowSaveModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Version Label / Name</label>
                <input
                  type="text"
                  required
                  value={versionNameInput}
                  onChange={(e) => setVersionNameInput(e.target.value)}
                  placeholder="e.g. Full Stack Developer — Version 1"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span className="font-medium text-slate-500">Target Role:</span>
                  <span className="font-semibold text-slate-800">{targetRole || "Software Engineer"}</span>
                </div>
                {companyName && (
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-500">Company:</span>
                    <span className="font-semibold text-slate-800">{companyName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-medium text-slate-500">ATS Match Score:</span>
                  <span className="font-semibold text-indigo-700">{data.ats_score_estimate}%</span>
                </div>
              </div>
            </div>

            {/* Actions: Distinguish between Update and Save As New */}
            <div className="space-y-2 pt-2">
              {currentVersionId ? (
                <>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => executeSave(false)}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSaving ? "animate-spin" : ""}`} />
                    <span>Update Current Version ({currentVersionName || "Version"})</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => executeSave(true)}
                    className="w-full py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <FolderPlus className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Save as New Version</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => executeSave(true)}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className={`h-3.5 w-3.5 ${isSaving ? "animate-spin" : ""}`} />
                  <span>Save as New Version</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
