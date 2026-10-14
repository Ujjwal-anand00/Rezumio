"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  HelpCircle,
  RefreshCw,
  X,
  Menu,
  User,
} from "lucide-react";

interface NavbarProps {
  onReset: () => void;
  hasData: boolean;
  onOpenVersions?: () => void;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
  currentUser?: { email: string; full_name?: string } | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  onReset,
  hasData,
  onOpenVersions,
  onOpenAuth,
  onSignOut,
  currentUser,
}) => {
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowHowItWorks(false);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5 sm:px-6">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-500/20">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                Rezumio
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                Truthful ATS
              </span>
            </div>
          </div>

          {/* Desktop Right Navigation */}
          <div className="hidden md:flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowHowItWorks(true)}
              className="h-9 inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>How it works</span>
            </button>

            {/* Version Manager Trigger */}
            <button
              type="button"
              onClick={onOpenVersions}
              aria-label="Open Resume Version Manager"
              className="h-9 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5 text-indigo-600" />
              <span>Versions</span>
            </button>

            {/* User Account / Auth Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  if (currentUser) {
                    setUserMenuOpen(!userMenuOpen);
                  } else {
                    onOpenAuth?.();
                  }
                }}
                aria-label={currentUser ? `Account: ${currentUser.email}` : "Sign In to account"}
                className="h-9 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition-all shadow-2xs focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
              >
                {currentUser ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="max-w-[110px] truncate">{currentUser.full_name || currentUser.email.split("@")[0]}</span>
                  </>
                ) : (
                  <>
                    <User className="h-3.5 w-3.5 text-slate-500" />
                    <span>Sign In</span>
                  </>
                )}
              </button>

              {userMenuOpen && currentUser && (
                <div
                  className="absolute right-0 top-full mt-1.5 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50 text-xs space-y-1"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="font-bold text-slate-900 truncate">{currentUser.full_name || "Developer"}</p>
                    <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                    <span className="inline-block mt-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      Signed In
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      onOpenVersions?.();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 text-left font-medium transition-colors cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Saved Resume Versions</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      onSignOut?.();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 text-left font-medium transition-colors cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Reset Button */}
            {hasData && (
              <button
                onClick={onReset}
                type="button"
                aria-label="Reset all inputs"
                className="h-9 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all focus-visible:ring-2 focus-visible:ring-red-500 cursor-pointer"
                title="Reset all inputs"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Mobile Actions & Hamburger */}
          <div className="flex md:hidden items-center gap-2">

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200/80 bg-white px-4 py-3 space-y-2">
            <button
              type="button"
              onClick={() => {
                setShowHowItWorks(true);
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 text-left"
            >
              <HelpCircle className="h-4 w-4 text-slate-500" />
              <span>How it works</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenVersions?.();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 text-left"
            >
              <FileText className="h-4 w-4 text-indigo-600" />
              <span>Version History</span>
            </button>

            {currentUser ? (
              <button
                type="button"
                onClick={() => {
                  onSignOut?.();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 text-left cursor-pointer"
              >
                <X className="h-4 w-4" />
                <span>Sign Out ({currentUser.email.split("@")[0]})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onOpenAuth?.();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 text-left cursor-pointer"
              >
                <User className="h-4 w-4 text-slate-500" />
                <span>Sign In / Register</span>
              </button>
            )}

            {hasData && (
              <button
                type="button"
                onClick={() => {
                  onReset();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 text-left"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Reset Workspace</span>
              </button>
            )}
          </div>
        )}
      </header>

      {/* "How it works" Modal Dialog */}
      {showHowItWorks && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="how-it-works-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setShowHowItWorks(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <HelpCircle className="h-4 w-4" />
                </div>
                <h3 id="how-it-works-title" className="text-base font-bold text-slate-900">
                  How Rezumio Works
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHowItWorks(false)}
                aria-label="Close dialog"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
                  1
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Upload & Extract</h4>
                  <p className="mt-0.5">
                    Upload your existing resume in PDF or DOCX format. The Python backend safely extracts text and parses experience without running untrusted macros.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
                  2
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Strict Truthful Alignment</h4>
                  <p className="mt-0.5">
                    Google Gemini aligns your bullet points with the target job description using strong action verbs and metrics. <strong>Zero Hallucination Guarantee:</strong> No employers, dates, metrics, or missing skills will ever be invented.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
                  3
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Interactive Studio & Export</h4>
                  <p className="mt-0.5">
                    Review side-by-side diffs, check your ATS compatibility rating, edit text inline on the live document paper, and download recruiter-ready PDF, DOCX, or TXT files.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHowItWorks(false)}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                Got it, let&apos;s customize!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

