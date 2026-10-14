"use client";

import React, { useRef, useState } from "react";
import {
  FileText,
  Upload,
  CloudUpload,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit3,
  Loader2,
  Sparkles,
  ShieldCheck,
  Info,
  Lock,
  FileCheck,
} from "lucide-react";
import { parseResumeFile } from "@/lib/api";
import { ContactInfo } from "@/lib/types";

interface ResumeCustomizerHeroFormProps {
  jobDescription: string;
  onJobDescriptionChange: (val: string) => void;
  resumeText: string;
  onResumeTextChange: (val: string) => void;
  uploadedFileName: string;
  onFileNameChange: (val: string) => void;
  onContactParsed: (contact: ContactInfo) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

export const ResumeCustomizerHeroForm: React.FC<ResumeCustomizerHeroFormProps> = ({
  jobDescription,
  onJobDescriptionChange,
  resumeText,
  onResumeTextChange,
  uploadedFileName,
  onFileNameChange,
  onContactParsed,
  onSubmit,
  isLoading,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [fileSizeBytes, setFileSizeBytes] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRawTextEditor, setShowRawTextEditor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileProcess = async (file: File) => {
    setErrorMessage(null);
    const validExtensions = [".pdf", ".docx"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();

    if (!validExtensions.includes(ext)) {
      setErrorMessage("Please upload a valid PDF or DOCX file format.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("File exceeds 5MB size limit. Please upload a smaller document.");
      return;
    }

    try {
      setIsParsing(true);
      setFileSizeBytes(file.size);
      const res = await parseResumeFile(file);
      onFileNameChange(file.name);
      onResumeTextChange(res.text);
      if (res.contact_info) {
        onContactParsed(res.contact_info);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to parse resume document.");
    } finally {
      setIsParsing(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleClearResume = () => {
    onFileNameChange("");
    onResumeTextChange("");
    setFileSizeBytes(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isFormValid =
    jobDescription.trim().length >= 20 && resumeText.trim().length >= 20;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {/* Hero Header Section */}
      <div className="text-center space-y-3 pt-2 sm:pt-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-200/80 px-3.5 py-1 text-xs font-semibold text-indigo-700 shadow-2xs">
          <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
          <span>AI-Powered Resume Customizer</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Your Experience. The Right Opportunity.
        </h1>

        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Tailor your resume precisely to any target job description without compromising truthfulness or inventing accomplishments.
        </p>

        {/* Value Proposition Pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs text-slate-600">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700 border border-slate-200">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Zero Hallucination Grounding</span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700 border border-slate-200">
            <FileCheck className="h-3.5 w-3.5 text-indigo-600" />
            <span>Recruiter ATS Format</span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700 border border-slate-200">
            <Lock className="h-3.5 w-3.5 text-amber-600" />
            <span>Private & Ephemeral Processing</span>
          </div>
        </div>
      </div>

      {/* Main Two-Card Input Grid */}
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Card 1: Job Description */}
          <div className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/60">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Job Description
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Paste target role specifications
                    </p>
                  </div>
                </div>

                {jobDescription.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onJobDescriptionChange("")}
                    className="text-slate-400 hover:text-red-500 transition-colors font-medium text-xs px-2 py-1 rounded-lg hover:bg-slate-50"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="relative">
                <label htmlFor="job-description-input" className="sr-only">
                  Target job description
                </label>
                <textarea
                  id="job-description-input"
                  value={jobDescription}
                  onChange={(e) => onJobDescriptionChange(e.target.value)}
                  placeholder="Paste the role requirements, responsibilities, and target tech stack..."
                  rows={8}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/40 p-4 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* Sub-row: Validation status & character count */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                {jobDescription.trim().length >= 300 ? (
                  <span className="flex items-center gap-1 text-emerald-600 font-semibold text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5" /> High keyword coverage
                  </span>
                ) : jobDescription.trim().length >= 20 ? (
                  <span className="flex items-center gap-1 text-indigo-600 font-semibold text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Validated
                  </span>
                ) : (
                  <span className="text-slate-400 text-xs flex items-center gap-1">
                    <Info className="h-3 w-3" /> Min 20 characters required
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded-md text-slate-600">
                  {jobDescription.length.toLocaleString()} chars
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Your Resume */}
          <div className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/60">
                    <Upload className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Your Resume
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Original document source
                    </p>
                  </div>
                </div>

                {resumeText && (
                  <button
                    type="button"
                    onClick={() => setShowRawTextEditor(!showRawTextEditor)}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-50"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>{showRawTextEditor ? "Show File View" : "Edit Raw Text"}</span>
                  </button>
                )}
              </div>

              {/* Upload Dropzone Box or Raw Text Editor */}
              {showRawTextEditor ? (
                <div>
                  <textarea
                    value={resumeText}
                    onChange={(e) => onResumeTextChange(e.target.value)}
                    placeholder="Candidate resume raw text..."
                    rows={8}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/40 p-4 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all resize-none leading-relaxed"
                  />
                </div>
              ) : uploadedFileName && resumeText ? (
                <div className="h-[200px] flex flex-col justify-between rounded-2xl border border-emerald-200 bg-emerald-50/30 p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <div className="truncate max-w-[200px] sm:max-w-[280px]">
                        <h3 className="text-sm font-bold text-slate-900 truncate">
                          {uploadedFileName}
                        </h3>
                        <p className="text-xs text-emerald-700 font-medium mt-0.5">
                          Extracted {resumeText.length.toLocaleString()} characters safely
                          {fileSizeBytes ? ` (${formatFileSize(fileSizeBytes)})` : ""}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleClearResume}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-red-500 transition-colors cursor-pointer"
                      title="Remove file"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-emerald-100">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                    >
                      Replace File
                    </button>
                    <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                      Ready to customize
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      fileInputRef.current?.click();
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label="Upload resume file dropzone. Click or drag PDF or DOCX file."
                  className={`group relative flex h-[200px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
                    isDragging
                      ? "border-indigo-600 bg-indigo-50/50"
                      : "border-slate-200 bg-slate-50/40 hover:border-indigo-400 hover:bg-slate-50/80"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileProcess(e.target.files[0]);
                      }
                    }}
                  />

                  {isParsing ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                      <p className="text-xs font-semibold text-slate-700">
                        Extracting resume text safely on Python backend...
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Validating MIME type and structure
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-xs group-hover:scale-105 transition-transform border border-slate-100">
                        <CloudUpload className="h-6 w-6" />
                      </div>
                      <h3 className="mt-3 text-sm font-bold text-slate-800">
                        Drop PDF or DOCX here
                      </h3>
                      <p className="mt-0.5 text-xs text-indigo-600 font-semibold group-hover:underline">
                        or browse files from your computer
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Sub-row: File size and format validation */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>File validation</span>
              <span className="font-medium text-slate-700 text-[11px]">
                PDF or DOCX (max 5MB)
              </span>
            </div>
          </div>
        </div>

        {/* Error Notification Alert */}
        {errorMessage && (
          <div className="flex items-center gap-2.5 rounded-2xl bg-red-50 p-4 text-xs font-semibold text-red-700 border border-red-200 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span className="flex-1">{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-500 hover:text-red-700"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Big Action Button: "✨ Customize my resume" */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading || !isFormValid}
            className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 py-4 px-6 text-sm sm:text-base font-bold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-700 hover:to-violet-700 hover:shadow-indigo-500/30 active:scale-99 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Tailoring Your Resume Truthfully...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                <span>Customize my resume</span>
              </>
            )}
          </button>
          {!isFormValid && (
            <p className="text-center text-[11px] text-slate-400 mt-2">
              Please provide both a target job description and an uploaded resume (min 20 characters each) to customize.
            </p>
          )}
        </div>
      </form>
    </div>
  );
};

