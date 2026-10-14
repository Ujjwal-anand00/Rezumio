"use client";

import React from "react";
import {
  ShieldCheck,
  Lock,
  Sparkles,
  ArrowUp,
} from "lucide-react";

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer className="mt-auto border-t border-slate-200/90 bg-white text-slate-600 transition-colors">
      {/* Top Guarantee Pill Bar */}
      <div className="border-b border-slate-100 bg-slate-50/70 py-3.5">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="font-semibold text-slate-800">Zero Hallucinations</span>
              <span className="hidden lg:inline text-slate-400">• Strict Fact Verification</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <Lock className="h-4 w-4 text-indigo-600 shrink-0" />
              <span className="font-semibold text-slate-800">100% Private</span>
              <span className="hidden lg:inline text-slate-400">• In-Memory Processing</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
              <span className="font-semibold text-slate-800">Deterministic ATS</span>
              <span className="hidden lg:inline text-slate-400">• Exact Keyword Scoring</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <Lock className="h-4 w-4 text-purple-600 shrink-0" />
              <span className="font-semibold text-slate-800">Secure History</span>
              <span className="hidden lg:inline text-slate-400">• User-owned versions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sub-footer */}
      <div className="bg-white py-4 text-xs text-slate-500">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-slate-500">
            <span>© 2026 Rezumio.</span>
            <span>•</span>
            <span>Truthful ATS Resume Customizer</span>
            <span>•</span>
            <span>All rights reserved.</span>
          </div>

          <button
            type="button"
            onClick={scrollToTop}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-all cursor-pointer border border-slate-200/60 bg-white shadow-2xs"
            aria-label="Back to top"
          >
            <span>Back to top</span>
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};
