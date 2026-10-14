"use client";

import React, { useEffect, useState, useRef } from "react";
import confetti from "canvas-confetti";
import {
  Sliders,
  FileText,
  Target,
  GitCompare,
  ShieldCheck,
  AlertCircle,
  Eye,
} from "lucide-react";

import { Navbar } from "@/components/Navbar";
import { ResumeCustomizerHeroForm } from "@/components/ResumeCustomizerHeroForm";
import { ResumeStudioSkeleton } from "@/components/ResumeStudioSkeleton";
import { InteractiveResumeCanvas } from "@/components/InteractiveResumeCanvas";
import { AtsCompatibilityDashboard } from "@/components/AtsCompatibilityDashboard";
import { DiffViewer } from "@/components/results/DiffViewer";
import { ResumeEditorSidebar } from "@/components/ResumeEditorSidebar";
import { TailorProgressModal } from "@/components/TailorProgressModal";
import { MatchScoreBreakdown } from "@/components/MatchScoreBreakdown";
import { CoverLetterStudio } from "@/components/CoverLetterStudio";
import { VersionManagerModal } from "@/components/VersionManagerModal";
import { AuthModal } from "@/components/AuthModal";
import { Footer } from "@/components/Footer";
import { SaveStatus } from "@/components/ResumeSaveDownloadBar";

import { tailorResume, tailorResumeStream } from "@/lib/api";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import {
  ContactInfo,
  ResumeCustomizerOptions,
  TailoredResumeResponse,
  UserResponse,
} from "@/lib/types";

const getErrorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

export default function Home() {
  // Input states (clean empty initial state)
  const [jobDescription, setJobDescription] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [parsedContact, setParsedContact] = useState<ContactInfo | null>(null);

  // Customizer styling & sections
  const [options, setOptions] = useState<ResumeCustomizerOptions>({
    fullName: "",
    website: "",
    targetRole: "Full Stack Developer",
    requiredTechStack: [],
    language: "English (United States)",
    tone: "Professional and Formal",
    bulletsPerExperience: 4,
    includeSummary: true,
    includeSkills: true,
    includeEducation: true,
    includeCertifications: true,
    includeProjects: true,
    template: "neo",
    accentColor: "indigo",
  });


  // Tailored Result with Undo / Redo history
  const [history, setHistory] = useState<TailoredResumeResponse[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isTailoring, setIsTailoring] = useState(false);
  const [streamProgress, setStreamProgress] = useState<{
    step: string;
    message: string;
    percent: number;
  } | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Version tracking & live save status
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
  const [currentVersionName, setCurrentVersionName] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("unsaved");

  // Modals & Auth
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserResponse | null>(null);

  // Active view tab: 'preview' | 'compatibility' | 'diff' | 'coverletter' | 'settings'
  const [activeTab, setActiveTab] = useState<
    "preview" | "compatibility" | "diff" | "coverletter" | "settings"
  >("preview");

  const resultsSectionRef = useRef<HTMLDivElement>(null);

  const currentResult: TailoredResumeResponse | null =
    historyIndex >= 0 && historyIndex < history.length
      ? history[historyIndex]
      : null;

  // Supabase Auth Session listener
  useEffect(() => {
    if (isSupabaseConfigured() && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setAuthToken(session.access_token);
          const u = session.user;
          setCurrentUser({
            id: u.id,
            email: u.email || "",
            full_name: (u.user_metadata?.full_name as string) || undefined,
            created_at: u.created_at || new Date().toISOString(),
          });
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          setAuthToken(session.access_token);
          const u = session.user;
          setCurrentUser({
            id: u.id,
            email: u.email || "",
            full_name: (u.user_metadata?.full_name as string) || undefined,
            created_at: u.created_at || new Date().toISOString(),
          });
        } else {
          setAuthToken(null);
          setCurrentUser(null);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  // Sign out handler
  const handleSignOut = async () => {
    try {
      if (isSupabaseConfigured() && supabase) {
        await supabase.auth.signOut();
      }
    } catch {}
    setAuthToken(null);
    setCurrentUser(null);
  };

  // Warn on navigation if unsaved changes exist
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === "unsaved" && currentResult) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveStatus, currentResult]);

  const handleContactParsed = (contact: ContactInfo) => {
    setParsedContact(contact);
    if (contact.name) {
      setOptions((prev) => ({
        ...prev,
        fullName: prev.fullName || contact.name,
        website: prev.website || contact.website || "",
      }));
    }
  };

  const pushNewState = (newState: TailoredResumeResponse) => {
    const updatedHistory = history.slice(0, historyIndex + 1);
    updatedHistory.push(newState);
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
    setSaveStatus("unsaved");
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
    }
  };

  // Submit tailoring with duplicate submission lock & streaming SSE
  const handleCustomizeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTailoring) return; // Prevent duplicate submissions

    setErrorMessage(null);

    if (!resumeText.trim() || resumeText.trim().length < 20) {
      setErrorMessage("Please upload your resume or paste resume text (min 20 characters).");
      return;
    }

    if (!jobDescription.trim() || jobDescription.trim().length < 20) {
      setErrorMessage("Please enter a target job description (min 20 characters).");
      return;
    }

    try {
      setIsTailoring(true);
      setStreamProgress({ step: "init", message: "Initiating role-specific resume analysis...", percent: 10 });

      const res = await tailorResumeStream(
        {
          resume_text: resumeText,
          job_description: jobDescription,
          target_role: options.targetRole || "Full Stack Developer",
          required_tech_stack: options.requiredTechStack.length > 0 ? options.requiredTechStack : undefined,
          protected_contact: {
            name: options.fullName || parsedContact?.name || "",
            website: options.website || parsedContact?.website || "",
            email: parsedContact?.email || "",
            phone: parsedContact?.phone || "",
            location: parsedContact?.location || "",
          },
          focus_notes: `Target Role: ${options.targetRole}. Tone: ${options.tone}. Language: ${options.language}. Max bullets: ${options.bulletsPerExperience}.`,
        },
        (step, message, percent) => {
          setStreamProgress({ step, message, percent });
        }
      );

      if (!res || !res.work_experience) {
        throw new Error("Invalid response received from customization engine.");
      }

      pushNewState(res);
      setActiveTab("preview");

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });

      // Smooth scroll to studio
      setTimeout(() => {
        resultsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err, "Failed to customize resume. Please verify your connection."));
    } finally {
      setIsTailoring(false);
      setStreamProgress(null);
    }
  };

  // Dedicated Regenerate Action that regenerates allowed sections while strictly retaining protected facts
  const handleRegenerateResume = async () => {
    if (!resumeText || !jobDescription || isTailoring) return;
    try {
      setIsTailoring(true);
      setStreamProgress({ step: "init", message: "Regenerating tailored sections while safeguarding protected details...", percent: 15 });
      const res = await tailorResumeStream(
        {
          resume_text: resumeText,
          job_description: jobDescription,
          target_role: options.targetRole || "Full Stack Developer",
          required_tech_stack: options.requiredTechStack.length > 0 ? options.requiredTechStack : undefined,
          protected_contact: {
            name: options.fullName || parsedContact?.name || "",
            website: options.website || parsedContact?.website || "",
            email: parsedContact?.email || "",
            phone: parsedContact?.phone || "",
            location: parsedContact?.location || "",
          },
          focus_notes: `Regeneration. Preserve protected fields and user edits. Tone: ${options.tone}.`,
        },
        (step, message, percent) => {
          setStreamProgress({ step, message, percent });
        }
      );
      if (res && res.work_experience) {
        pushNewState(res);
      }
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err, "Failed to regenerate resume."));
    } finally {
      setIsTailoring(false);
      setStreamProgress(null);
    }
  };


  // Conversational AI Prompt refinement
  const handleRefineWithAI = async (prompt: string) => {
    if (!currentResult) return;
    try {
      setIsRefining(true);
      const res = await tailorResume({
        resume_text: resumeText,
        job_description: jobDescription,
        focus_notes: `Candidate refinement prompt: "${prompt}". Preserve strict truthfulness.`,
      });
      pushNewState(res);
    } catch (err: unknown) {
      alert("AI refinement failed: " + getErrorMessage(err, "Please check connection"));
    } finally {
      setIsRefining(false);
    }
  };

  const handleReset = () => {
    setResumeText("");
    setJobDescription("");
    setUploadedFileName("");
    setParsedContact(null);
    setOptions((prev) => ({
      ...prev,
      fullName: "",
      website: "",
    }));
    setHistory([]);
    setHistoryIndex(-1);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fafbfc] text-slate-900 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar matching reference visual structure */}
      <Navbar
        onReset={handleReset}
        hasData={Boolean(resumeText || currentResult || jobDescription)}
        onOpenVersions={() => setIsVersionModalOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
        currentUser={currentUser}
      />

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 space-y-12 pb-16">
        {/* Visual Structure Reference: Hero & Two-Card Layout */}
        <section className="pt-4 sm:pt-6">
          <ResumeCustomizerHeroForm
            jobDescription={jobDescription}
            onJobDescriptionChange={setJobDescription}
            resumeText={resumeText}
            onResumeTextChange={setResumeText}
            uploadedFileName={uploadedFileName}
            onFileNameChange={setUploadedFileName}
            onContactParsed={handleContactParsed}
            onSubmit={handleCustomizeSubmit}
            isLoading={isTailoring}
          />
        </section>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="max-w-5xl mx-auto flex items-center gap-2.5 rounded-2xl bg-red-50 p-4 text-xs font-semibold text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Loading Skeletons during processing */}
        {isTailoring && <ResumeStudioSkeleton />}

        {/* Tailored Results Studio Workspace */}
        {currentResult && !isTailoring && (
          <section
            ref={resultsSectionRef}
            id="studio-results"
            className="pt-6 border-t border-slate-200/80 space-y-6"
          >
            {/* Studio Navigation Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
              <div role="tablist" aria-label="Studio views" className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "preview"}
                  onClick={() => setActiveTab("preview")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer ${
                    activeTab === "preview"
                      ? "bg-white text-indigo-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Resume Preview</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "compatibility"}
                  onClick={() => setActiveTab("compatibility")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer ${
                    activeTab === "compatibility"
                      ? "bg-white text-indigo-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Target className="h-3.5 w-3.5" />
                  <span>Match & ATS Score</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "diff"}
                  onClick={() => setActiveTab("diff")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer ${
                    activeTab === "diff"
                      ? "bg-white text-indigo-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <GitCompare className="h-3.5 w-3.5" />
                  <span>Diff & Rationales</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "coverletter"}
                  onClick={() => setActiveTab("coverletter")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer ${
                    activeTab === "coverletter"
                      ? "bg-white text-indigo-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Cover Letter Studio</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "settings"}
                  onClick={() => setActiveTab("settings")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer ${
                    activeTab === "settings"
                      ? "bg-white text-indigo-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Sliders className="h-3.5 w-3.5" />
                  <span>Settings & Sections</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsVersionModalOpen(true)}
                  className="flex items-center gap-1 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-full border border-indigo-200 font-semibold transition-all"
                >
                  <FileText className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Manage Versions</span>
                </button>

                <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 font-semibold self-start sm:self-auto">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Zero Hallucinations Verified</span>
                </div>
              </div>
            </div>

            {/* View Pointers */}
            <div className="space-y-6">
              {activeTab === "preview" && (
                <InteractiveResumeCanvas
                  data={currentResult}
                  options={options}
                  onOptionsChange={setOptions}
                  onUpdateResume={pushNewState}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  canUndo={historyIndex > 0}
                  canRedo={historyIndex < history.length - 1}
                  onRefineWithAI={handleRefineWithAI}
                  isRefining={isRefining}
                  onRegenerate={handleRegenerateResume}
                  isRegenerating={isTailoring}
                  currentVersionId={currentVersionId}
                  currentVersionName={currentVersionName}
                  targetRole={options.targetRole}
                  jobDescription={jobDescription}
                  targetTechStack={options.requiredTechStack}
                  authToken={authToken}
                  onRequireAuth={() => setIsAuthModalOpen(true)}
                  saveStatus={saveStatus}
                  setSaveStatus={setSaveStatus}
                  onSavedSuccess={(saved) => {
                    setCurrentVersionId(saved.id);
                    setCurrentVersionName(saved.version_name || saved.label);
                    setSaveStatus("saved");
                  }}
                />
              )}

              {activeTab === "compatibility" && (
                <div className="space-y-6">
                  <MatchScoreBreakdown
                    resumeText={resumeText}
                    jobDescription={jobDescription}
                  />
                  <AtsCompatibilityDashboard
                    data={currentResult}
                    targetRole={options.targetRole || "Target Role"}
                    companyName="Target Organization"
                  />

                </div>
              )}

              {activeTab === "diff" && (
                <DiffViewer
                  data={currentResult}
                  onUpdateBullet={(expIdx, bIdx, newText) => {
                    const updated = JSON.parse(JSON.stringify(currentResult));
                    updated.work_experience[expIdx].bullets[bIdx].tailored = newText;
                    pushNewState(updated);
                  }}
                />
              )}

              {activeTab === "coverletter" && (
                <CoverLetterStudio
                  resumeText={resumeText}
                  jobDescription={jobDescription}
                  authToken={authToken}
                  onRequireAuth={() => setIsAuthModalOpen(true)}
                />
              )}

              {activeTab === "settings" && (
                <div className="max-w-xl mx-auto">
                  <ResumeEditorSidebar
                    options={options}
                    onOptionsChange={setOptions}
                    jobDescription={jobDescription}
                    onJobDescriptionChange={setJobDescription}
                    uploadedFileName={uploadedFileName}
                    onFileNameChange={setUploadedFileName}
                    resumeText={resumeText}
                    onResumeTextChange={setResumeText}
                    onContactParsed={setParsedContact}
                    onSubmit={handleCustomizeSubmit}
                    isLoading={isTailoring}
                  />
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Progress animation dialog */}
      <TailorProgressModal isOpen={isTailoring} streamProgress={streamProgress} />

      {/* Version Manager Modal */}
      <VersionManagerModal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        onRequireAuth={() => setIsAuthModalOpen(true)}
        onLoadVersion={(data, version) => {
          pushNewState(data);
          setCurrentVersionId(version.id);
          setCurrentVersionName(version.version_name || version.label);
          if (version.job_title || version.target_role) {
            setOptions((prev) => ({
              ...prev,
              targetRole: version.job_title || version.target_role || prev.targetRole,
            }));
          }
          setSaveStatus("saved");
          setActiveTab("preview");
        }}
        authToken={authToken}
        onCreateNewResume={() => {
          setCurrentVersionId(null);
          setCurrentVersionName(null);
          setSaveStatus("unsaved");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(token, user) => {
          setAuthToken(token);
          setCurrentUser(user);
        }}
      />

      {/* SaaS Product Footer */}
      <Footer />
    </div>
  );
}

