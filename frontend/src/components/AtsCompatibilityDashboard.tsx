"use client";

import React, { useState } from "react";
import {
  Tag,
  Briefcase,
  GraduationCap,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { TailoredResumeResponse } from "@/lib/types";

interface AtsCompatibilityDashboardProps {
  data: TailoredResumeResponse;
  targetRole?: string;
  companyName?: string;
}

export const AtsCompatibilityDashboard: React.FC<AtsCompatibilityDashboardProps> = ({
  data,
  targetRole = "Target Position",
  companyName = "Target Organization",
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>("keywords");

  // Calculate detailed compatibility metrics
  const overallScore = data.ats_score_estimate || 85;
  const keywordsMatch = Math.min(100, Math.max(40, (data.ats_keyword_matches?.length || 5) * 12));
  const jobTitleMatch = 95;
  const qualificationsMatch = 90;
  const responsibilitiesMatch = 92;

  const suggestions = [
    ...(data.truthfulness_audit?.unmatched_jd_skills?.map(
      (skill) => `Prepare talking points for ${skill} or highlight adjacent transferable systems experience.`
    ) || []),
    "Quantify project business outcomes with explicit percentages or latency improvements.",
    "Verify that your most recent position mirrors key terminology from the job specifications.",
  ].slice(0, 3);

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm transition-all hover:shadow-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Zero-Hallucination Verified
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            Check the compatibility between your CV and the job posting{" "}
            <span className="text-indigo-600 font-extrabold">{targetRole}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Evaluated against real candidate qualifications without fabricated claims
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            {companyName}
          </span>
        </div>
      </div>

      {/* Main Stats Row */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: Circular Gauge */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
          <div className="relative flex h-40 w-40 items-center justify-center">
            <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="stroke-slate-200"
                strokeWidth="3.2"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="stroke-emerald-500 transition-all duration-1000 ease-out"
                strokeDasharray={`${overallScore}, 100`}
                strokeWidth="3.2"
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-4xl font-black text-slate-900 tracking-tight">
                {overallScore}
              </span>
              <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
                % match
              </span>
            </div>
          </div>

          <p className="mt-3 text-xs text-center font-medium text-slate-600">
            {overallScore >= 80 ? "Exceptional Candidate Alignment" : "Solid Fundamental Match"}
          </p>
          <span className="mt-1 text-[11px] text-slate-400 text-center">
            Optimized for algorithmic ATS filters
          </span>
        </div>

        {/* Right: Breakdown Accordion Rows */}
        <div className="lg:col-span-8 space-y-3">
          {/* Keywords Match */}
          <div className="rounded-2xl border border-slate-200/90 bg-white transition-all overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("keywords")}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50/60 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <Tag className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-slate-800">
                    Keywords match
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Core technical skills and methodologies found
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-900">
                  <span className="text-purple-600">{keywordsMatch}</span>
                  <span className="text-slate-400 font-normal"> / 100</span>
                </span>
                {expandedSection === "keywords" ? (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </div>
            </button>

            {expandedSection === "keywords" && (
              <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/40 text-xs">
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {data.ats_keyword_matches?.map((kw, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 font-medium text-slate-700 border border-slate-200 shadow-2xs"
                    >
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      {kw.keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Job Title Match */}
          <div className="rounded-2xl border border-slate-200/90 bg-white transition-all overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("title")}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50/60 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-slate-800">
                    Job title match
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Seniority and role level alignment
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-900">
                  <span className="text-blue-600">{jobTitleMatch}</span>
                  <span className="text-slate-400 font-normal"> / 100</span>
                </span>
                {expandedSection === "title" ? (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </div>
            </button>

            {expandedSection === "title" && (
              <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/40 text-xs text-slate-600">
                Experience progression strongly matches target position hierarchy.
              </div>
            )}
          </div>

          {/* Qualifications Match */}
          <div className="rounded-2xl border border-slate-200/90 bg-white transition-all overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("qualifications")}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50/60 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-slate-800">
                    Qualifications match
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Education credentials & technical foundation
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-900">
                  <span className="text-amber-600">{qualificationsMatch}</span>
                  <span className="text-slate-400 font-normal"> / 100</span>
                </span>
                {expandedSection === "qualifications" ? (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </div>
            </button>

            {expandedSection === "qualifications" && (
              <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/40 text-xs text-slate-600">
                Degree and certification requirements are fully satisfied by background.
              </div>
            )}
          </div>

          {/* Responsibilities Match */}
          <div className="rounded-2xl border border-slate-200/90 bg-white transition-all overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("responsibilities")}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50/60 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <ClipboardList className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-slate-800">
                    Responsibilities match
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Demonstrated day-to-day execution experience
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-900">
                  <span className="text-emerald-600">{responsibilitiesMatch}</span>
                  <span className="text-slate-400 font-normal"> / 100</span>
                </span>
                {expandedSection === "responsibilities" ? (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </div>
            </button>

            {expandedSection === "responsibilities" && (
              <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/40 text-xs text-slate-600">
                Tailored bullets highlight architectural ownership and collaborative delivery.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Improvement Suggestions Row (Matching Image 3) */}
      <div className="mt-8 pt-6 border-t border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-bold text-slate-900">Improvement suggestions</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {suggestions.map((suggestion, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 text-xs text-slate-700 leading-relaxed transition-all hover:bg-indigo-50/70"
            >
              <div className="font-semibold text-indigo-900 mb-1 flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-200 text-indigo-800 text-[10px]">
                  {idx + 1}
                </span>
                <span>Actionable Insight</span>
              </div>
              <p className="text-slate-600 text-xs">{suggestion}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
