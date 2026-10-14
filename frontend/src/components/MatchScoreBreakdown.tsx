"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Target,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from "lucide-react";
import { MatchScoreResponse, RequirementItem } from "@/lib/types";
import { getMatchScore } from "@/lib/api";

interface MatchScoreBreakdownProps {
  resumeText: string;
  jobDescription: string;
}

export const MatchScoreBreakdown: React.FC<MatchScoreBreakdownProps> = ({
  resumeText,
  jobDescription,
}) => {
  const [data, setData] = useState<MatchScoreResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "matched" | "partially_matched" | "missing">("all");
  const [copiedMissing, setCopiedMissing] = useState(false);
  const [expandedReqs, setExpandedReqs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;
    async function loadScore() {
      if (!resumeText || !jobDescription) return;
      try {
        setLoading(true);
        const res = await getMatchScore({
          resume_text: resumeText,
          job_description: jobDescription,
        });
        if (isMounted) setData(res);
      } catch (e) {
        console.error("Match score fetch failed", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadScore();
    return () => {
      isMounted = false;
    };
  }, [resumeText, jobDescription]);

  // Construct normalized, deduplicated list of RequirementItems
  const allRequirements: RequirementItem[] = useMemo(() => {
    if (!data) return [];
    if (data.requirements && data.requirements.length > 0) {
      // Deduplicate by requirement text
      const map = new Map<string, RequirementItem>();
      for (const req of data.requirements) {
        const key = req.requirement.toLowerCase().trim();
        if (!map.has(key)) {
          map.set(key, req);
        }
      }
      return Array.from(map.values());
    }

    // Fallback synthesis if requirements array was omitted by older backend response
    const synthesized: RequirementItem[] = [];
    const seen = new Set<string>();

    for (const s of data.matched_skills || []) {
      const key = s.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        synthesized.push({
          requirement: s,
          category: "technical_skill",
          status: "matched",
          explanation: "Confirmed in candidate resume.",
        });
      }
    }

    for (const s of data.partially_matched_skills || []) {
      const key = s.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        synthesized.push({
          requirement: s,
          category: "technical_skill",
          status: "partially_matched",
          explanation: "Related or adjacent experience detected.",
        });
      }
    }

    for (const s of data.missing_skills || []) {
      const key = s.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        synthesized.push({
          requirement: s,
          category: "technical_skill",
          status: "missing",
          explanation: "No supporting evidence found in resume.",
        });
      }
    }

    return synthesized;
  }, [data]);

  const matchedList = useMemo(() => allRequirements.filter((r) => r.status === "matched"), [allRequirements]);
  const partialList = useMemo(() => allRequirements.filter((r) => r.status === "partially_matched"), [allRequirements]);
  const missingList = useMemo(() => allRequirements.filter((r) => r.status === "missing"), [allRequirements]);

  const counts = {
    all: allRequirements.length,
    matched: matchedList.length,
    partial: partialList.length,
    missing: missingList.length,
  };

  const handleCopyMissing = () => {
    if (missingList.length === 0) return;
    const missingText = missingList.map((r) => r.requirement).join(", ");
    navigator.clipboard.writeText(missingText);
    setCopiedMissing(true);
    setTimeout(() => setCopiedMissing(false), 2000);
  };

  const toggleExpand = (reqKey: string) => {
    setExpandedReqs((prev) => ({ ...prev, [reqKey]: !prev[reqKey] }));
  };

  const formatCategoryBadge = (cat: string) => {
    switch (cat) {
      case "technical_skill":
        return "Tech Skill";
      case "experience":
        return "Experience";
      case "responsibility":
        return "Responsibility";
      case "education":
        return "Education";
      case "soft_skill":
        return "Soft Skill";
      default:
        return "Requirement";
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs animate-pulse space-y-6">
        <div className="h-6 w-48 bg-slate-200 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-28 bg-slate-100 rounded-2xl" />
          <div className="h-28 bg-slate-100 rounded-2xl" />
          <div className="h-28 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { overall_match_score, ats_score, breakdown, ats_checks, actionable_suggestions } = data;

  return (
    <div className="space-y-6">
      {/* Top Banner: Match Score & ATS Metric */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Target className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                Transparent Resume Alignment Score
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Deterministic match rating calculated from verified technical skills, seniority indicators, and keyword alignment.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowFormulaModal(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <span>Scoring Formula</span>
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* 3 Score Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Overall Match */}
          <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900">Overall Match</span>
              <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-full">
                40% Skills + 35% Exp + 25% KW
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-indigo-700">{overall_match_score}%</span>
              <span className="text-xs font-medium text-indigo-600">
                {overall_match_score >= 80 ? "Strong Alignment" : overall_match_score >= 60 ? "Moderate Alignment" : "Needs Growth"}
              </span>
            </div>
            <div className="w-full bg-indigo-200/60 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${overall_match_score}%` }}
              />
            </div>
          </div>

          {/* Technical Skills Score */}
          <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900">Skills Coverage</span>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                {counts.matched} of {counts.all} Met
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-700">{breakdown.skills_score}%</span>
              <span className="text-xs font-medium text-emerald-600">
                {breakdown.skills_score >= 75 ? "High Competency" : "Selective Gaps"}
              </span>
            </div>
            <div className="w-full bg-emerald-200/60 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${breakdown.skills_score}%` }}
              />
            </div>
          </div>

          {/* ATS Structural Score */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">ATS Readiness</span>
              <span className="text-[10px] font-semibold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">
                Parser Validated
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-800">{ats_score}%</span>
              <span className="text-xs font-medium text-slate-600">Format Compliant</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-slate-700 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${ats_score}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Matched vs. Missing Job Requirements */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Matched vs. Missing Job Requirements
            </h3>
            <p className="text-xs text-slate-500">
              Zero hallucination guarantee: Missing skills are framed as preparation tips, never falsely added to your resume.
            </p>
          </div>

          {/* 4 Filters */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-auto text-xs font-semibold">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeFilter === "all" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({counts.all})
            </button>
            <button
              onClick={() => setActiveFilter("matched")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeFilter === "matched" ? "bg-white text-emerald-700 shadow-2xs font-bold" : "text-slate-600 hover:text-emerald-700"
              }`}
            >
              Matched ({counts.matched})
            </button>
            {counts.partial > 0 && (
              <button
                onClick={() => setActiveFilter("partially_matched")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeFilter === "partially_matched" ? "bg-white text-sky-700 shadow-2xs font-bold" : "text-slate-600 hover:text-sky-700"
                }`}
              >
                Partially Matched ({counts.partial})
              </button>
            )}
            <button
              onClick={() => setActiveFilter("missing")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeFilter === "missing" ? "bg-white text-amber-700 shadow-2xs font-bold" : "text-slate-600 hover:text-amber-700"
              }`}
            >
              Missing ({counts.missing})
            </button>
          </div>
        </div>

        {/* Requirements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Matched Requirements */}
          {(activeFilter === "all" || activeFilter === "matched") && (
            <div className="space-y-3 p-5 rounded-2xl bg-emerald-50/40 border border-emerald-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Confirmed Present in Your Background ({counts.matched})</span>
                </div>
              </div>
              <p className="text-[11px] text-emerald-800/80">
                Verified through direct project, skills, or work experience evidence in your resume.
              </p>
              <div className="space-y-2 pt-1">
                {matchedList.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No direct matches identified.</p>
                ) : (
                  matchedList.map((req, idx) => {
                    const reqKey = `matched-${idx}`;
                    const isExpanded = expandedReqs[reqKey];
                    return (
                      <div
                        key={idx}
                        className="rounded-xl bg-white border border-emerald-200 p-2.5 text-xs text-slate-800 shadow-2xs space-y-1.5 transition-all"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 font-semibold text-emerald-900">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>{req.requirement}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                              {formatCategoryBadge(req.category)}
                            </span>
                            {req.resumeEvidence && (
                              <button
                                type="button"
                                onClick={() => toggleExpand(reqKey)}
                                className="text-slate-400 hover:text-slate-600 p-0.5"
                                title="Toggle evidence"
                              >
                                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              </button>
                            )}
                          </div>
                        </div>

                        {req.resumeEvidence && (
                          <div className={`text-[11px] text-slate-600 bg-slate-50 rounded-lg p-2 border border-slate-100 ${isExpanded ? "block" : "line-clamp-2"}`}>
                            <strong className="text-slate-700">Resume Evidence: </strong>
                            &ldquo;{req.resumeEvidence}&rdquo;
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Partially Matched Requirements */}
          {(activeFilter === "all" || activeFilter === "partially_matched") && counts.partial > 0 && (
            <div className="space-y-3 p-5 rounded-2xl bg-sky-50/40 border border-sky-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-900">
                  <Info className="h-4 w-4 text-sky-600" />
                  <span>Partially Matched Requirements ({counts.partial})</span>
                </div>
              </div>
              <p className="text-[11px] text-sky-800/80">
                Adjacent or related background identified; recommended to clarify transferable depth during interviews.
              </p>
              <div className="space-y-2 pt-1">
                {partialList.map((req, idx) => {
                  return (
                    <div
                      key={idx}
                      className="rounded-xl bg-white border border-sky-200 p-2.5 text-xs text-slate-800 shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-semibold text-sky-950">
                          <span className="h-1.5 w-1.5 rounded-full bg-sky-500 shrink-0" />
                          <span>{req.requirement}</span>
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-100">
                          {formatCategoryBadge(req.category)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">{req.explanation}</p>
                      {req.resumeEvidence && (
                        <div className="text-[11px] text-slate-600 bg-slate-50 rounded-lg p-2 border border-slate-100">
                          <strong className="text-slate-700">Adjacent Evidence: </strong>
                          &ldquo;{req.resumeEvidence}&rdquo;
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Missing Requirements */}
          {(activeFilter === "all" || activeFilter === "missing") && (
            <div className="space-y-3 p-5 rounded-2xl bg-amber-50/40 border border-amber-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span>Job Requirements Absent in Resume ({counts.missing})</span>
                </div>
                {counts.missing > 0 && (
                  <button
                    type="button"
                    onClick={handleCopyMissing}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 hover:text-amber-950 bg-amber-100/60 px-2 py-0.5 rounded-lg border border-amber-200 cursor-pointer transition-all"
                  >
                    {copiedMissing ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy Missing</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <p className="text-[11px] text-amber-800/80">
                Genuine qualifications requested by the job description but absent from your resume. Prepare talking points without inventing qualifications.
              </p>
              <div className="space-y-2 pt-1">
                {missingList.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No missing requirements! Your background covers all specified competencies.</p>
                ) : (
                  missingList.map((req, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl bg-white border border-amber-200 p-2.5 text-xs text-slate-800 shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-semibold text-amber-950">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                          <span>{req.requirement}</span>
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          {formatCategoryBadge(req.category)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {req.explanation || "No supporting evidence found in resume. Prepare talking points if you have adjacent experience."}
                      </p>
                      {req.jobEvidence && (
                        <div className="text-[10px] text-amber-900/70 bg-amber-50/50 rounded-lg p-1.5 border border-amber-100">
                          <strong>Target JD Specification: </strong>
                          &ldquo;{req.jobEvidence}&rdquo;
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actionable Suggestions */}
        {actionable_suggestions.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Actionable Optimization Recommendations
              </h4>
              <span className="text-[11px] text-slate-400">
                Add skills only if you genuinely possess real experience with them
              </span>
            </div>
            <div className="space-y-2">
              {actionable_suggestions.map((sug, idx) => (
                <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                  <Sparkles className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{sug}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ATS Friendliness Checklist & Limitations */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            ATS Friendliness Structure Audit
          </h3>
          <p className="text-xs text-slate-500">
            Automated verification of machine-readable typography, section headers, and document structure.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ats_checks.map((chk, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl border flex items-start gap-3 ${chk.passed ? "bg-emerald-50/30 border-emerald-100" : "bg-amber-50/30 border-amber-200"}`}
            >
              {chk.passed ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">{chk.category}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${chk.impact === "High" ? "bg-red-100 text-red-700" : "bg-slate-200 text-slate-700"}`}>
                    {chk.impact} Impact
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{chk.details}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ATS Disclaimer */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs text-slate-600 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-slate-800">Understanding ATS Systems: </strong>
            {data.ats_limitations_disclaimer}
          </p>
        </div>
      </div>

      {/* Formula Explanation Modal Dialog */}
      {showFormulaModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setShowFormulaModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Transparent Match Calculation Formula
              </h3>
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                Unlike generic resume graders that generate arbitrary numbers, Rezumio uses a deterministic weighted formula grounded strictly in your document:
              </p>
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-2 font-mono text-[11px] text-slate-800">
                <div>Overall Match = (Skills × 40%) + (Experience × 35%) + (Keywords × 25%)</div>
              </div>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Skills Coverage (40%):</strong> Ratio of verified technical skills in your resume to required skills in the job specification.</li>
                <li><strong>Experience Alignment (35%):</strong> Semantic relevance of your responsibilities, action verbs, and scope of work to the target seniority.</li>
                <li><strong>Keyword Overlap (25%):</strong> Exact and fuzzy matching of industry terminology, methodologies, and frameworks.</li>
              </ul>
              <p className="text-[11px] text-slate-400">
                ATS friendliness is evaluated separately via a 5-point structural compliance check.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer"
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
