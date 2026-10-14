"use client";

import React, { useState } from "react";
import {
  Undo2,
  Redo2,
  Palette,
  Send,
  Sparkles,
  Edit3,
  Check,
  ZoomIn,
  ZoomOut,
  Loader2,
  Lock,
  Unlock,
  RefreshCw,
} from "lucide-react";
import {
  ResumeVersionItem,
  TailoredResumeResponse,
  ResumeCustomizerOptions,
  ResumeTemplateId,
  ResumeColorAccent,
} from "@/lib/types";
import { ResumeSaveDownloadBar, SaveStatus } from "./ResumeSaveDownloadBar";

interface InteractiveResumeCanvasProps {
  data: TailoredResumeResponse;
  options: ResumeCustomizerOptions;
  onOptionsChange: (newOptions: ResumeCustomizerOptions) => void;
  onUpdateResume: (updated: TailoredResumeResponse) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onRefineWithAI: (instruction: string) => Promise<void>;
  isRefining: boolean;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
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
}

export const InteractiveResumeCanvas: React.FC<InteractiveResumeCanvasProps> = ({
  data,
  options,
  onOptionsChange,
  onUpdateResume,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onRefineWithAI,
  isRefining,
  onRegenerate,
  isRegenerating,
  currentVersionId,
  currentVersionName,
  targetRole,
  companyName,
  jobDescription,
  targetTechStack,
  authToken,
  onRequireAuth,
  onSavedSuccess,
  saveStatus,
  setSaveStatus,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [promptInput, setPromptInput] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isProtectedUnlocked, setIsProtectedUnlocked] = useState(false);

  // Template Accent Colors
  const accentClasses: Record<ResumeColorAccent, { text: string; bg: string; border: string }> = {
    indigo: { text: "text-indigo-600", bg: "bg-indigo-600", border: "border-indigo-600" },
    emerald: { text: "text-emerald-600", bg: "bg-emerald-600", border: "border-emerald-600" },
    slate: { text: "text-slate-800", bg: "bg-slate-800", border: "border-slate-800" },
    blue: { text: "text-blue-600", bg: "bg-blue-600", border: "border-blue-600" },
    violet: { text: "text-violet-600", bg: "bg-violet-600", border: "border-violet-600" },
  };

  const currentAccent = accentClasses[options.accentColor] || accentClasses.indigo;

  // Handle Quick AI Prompt submit
  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim() || isRefining) return;
    const p = promptInput;
    setPromptInput("");
    await onRefineWithAI(p);
  };

  // Inline edit handlers
  const handleFieldChange = (path: string, value: string) => {
    const updated = JSON.parse(JSON.stringify(data)) as TailoredResumeResponse;
    if (path === "name") updated.contact_info.name = value;
    else if (path === "summary") updated.tailored_summary = value;
    setSaveStatus?.("unsaved");
    onUpdateResume(updated);
  };

  const handleBulletChange = (expIdx: number, bulletIdx: number, val: string) => {
    const updated = JSON.parse(JSON.stringify(data)) as TailoredResumeResponse;
    if (updated.work_experience[expIdx]?.bullets[bulletIdx]) {
      updated.work_experience[expIdx].bullets[bulletIdx].tailored = val;
      setSaveStatus?.("unsaved");
      onUpdateResume(updated);
    }
  };

  return (
    <div className="flex flex-col rounded-3xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-6 gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Resume Preview
          </span>
          <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-bold">
            Interactive Editor
          </span>
        </div>

        {/* Action Controls: Undo/Redo, Page, Template, Accent Color, Zoom */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Undo / Redo */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors cursor-pointer"
              title="Undo modification"
              aria-label="Undo modification"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors cursor-pointer"
              title="Redo modification"
              aria-label="Redo modification"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Regenerate Button */}
          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 shadow-2xs hover:bg-indigo-100 disabled:opacity-50 transition-colors cursor-pointer"
              title="Regenerate allowed sections while strictly preserving protected candidate details"
            >
              <RefreshCw className={`h-3 w-3 ${isRegenerating ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Regenerate</span>
            </button>
          )}

          {/* Template Selector */}

          <div className="flex items-center gap-1">
            <label htmlFor="template-select" className="sr-only">
              Resume Template
            </label>
            <select
              id="template-select"
              value={options.template}
              onChange={(e) =>
                onOptionsChange({ ...options, template: e.target.value as ResumeTemplateId })
              }
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs focus:border-indigo-500 focus:outline-none"
            >
              <option value="neo">Neo Modern</option>
              <option value="classic">Classic Executive (Serif)</option>
              <option value="modern">Modern Minimal</option>
              <option value="compact">Compact Tech</option>
            </select>
          </div>

          {/* Color Accent Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              aria-label="Select accent color"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
              title="Customize Accent Color"
            >
              <Palette className="h-3.5 w-3.5 text-indigo-600" />
              <span className="hidden sm:inline capitalize">{options.accentColor}</span>
            </button>

            {showColorPicker && (
              <div className="absolute right-0 top-full mt-1.5 z-20 flex gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                {(["indigo", "emerald", "blue", "slate", "violet"] as ResumeColorAccent[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      onOptionsChange({ ...options, accentColor: c });
                      setShowColorPicker(false);
                    }}
                    title={`Accent: ${c}`}
                    className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer flex items-center justify-center ${
                      options.accentColor === c ? "border-slate-900 scale-105" : "border-transparent"
                    } ${
                      c === "indigo"
                        ? "bg-indigo-600"
                        : c === "emerald"
                        ? "bg-emerald-600"
                        : c === "blue"
                        ? "bg-blue-600"
                        : c === "violet"
                        ? "bg-violet-600"
                        : "bg-slate-800"
                    }`}
                  >
                    {options.accentColor === c && <Check className="h-3 w-3 text-white" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Zoom controls */}
          <div className="hidden sm:flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 shadow-2xs">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
              aria-label="Zoom out"
              className="hover:text-slate-900 cursor-pointer"
            >
              <ZoomOut className="h-3 w-3" />
            </button>
            <span className="text-[11px] font-mono w-9 text-center">{zoomLevel}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
              aria-label="Zoom in"
              className="hover:text-slate-900 cursor-pointer"
            >
              <ZoomIn className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Inline Edit Guidance Notice */}
      <div className="px-6 py-2 bg-indigo-50/50 border-b border-indigo-100/60 flex items-center justify-between text-[11px] text-indigo-900">
        <div className="flex items-center gap-1.5">
          <Edit3 className="h-3 w-3 text-indigo-600" />
          <span>Click any title, summary, or bullet point below to edit text inline.</span>
        </div>
        <span className="font-semibold text-indigo-700 hidden sm:inline">
          Exports reflect your live edits
        </span>
      </div>

      {/* Rendered Document Paper View */}
      <div className="overflow-x-auto p-4 sm:p-8 bg-slate-100/80 flex justify-center">
        <div
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
          className={`w-full max-w-[780px] bg-white rounded-lg shadow-xl border border-slate-200/90 p-8 sm:p-12 text-slate-800 text-xs transition-transform duration-150 ${
            options.template === "classic"
              ? "font-serif leading-relaxed"
              : options.template === "compact"
              ? "font-sans leading-tight"
              : "font-sans leading-normal"
          }`}
        >
          {/* Protected Fields Safeguard Banner */}
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-dashed border-slate-200 text-[11px]">
            <div className="flex items-center gap-1.5 font-medium">
              {isProtectedUnlocked ? (
                <>
                  <Unlock className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-amber-800 font-semibold">Protected Fields Unlocked for Manual Editing</span>
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-800">Original Personal &amp; Factual Details Protected</span>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsProtectedUnlocked(!isProtectedUnlocked)}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 underline transition-colors cursor-pointer"
            >
              {isProtectedUnlocked ? "Lock & Safeguard" : "Unlock to Edit"}
            </button>
          </div>

          {/* Name & Contact */}
          <div
            className={`pb-4 border-b ${
              options.template === "classic"
                ? "text-center border-slate-300"
                : options.template === "modern"
                ? "text-left border-indigo-200"
                : "text-center border-slate-200"
            }`}
          >
            {isProtectedUnlocked ? (
              <input
                type="text"
                aria-label="Candidate Name"
                value={options.fullName || data.contact_info.name || "Candidate Name"}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                className={`w-full text-2xl font-black uppercase tracking-tight text-slate-900 bg-transparent border-b border-indigo-300 focus:border-indigo-500 focus:outline-none transition-colors ${
                  options.template === "classic" || options.template === "neo" ? "text-center" : "text-left"
                }`}
              />
            ) : (
              <h1
                className={`w-full text-2xl font-black uppercase tracking-tight text-slate-900 ${
                  options.template === "classic" || options.template === "neo" ? "text-center" : "text-left"
                }`}
              >
                {options.fullName || data.contact_info.name || "Candidate Name"}
              </h1>
            )}

            <div
              className={`mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600 font-medium ${
                options.template === "classic" || options.template === "neo"
                  ? "justify-center"
                  : "justify-start"
              }`}
            >
              {data.contact_info.email && <span>{data.contact_info.email}</span>}
              {data.contact_info.phone && <span>• {data.contact_info.phone}</span>}
              {data.contact_info.location && <span>• {data.contact_info.location}</span>}
              {options.website && <span>• {options.website}</span>}
              {data.contact_info.linkedin && <span>• {data.contact_info.linkedin}</span>}
              {data.contact_info.github && <span>• {data.contact_info.github}</span>}
            </div>
          </div>


          {/* Profile Summary */}
          {options.includeSummary && (data.tailored_summary || data.original_summary) && (
            <div className="mt-5">
              <h2
                className={`text-xs font-bold uppercase tracking-wider pb-1 border-b border-slate-200 ${currentAccent.text}`}
              >
                Professional Summary
              </h2>
              <textarea
                aria-label="Professional Summary"
                value={data.tailored_summary || data.original_summary}
                onChange={(e) => handleFieldChange("summary", e.target.value)}
                rows={3}
                className="mt-2 w-full text-xs text-slate-700 leading-relaxed bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-400 rounded-md p-1 resize-none focus:outline-none transition-colors text-justify"
              />
            </div>
          )}

          {/* Work Experience */}
          {data.work_experience && data.work_experience.length > 0 && (
            <div className="mt-5">
              <h2
                className={`text-xs font-bold uppercase tracking-wider pb-1 border-b border-slate-200 ${currentAccent.text}`}
              >
                Professional Experience
              </h2>

              <div className="mt-3 space-y-4">
                {data.work_experience.map((exp, expIdx) => {
                  const visibleBullets = exp.bullets.slice(0, options.bulletsPerExperience);

                  return (
                    <div key={expIdx}>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                        <div>
                          <span>{exp.position}</span>
                          <span className="font-semibold text-slate-600"> | {exp.company}</span>
                          {exp.location && (
                            <span className="font-normal text-slate-500">, {exp.location}</span>
                          )}
                        </div>
                        <span className="text-slate-500 font-medium text-[11px]">
                          {exp.start_date || ""} –{" "}
                          {exp.is_current ? "Present" : exp.end_date || "Present"}
                        </span>
                      </div>

                      <ul className="mt-1.5 list-disc list-outside pl-4 space-y-1.5 text-slate-700 leading-relaxed">
                        {visibleBullets.map((b, bIdx) => (
                          <li key={bIdx} className="group relative pl-0.5">
                            <textarea
                              aria-label={`Bullet point ${bIdx + 1} for ${exp.position}`}
                              value={b.tailored || b.original}
                              rows={2}
                              onChange={(e) =>
                                handleBulletChange(expIdx, bIdx, e.target.value)
                              }
                              className="w-full text-xs text-slate-700 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-400 focus:outline-none rounded p-0.5 transition-colors resize-none leading-relaxed"
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Skills */}
          {options.includeSkills && data.skills && Object.keys(data.skills).length > 0 && (
            <div className="mt-5">
              <h2
                className={`text-xs font-bold uppercase tracking-wider pb-1 border-b border-slate-200 ${currentAccent.text}`}
              >
                Technical Skills & Tools
              </h2>

              <div className="mt-2 space-y-1">
                {Object.entries(data.skills).map(([category, items], idx) => {
                  if (!items || items.length === 0) return null;
                  return (
                    <div key={idx} className="text-xs">
                      <span className="font-bold text-slate-900">{category}: </span>
                      <span className="text-slate-700">{items.join(", ")}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Education */}
          {options.includeEducation && data.education && data.education.length > 0 && (
            <div className="mt-5">
              <h2
                className={`text-xs font-bold uppercase tracking-wider pb-1 border-b border-slate-200 ${currentAccent.text}`}
              >
                Education
              </h2>

              <div className="mt-2 space-y-1">
                {data.education.map((edu, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{edu.degree}</span>
                      <span className="text-slate-600"> — {edu.institution}</span>
                      {edu.gpa && <span className="text-slate-500"> (GPA: {edu.gpa})</span>}
                    </div>
                    {edu.graduation_date && (
                      <span className="text-slate-500 text-[11px]">{edu.graduation_date}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {options.includeCertifications &&
            data.certifications &&
            data.certifications.length > 0 && (
              <div className="mt-5">
                <h2
                  className={`text-xs font-bold uppercase tracking-wider pb-1 border-b border-slate-200 ${currentAccent.text}`}
                >
                  Certifications
                </h2>

                <ul className="mt-2 list-disc list-outside pl-4 space-y-0.5 text-xs text-slate-700">
                  {data.certifications.map((cert, idx) => (
                    <li key={idx}>{cert}</li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      </div>

      {/* Edit Your Resume With AI (Conversational Refinement Box) */}
      <div className="border-t border-slate-100 bg-slate-50/70 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <h3 className="text-xs font-bold text-slate-800">
            Refine Resume with AI Assistant
          </h3>
        </div>

        <form onSubmit={handlePromptSubmit} className="space-y-2">
          <div className="relative">
            <textarea
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="Enter a prompt to refine your tailored resume (e.g. 'Make bullets more concise', 'Highlight cloud and microservices', 'Strengthen action verbs')..."
              rows={2}
              className="w-full rounded-2xl border border-slate-200 bg-white p-3 pr-12 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-100 leading-relaxed shadow-xs"
            />
            <button
              type="submit"
              disabled={isRefining || !promptInput.trim()}
              className="absolute right-3 bottom-3.5 flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 disabled:opacity-40 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500"
              title="Apply prompt"
              aria-label="Submit refinement prompt"
            >
              {isRefining ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[10px] text-slate-400 self-center mr-1">Suggested prompts:</span>
            {[
              "Make bullets more quantifiable",
              "Strengthen action verbs",
              "Shorten professional summary",
              "Emphasize distributed system scaling",
            ].map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setPromptInput(chip)}
                className="rounded-lg bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 transition-colors shadow-2xs cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>
        </form>

        {/* Mandatory Action Toolbar at Bottom of Resume Preview: Save Resume & Download PDF / DOCX / TXT */}
        <div className="mt-5 pt-4 border-t border-slate-200/80">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/80 p-3 sm:p-4 rounded-2xl border border-slate-200/70">
            <div className="text-xs text-slate-500 text-center sm:text-left">
              <span className="font-bold text-slate-700">Resume Finalization:</span>{" "}
              <span>Save custom version or export single-page ATS-formatted document with your latest edits.</span>
            </div>
            <ResumeSaveDownloadBar
              data={data}
              currentVersionId={currentVersionId}
              currentVersionName={currentVersionName}
              targetRole={targetRole || options.targetRole}
              companyName={companyName}
              jobDescription={jobDescription}
              targetTechStack={targetTechStack || options.requiredTechStack}
              authToken={authToken}
              onRequireAuth={onRequireAuth}
              onSavedSuccess={onSavedSuccess}
              saveStatus={saveStatus}
              setSaveStatus={setSaveStatus}
              compact
            />
          </div>
        </div>
      </div>
    </div>
  );
};
