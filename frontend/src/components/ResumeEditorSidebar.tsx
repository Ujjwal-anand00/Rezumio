"use client";

import React, { useRef, useState } from "react";
import {
  Upload,
  CheckCircle2,
  Wand2,
  Loader2,
  Briefcase,
  Sparkles,
  Plus,
  X,
  Cpu,
} from "lucide-react";
import { parseResumeFile, extractTechStack } from "@/lib/api";
import { ContactInfo, ResumeCustomizerOptions } from "@/lib/types";

interface ResumeEditorSidebarProps {
  options: ResumeCustomizerOptions;
  onOptionsChange: (newOptions: ResumeCustomizerOptions) => void;
  jobDescription: string;
  onJobDescriptionChange: (jd: string) => void;
  uploadedFileName: string;
  onFileNameChange: (name: string) => void;
  resumeText: string;
  onResumeTextChange: (text: string) => void;
  onContactParsed: (contact: ContactInfo) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

const PRESET_ROLES = [
  "Full Stack Developer",
  "Frontend Developer",
  "Backend Developer",
  "Software Engineer",
];

export const ResumeEditorSidebar: React.FC<ResumeEditorSidebarProps> = ({
  options,
  onOptionsChange,
  jobDescription,
  onJobDescriptionChange,
  uploadedFileName,
  onFileNameChange,
  resumeText,
  onResumeTextChange,
  onContactParsed,
  onSubmit,
  isLoading,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newTechInput, setNewTechInput] = useState("");
  const [isDetectingTech, setIsDetectingTech] = useState(false);

  const updateOption = <K extends keyof ResumeCustomizerOptions>(
    key: K,
    val: ResumeCustomizerOptions[K]
  ) => {
    onOptionsChange({ ...options, [key]: val });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    try {
      const res = await parseResumeFile(file);
      onFileNameChange(file.name);
      onResumeTextChange(res.text);
      if (res.contact_info) {
        onContactParsed(res.contact_info);
        if (res.contact_info.name) {
          updateOption("fullName", res.contact_info.name);
        }
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to parse file");
    }
  };

  // Auto-detect tech stack when JD is provided and stack is currently empty
  const handleDetectTechStack = async () => {
    if (!jobDescription || jobDescription.trim().length < 20) return;
    try {
      setIsDetectingTech(true);
      const detected = await extractTechStack(jobDescription);
      if (detected.length > 0) {
        // Merge with existing unique
        const current = options.requiredTechStack || [];
        const merged = Array.from(new Set([...current, ...detected]));
        updateOption("requiredTechStack", merged);
      }
    } catch {
      // ignore
    } finally {
      setIsDetectingTech(false);
    }
  };

  const handleAddCustomTech = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTechInput.trim();
    if (!clean) return;
    const current = options.requiredTechStack || [];
    if (!current.includes(clean)) {
      updateOption("requiredTechStack", [...current, clean]);
    }
    setNewTechInput("");
  };

  const handleRemoveTech = (techToRemove: string) => {
    const current = options.requiredTechStack || [];
    updateOption(
      "requiredTechStack",
      current.filter((t) => t !== techToRemove)
    );
  };

  return (
    <aside className="w-full rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm overflow-y-auto">
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Full Name */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-700">Full Name</label>
            {options.fullName && (
              <button
                type="button"
                onClick={() => updateOption("fullName", "")}
                className="text-[11px] text-slate-400 hover:text-red-500 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          <input
            type="text"
            value={options.fullName}
            onChange={(e) => updateOption("fullName", e.target.value)}
            placeholder="e.g. Jane Doe"
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-100"
          />
        </div>

        {/* Target Job Title */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-indigo-600" />
              <label className="text-xs font-semibold text-slate-700">Target Job Title</label>
            </div>
            {options.targetRole && (
              <button
                type="button"
                onClick={() => updateOption("targetRole", "")}
                className="text-[11px] text-slate-400 hover:text-red-500 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          <input
            type="text"
            value={options.targetRole || ""}
            onChange={(e) => updateOption("targetRole", e.target.value)}
            placeholder="e.g. Full Stack Developer, Frontend Developer"
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-100"
          />
          {/* Quick Preset Role Selection Pills */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {PRESET_ROLES.map((role) => {
              const isSelected = options.targetRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => updateOption("targetRole", role)}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-2xs font-semibold"
                      : "border-slate-200 bg-slate-50/60 text-slate-600 hover:border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {role}
                </button>
              );
            })}
          </div>
        </div>


        {/* Job Description */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-700">Job Description</label>
            {jobDescription && (
              <button
                type="button"
                onClick={() => onJobDescriptionChange("")}
                className="text-[11px] text-slate-400 hover:text-red-500 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          <textarea
            value={jobDescription}
            onChange={(e) => onJobDescriptionChange(e.target.value)}
            placeholder="Paste target job description..."
            rows={5}
            className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-100 leading-relaxed"
          />
          <div className="text-[11px] text-slate-400 text-right mt-0.5">
            {jobDescription.length.toLocaleString()} characters
          </div>
        </div>

        {/* Required Technology Stack (from Job Description) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-indigo-600" />
              <label className="text-xs font-semibold text-slate-700">
                Required Tech Stack
              </label>
              {options.requiredTechStack && options.requiredTechStack.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  {options.requiredTechStack.length}
                </span>
              )}
            </div>
            <button
              type="button"
              disabled={isDetectingTech || !jobDescription || jobDescription.trim().length < 20}
              onClick={handleDetectTechStack}
              className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 disabled:opacity-40 transition-colors font-medium cursor-pointer"
            >
              {isDetectingTech ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              <span>Auto-Detect from JD</span>
            </button>
          </div>

          {/* Active Tech Stack Badges */}
          <div className="min-h-[42px] rounded-xl border border-slate-200 bg-slate-50/50 p-2 text-xs">
            {options.requiredTechStack && options.requiredTechStack.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {options.requiredTechStack.map((tech) => (
                  <span
                    key={tech}
                    className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 shadow-2xs group"
                  >
                    <span>{tech}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTech(tech)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                      aria-label={`Remove ${tech}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">
                Paste a job description and click &ldquo;Auto-Detect from JD&rdquo; or add technologies below.
              </p>
            )}
          </div>

          {/* Add custom technology input */}
          <div className="flex items-center gap-1.5 mt-2">
            <input
              type="text"
              value={newTechInput}
              onChange={(e) => setNewTechInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCustomTech(e);
                }
              }}
              placeholder="Add skill (e.g. Docker, GraphQL)..."
              className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddCustomTech}
              disabled={!newTechInput.trim()}
              className="flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              <span>Add</span>
            </button>
          </div>
        </div>


        {/* Upload Resume (Optional) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-700">
              Upload Resume (Optional PDF / DOCX)
            </label>
            {uploadedFileName && (
              <button
                type="button"
                onClick={() => {
                  onFileNameChange("");
                  onResumeTextChange("");
                }}
                className="text-[11px] text-slate-400 hover:text-red-500 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            onChange={handleFileUpload}
            className="hidden"
          />

          {uploadedFileName ? (
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5 text-xs text-emerald-800">
              <div className="flex items-center gap-2 truncate">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span className="truncate font-medium">{uploadedFileName}</span>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] text-indigo-600 hover:underline shrink-0 ml-2 font-medium"
              >
                Change
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 py-2.5 text-xs font-medium text-slate-700 hover:border-indigo-400 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5 text-slate-500" />
              <span>Upload your resume</span>
            </button>
          )}
        </div>

        {/* Personal Website */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-700">Personal Website (Optional)</label>
            {options.website && (
              <button
                type="button"
                onClick={() => updateOption("website", "")}
                className="text-[11px] text-slate-400 hover:text-red-500 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          <input
            type="text"
            value={options.website}
            onChange={(e) => updateOption("website", e.target.value)}
            placeholder="https://portfolio.dev"
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-100"
          />
        </div>

        {/* Language & Tone dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">Language</label>
            <select
              value={options.language}
              onChange={(e) => updateOption("language", e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
            >
              <option value="English (United States)">English (US)</option>
              <option value="English (United Kingdom)">English (UK)</option>
              <option value="English (Canada)">English (Canada)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">Tone of Resume</label>
            <select
              value={options.tone}
              onChange={(e) => updateOption("tone", e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
            >
              <option value="Professional and Formal">Professional & Formal</option>
              <option value="Impact & Metric Driven">Impact & Metric-Driven</option>
              <option value="Confident & Modern">Confident & Modern</option>
              <option value="Concise & Direct">Concise & Direct</option>
            </select>
          </div>
        </div>

        {/* Section Toggles */}
        <div className="pt-2 border-t border-slate-100 space-y-2.5">
          <label className="text-xs font-bold text-slate-900 block mb-1">Include Sections</label>

          {/* Profile Summary */}
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={options.includeSummary}
              onChange={(e) => updateOption("includeSummary", e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <div className="text-xs font-semibold text-slate-800">Include Profile Summary</div>
              <div className="text-[11px] text-slate-400">Toggle to include or exclude summary</div>
            </div>
          </label>

          {/* Skills */}
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={options.includeSkills}
              onChange={(e) => updateOption("includeSkills", e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <div className="text-xs font-semibold text-slate-800">Include Technical Skills</div>
              <div className="text-[11px] text-slate-400">Categorized competencies section</div>
            </div>
          </label>

          {/* Bullets Slider */}
          <div className="pt-1">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-1">
              <span>Bullet Points per Experience</span>
              <span className="font-bold text-indigo-600">{options.bulletsPerExperience}</span>
            </div>
            <input
              type="range"
              min="1"
              max="6"
              value={options.bulletsPerExperience}
              onChange={(e) => updateOption("bulletsPerExperience", parseInt(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="text-[11px] text-slate-400 mt-0.5">
              Adjust maximum bullet density per position (1 - 6)
            </div>
          </div>

          {/* Education */}
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={options.includeEducation}
              onChange={(e) => updateOption("includeEducation", e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <div className="text-xs font-semibold text-slate-800">Include Education</div>
              <div className="text-[11px] text-slate-400">Academic credentials and institutions</div>
            </div>
          </label>

          {/* Certifications */}
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={options.includeCertifications}
              onChange={(e) => updateOption("includeCertifications", e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <div className="text-xs font-semibold text-slate-800">Include Certifications</div>
              <div className="text-[11px] text-slate-400">Verified credentials and licenses</div>
            </div>
          </label>

          {/* Projects */}
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={options.includeProjects}
              onChange={(e) => updateOption("includeProjects", e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <div className="text-xs font-semibold text-slate-800">Include Project Highlights</div>
              <div className="text-[11px] text-slate-400">Key open-source and product deliveries</div>
            </div>
          </label>
        </div>

        {/* Generate Resume Action Button */}
        <div className="pt-3">
          <button
            type="submit"
            disabled={isLoading || !jobDescription || !resumeText}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:from-blue-700 hover:to-indigo-700 active:scale-98 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Tailoring Resume...</span>
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                <span>Generate Resume</span>
              </>
            )}
          </button>
          <p className="mt-2 text-center text-[10px] text-slate-400 leading-tight">
            The generated text preserves 100% truthfulness. You can click Generate again or edit manually.
          </p>
        </div>
      </form>
    </aside>
  );
};
