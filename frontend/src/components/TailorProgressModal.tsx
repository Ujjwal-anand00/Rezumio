"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, CheckCircle2, ShieldCheck, Loader2 } from "lucide-react";

interface TailorProgressModalProps {
  isOpen: boolean;
  streamProgress?: {
    step: string;
    message: string;
    percent: number;
  } | null;
}

const STEPS = [
  "Safely extracting & validating candidate qualifications",
  "Analyzing target job description competencies & terminology",
  "Enforcing strict zero-hallucination & truthfulness constraints",
  "Optimizing bullet points using action verbs & metric impact",
  "Computing ATS alignment score & formatting recruiter documents",
];

export const TailorProgressModal: React.FC<TailorProgressModalProps> = ({
  isOpen,
  streamProgress,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const displayedStepIndex = streamProgress?.percent
    ? Math.min(STEPS.length - 1, Math.floor((streamProgress.percent / 100) * STEPS.length))
    : currentStepIndex;

  useEffect(() => {
    if (!isOpen) {
      queueMicrotask(() => setCurrentStepIndex(0));
      return;
    }

    if (streamProgress?.percent) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 1800);

    return () => clearInterval(interval);
  }, [isOpen, streamProgress]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl border border-slate-100 space-y-6">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-3 animate-pulse">
            <Sparkles className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Tailoring Your Resume</h3>
          <p className="text-xs text-slate-500 mt-1">
            {streamProgress?.message || "Applying algorithmic ATS optimization without inventing credentials"}
          </p>
        </div>

        {/* Live Streaming Progress Bar */}
        {streamProgress && (
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
              <span>Streaming AI Response</span>
              <span className="font-bold text-indigo-600">{streamProgress.percent}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${streamProgress.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Progress List */}
        <div className="space-y-3">
          {STEPS.map((step, idx) => {
            const isDone = idx < displayedStepIndex;
            const isCurrent = idx === displayedStepIndex;

            return (
              <div
                key={idx}
                className={`flex items-center gap-3 rounded-xl p-2.5 transition-all text-xs ${
                  isCurrent
                    ? "bg-indigo-50/80 text-indigo-900 font-semibold border border-indigo-100"
                    : isDone
                    ? "text-slate-700 font-medium"
                    : "text-slate-400"
                }`}
              >
                <div className="shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : isCurrent ? (
                    <Loader2 className="h-4 w-4 text-indigo-600 animate-spin" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-slate-200" />
                  )}
                </div>
                <span>{step}</span>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5 text-center flex items-center justify-center gap-2 text-[11px] text-emerald-800 font-medium">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Strict grounding active: Zero fabricated credentials guaranteed</span>
        </div>
      </div>
    </div>
  );
};

