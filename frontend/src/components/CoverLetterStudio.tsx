"use client";

import React, { useState } from "react";
import {
  FileText,
  Sparkles,
  Copy,
  Check,
  Building2,
  Briefcase,
  AlertCircle,
  ShieldCheck,
  Edit3,
  Save,
  Loader2,
  FolderOpen,
  X,
  Trash2,
  FileType,
  FileDown,
} from "lucide-react";
import { CoverLetterResponse, CoverLetterItem } from "@/lib/types";
import {
  generateCoverLetter,
  downloadCoverLetterExport,
  saveCoverLetter,
  listCoverLetters,
  deleteCoverLetter,
} from "@/lib/api";

type SaveStatus = "unsaved" | "saving" | "saved" | "error";

interface CoverLetterStudioProps {
  resumeText: string;
  jobDescription: string;
  authToken?: string | null;
  onRequireAuth?: () => void;
}

export const CoverLetterStudio: React.FC<CoverLetterStudioProps> = ({
  resumeText,
  jobDescription,
  authToken,
  onRequireAuth,
}) => {
  const [companyName, setCompanyName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [tone, setTone] = useState("Confident & Impact-Driven");
  const [focusPoints, setFocusPoints] = useState("");

  const [coverLetter, setCoverLetter] = useState<CoverLetterResponse | null>(null);
  const [currentLetterId, setCurrentLetterId] = useState<string | null>(null);
  const [currentLetterTitle, setCurrentLetterTitle] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("unsaved");

  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<"pdf" | "docx" | "txt">("pdf");
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveTitleInput, setSaveTitleInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedLettersModal, setShowSavedLettersModal] = useState(false);
  const [savedLetters, setSavedLetters] = useState<CoverLetterItem[]>([]);
  const [isLoadingLetters, setIsLoadingLetters] = useState(false);

  // Load saved letters when modal opens
  const handleOpenSavedModal = async () => {
    setShowSavedLettersModal(true);
    setIsLoadingLetters(true);
    try {
      const items = await listCoverLetters(authToken || undefined);
      setSavedLetters(items);
    } catch {
      // ignore
    } finally {
      setIsLoadingLetters(false);
    }
  };

  const handleGenerate = async () => {
    if (!resumeText || !jobDescription) {
      setError("Please ensure both resume text and job description are populated.");
      return;
    }
    try {
      setIsGenerating(true);
      setError(null);
      const res = await generateCoverLetter({
        resume_text: resumeText,
        job_description: jobDescription,
        company_name: companyName,
        target_role: targetRole,
        tone: tone,
        focus_points: focusPoints,
      });
      setCoverLetter(res);
      setCurrentLetterId(null);
      setCurrentLetterTitle(null);
      setSaveStatus("unsaved");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate cover letter.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyText = () => {
    if (!coverLetter) return;
    const full = `${coverLetter.candidate_name}\n${coverLetter.candidate_email} | ${coverLetter.candidate_phone}\n\n${coverLetter.date_formatted}\n\nRE: ${coverLetter.job_title} Application - ${coverLetter.company_name}\n\n${coverLetter.salutation}\n\n${coverLetter.paragraphs.map((p) => p.content).join("\n\n")}\n\n${coverLetter.closing_salutation}\n${coverLetter.candidate_name}`;
    navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async (format: "pdf" | "docx" | "txt") => {
    if (!coverLetter) return;
    try {
      setDownloadingFormat(format);
      await downloadCoverLetterExport(format, coverLetter);
    } catch (e: unknown) {
      alert("Download failed: " + (e instanceof Error ? e.message : "Error"));
    } finally {
      setDownloadingFormat(null);
    }
  };

  const updateParagraph = (index: number, newContent: string) => {
    if (!coverLetter) return;
    const updated = { ...coverLetter };
    updated.paragraphs = [...updated.paragraphs];
    updated.paragraphs[index] = {
      ...updated.paragraphs[index],
      content: newContent,
    };
    setCoverLetter(updated);
    setSaveStatus("unsaved");
  };

  // Open Save Prompt
  const handleOpenSavePrompt = () => {
    if (!coverLetter) return;
    if (!authToken && onRequireAuth) {
      onRequireAuth();
      return;
    }
    const defaultTitle = currentLetterTitle
      ? `${currentLetterTitle} (Edited)`
      : `${coverLetter.job_title || targetRole || "Role"} Cover Letter — ${coverLetter.company_name || companyName || "Organization"}`;
    setSaveTitleInput(defaultTitle);
    setShowSaveModal(true);
  };

  // Execute Save Cover Letter
  const executeSave = async (saveAsNew: boolean) => {
    if (!coverLetter || isSaving) return;
    try {
      setIsSaving(true);
      setSaveStatus("saving");
      const titleToSave = saveTitleInput.trim() || `${coverLetter.job_title} Cover Letter`;
      const idToPass = (!saveAsNew && currentLetterId) ? currentLetterId : undefined;

      const saved = await saveCoverLetter(
        {
          id: idToPass,
          title: titleToSave,
          company_name: coverLetter.company_name,
          job_title: coverLetter.job_title,
          cover_letter_data: coverLetter,
        },
        authToken || undefined
      );

      setCurrentLetterId(saved.id);
      setCurrentLetterTitle(saved.title);
      setSaveStatus("saved");
      setShowSaveModal(false);
    } catch (e: unknown) {
      setSaveStatus("error");
      alert("Failed to save cover letter: " + (e instanceof Error ? e.message : "Network error"));
    } finally {
      setIsSaving(false);
    }
  };

  // Load a saved cover letter from list
  const handleLoadSavedLetter = (item: CoverLetterItem) => {
    setCoverLetter(item.cover_letter_data);
    setCurrentLetterId(item.id);
    setCurrentLetterTitle(item.title);
    setCompanyName(item.company_name || item.cover_letter_data.company_name || "");
    setTargetRole(item.job_title || item.cover_letter_data.job_title || "");
    setSaveStatus("saved");
    setShowSavedLettersModal(false);
  };

  // Delete a saved cover letter
  const handleDeleteSavedLetter = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this saved cover letter?")) return;
    try {
      await deleteCoverLetter(id, authToken || undefined);
      setSavedLetters((prev) => prev.filter((item) => item.id !== id));
      if (currentLetterId === id) {
        setCurrentLetterId(null);
        setCurrentLetterTitle(null);
        setSaveStatus("unsaved");
      }
    } catch (err: unknown) {
      alert("Delete failed: " + (err instanceof Error ? err.message : "Error"));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Controls and Generator Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold tracking-wide">
              <FileText className="h-3.5 w-3.5" />
              <span>Tailored Cover Letter Studio</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Role-Specific Cover Letter Generator
            </h2>
            <p className="text-xs text-slate-500">
              Grounded exclusively in your verified resume facts. Never invents metrics, roles, or skills.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleOpenSavedModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              <span>Saved Letters</span>
            </button>

            <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 font-semibold">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Zero Hallucinations Verified</span>
            </div>
          </div>
        </div>

        {/* Input Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Company Name</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Target Role Title</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Full Stack Developer"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Writing Tone</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Confident & Impact-Driven">Confident & Impact-Driven</option>
              <option value="Formal & Executive">Formal & Executive</option>
              <option value="Modern Tech & Collaborative">Modern Tech & Collaborative</option>
              <option value="Concise & Direct">Concise & Direct</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Focus Priorities</label>
            <input
              type="text"
              value={focusPoints}
              onChange={(e) => setFocusPoints(e.target.value)}
              placeholder="e.g. Distributed architectures, latency tuning"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            <span>{isGenerating ? "Crafting Truthful Cover Letter..." : coverLetter ? "Regenerate Cover Letter" : "Generate Cover Letter"}</span>
          </button>
        </div>
      </div>

      {/* Render Cover Letter Paper Document Preview */}
      {coverLetter ? (
        <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-sm space-y-6 text-slate-800 font-sans leading-relaxed">
          {/* Header */}
          <div className="border-b border-slate-200 pb-6 space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {coverLetter.candidate_name}
            </h1>
            <p className="text-xs text-slate-600">
              {coverLetter.candidate_email} &nbsp;|&nbsp; {coverLetter.candidate_phone}
            </p>
          </div>

          <div className="text-xs font-semibold text-slate-500">
            {coverLetter.date_formatted}
          </div>

          <div className="text-xs font-bold text-slate-800">
            RE: {coverLetter.job_title} Application — {coverLetter.company_name}
          </div>

          <div className="text-sm font-semibold text-slate-800">
            {coverLetter.salutation}
          </div>

          {/* Editable Paragraphs */}
          <div className="space-y-4">
            {coverLetter.paragraphs.map((p, idx) => (
              <div key={idx} className="group relative rounded-xl hover:bg-slate-50/70 p-2 -mx-2 transition-colors">
                <div className="flex items-center justify-between text-[11px] font-bold text-indigo-700 uppercase tracking-wider mb-1 opacity-60 group-hover:opacity-100">
                  <span>{p.title}</span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Edit3 className="h-3 w-3" /> Click to edit
                  </span>
                </div>
                <textarea
                  value={p.content}
                  onChange={(e) => updateParagraph(idx, e.target.value)}
                  rows={4}
                  className="w-full bg-transparent border-0 p-0 text-sm leading-relaxed text-slate-700 focus:outline-none focus:ring-0 resize-y"
                />
              </div>
            ))}
          </div>

          {/* Signoff */}
          <div className="pt-4 space-y-2">
            <p className="text-sm text-slate-800">{coverLetter.closing_salutation}</p>
            <p className="text-base font-bold text-slate-900">{coverLetter.candidate_name}</p>
          </div>

          {/* ========================================================================= */}
          {/* ACTION TOOLBAR AT THE BOTTOM OF COVER LETTER PREVIEW: [ Save ] & [ Download ] */}
          {/* ========================================================================= */}
          <div className="mt-8 pt-6 border-t border-slate-200/90 -mx-4 -mb-4 sm:-mx-8 sm:-mb-8 p-4 sm:p-6 bg-slate-50/90 rounded-b-3xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Left: Save Status & Info */}
              <div className="flex items-center gap-2">
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
                {currentLetterTitle && (
                  <span className="text-xs text-slate-500 hidden md:inline truncate max-w-xs">
                    • {currentLetterTitle}
                  </span>
                )}
              </div>

              {/* Right: Side-by-Side Save & Download Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {/* SAVE COVER LETTER BUTTON */}
                <button
                  type="button"
                  onClick={handleOpenSavePrompt}
                  disabled={isSaving}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 px-4 py-2 text-xs font-bold text-white shadow-2xs disabled:opacity-50 transition-all cursor-pointer"
                  title="Save cover letter to your account"
                  aria-label="Save cover letter"
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                  <span>Save Cover Letter</span>
                </button>

                {/* DOWNLOAD BUTTON WITH FORMAT SELECTOR */}
                <div className="flex items-center rounded-xl bg-indigo-600 text-white shadow-2xs overflow-hidden">
                  <button
                    type="button"
                    onClick={() => handleDownload(downloadFormat)}
                    disabled={downloadingFormat !== null}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                    title={`Download cover letter as ${downloadFormat.toUpperCase()}`}
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

                  <div className="relative border-l border-indigo-500/80">
                    <select
                      value={downloadFormat}
                      onChange={(e) => setDownloadFormat(e.target.value as "pdf" | "docx" | "txt")}
                      className="appearance-none bg-indigo-600 text-white font-bold text-xs py-2 pl-2 pr-5 hover:bg-indigo-700 focus:outline-none cursor-pointer"
                      aria-label="Select cover letter export format"
                    >
                      <option value="pdf" className="bg-white text-slate-900">PDF</option>
                      <option value="docx" className="bg-white text-slate-900">DOCX</option>
                      <option value="txt" className="bg-white text-slate-900">TXT</option>
                    </select>
                  </div>
                </div>

                {/* COPY TEXT BUTTON */}
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
                  title="Copy full cover letter to clipboard"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? "Copied!" : "Copy"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mx-auto">
            <FileText className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800">No Cover Letter Generated Yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Synthesize your real career accomplishments into an aligned, compelling cover letter for <strong className="text-slate-700">{targetRole || "your target role"}</strong> at <strong className="text-slate-700">{companyName || "the hiring company"}</strong>.
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <Sparkles className="h-4 w-4" />
              <span>{isGenerating ? "Synthesizing Letter..." : "Generate Cover Letter Now"}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SAVE COVER LETTER DIALOG MODAL */}
      {/* ========================================================================= */}
      {showSaveModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="save-cover-letter-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200/80 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Save className="h-4 w-4" />
                </div>
                <h3 id="save-cover-letter-title" className="text-sm font-bold text-slate-900">
                  Save Cover Letter
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Cover Letter Title</label>
                <input
                  type="text"
                  value={saveTitleInput}
                  onChange={(e) => setSaveTitleInput(e.target.value)}
                  placeholder="e.g. Full Stack Developer Cover Letter — Acme Corp"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <p className="text-[11px] text-slate-500">
                Saves to your account database with your customized paragraphs and target company parameters.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                disabled={isSaving}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              {currentLetterId && (
                <button
                  type="button"
                  onClick={() => executeSave(false)}
                  disabled={isSaving}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all cursor-pointer"
                >
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  <span>Update Current</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => executeSave(true)}
                disabled={isSaving}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all cursor-pointer"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>{currentLetterId ? "Save as New" : "Save Cover Letter"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SAVED COVER LETTERS LIST MODAL */}
      {/* ========================================================================= */}
      {showSavedLettersModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="saved-letters-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200"
        >
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200/80 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <FolderOpen className="h-4 w-4" />
                </div>
                <div>
                  <h3 id="saved-letters-modal-title" className="text-sm font-bold text-slate-900">
                    Saved Cover Letters
                  </h3>
                  <p className="text-[11px] text-slate-500">Access and reload your tailored cover letters</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSavedLettersModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 py-1 pr-1 text-xs">
              {isLoadingLetters ? (
                <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                  <span>Loading saved cover letters...</span>
                </div>
              ) : savedLetters.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-600">No saved cover letters yet</p>
                  <p className="text-[11px]">Generate a cover letter and click &quot;Save Cover Letter&quot; at the bottom.</p>
                </div>
              ) : (
                savedLetters.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleLoadSavedLetter(item)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      currentLetterId === item.id
                        ? "border-indigo-400 bg-indigo-50/50"
                        : "border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/70"
                    }`}
                  >
                    <div className="space-y-0.5 max-w-[80%]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{item.title}</span>
                        {currentLetterId === item.id && (
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {item.job_title} {item.company_name ? `@ ${item.company_name}` : ""}
                        &nbsp;•&nbsp;
                        {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSavedLetter(item.id, e)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Delete cover letter"
                        aria-label="Delete cover letter"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSavedLettersModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
