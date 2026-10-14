"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Lock,
  Mail,
  User,
  X,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  KeyRound,
  ArrowLeft,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { registerUser, loginUser } from "@/lib/api";
import {
  isSupabaseConfigured,
  supabaseSignIn,
  supabaseSignUp,
  supabaseResetPassword,
} from "@/lib/supabaseClient";
import { UserResponse } from "@/lib/types";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (token: string, user: UserResponse) => void;
}

type AuthMode = "signin" | "signup" | "forgot_password";

const getErrorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => {
        setError(null);
        setSuccessMessage(null);
      });
    }
  }, [isOpen]);

  // Password strength calculator
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: "None", color: "bg-slate-200" };
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 1) return { score: 1, label: "Weak", color: "bg-red-500" };
    if (score === 2 || score === 3) return { score: 2, label: "Good", color: "bg-amber-500" };
    return { score: 3, label: "Strong", color: "bg-emerald-500" };
  }, [password]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const emailClean = email.trim();
    if (!emailClean) {
      setError("Please enter a valid email address.");
      return;
    }

    if (mode === "forgot_password") {
      try {
        setLoading(true);
        if (isSupabaseConfigured()) {
          await supabaseResetPassword(emailClean);
        }
        setSuccessMessage("Password reset email sent! Check your inbox for instructions.");
      } catch (err: unknown) {
        setError(getErrorMessage(err, "Failed to send reset email."));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    try {
      setLoading(true);

      if (isSupabaseConfigured()) {
        if (mode === "signup") {
          const authData = await supabaseSignUp(emailClean, password, fullName.trim() || undefined);
          if (authData.session) {
            const token = authData.session.access_token;
            const u = authData.user!;
            const userResp: UserResponse = {
              id: u.id,
              email: u.email || emailClean,
              full_name: (u.user_metadata?.full_name as string) || fullName.trim() || undefined,
              created_at: u.created_at || new Date().toISOString(),
            };
            onAuthSuccess(token, userResp);
            onClose();
          } else {
            setSuccessMessage("Account created! Please check your email to confirm your account.");
          }
        } else {
          const authData = await supabaseSignIn(emailClean, password);
          if (authData.session) {
            const token = authData.session.access_token;
            const u = authData.user;
            const userResp: UserResponse = {
              id: u.id,
              email: u.email || emailClean,
              full_name: (u.user_metadata?.full_name as string) || undefined,
              created_at: u.created_at || new Date().toISOString(),
            };
            onAuthSuccess(token, userResp);
            onClose();
          }
        }
      } else {
        // Fallback to local authentication service
        let res;
        if (mode === "signin") {
          res = await loginUser(emailClean, password);
        } else {
          res = await registerUser(emailClean, password, fullName.trim() || undefined);
        }
        onAuthSuccess(res.access_token, res.user);
        onClose();
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Authentication failed. Please verify credentials."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
              {mode === "forgot_password" ? (
                <KeyRound className="h-5 w-5" />
              ) : (
                <Lock className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                {mode === "signin"
                  ? "Sign In to Your Workspace"
                  : mode === "signup"
                  ? "Create Developer Account"
                  : "Reset Account Password"}
              </h3>
              {mode !== "signup" && (
                <p className="text-xs text-slate-500">
                  {mode === "signin"
                    ? "Access your saved resume versions and job history"
                    : "Enter your email to receive a password reset link"}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close auth dialog"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            <span className="leading-relaxed">{successMessage}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === "signup" && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@example.com"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {mode !== "forgot_password" && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Password</label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot_password");
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password strength guide for sign-up */}
              {mode === "signup" && password.length > 0 && (
                <div className="pt-1.5 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Password Strength:</span>
                    <span className="font-semibold text-slate-700">{passwordStrength.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
                    <div
                      className={`h-full flex-1 rounded-full ${
                        passwordStrength.score >= 1 ? passwordStrength.color : "bg-slate-200"
                      }`}
                    />
                    <div
                      className={`h-full flex-1 rounded-full ${
                        passwordStrength.score >= 2 ? passwordStrength.color : "bg-slate-200"
                      }`}
                    />
                    <div
                      className={`h-full flex-1 rounded-full ${
                        passwordStrength.score >= 3 ? passwordStrength.color : "bg-slate-200"
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === "signup" && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Confirm Password</label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type your password"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : mode === "signin" ? (
              "Sign In"
            ) : mode === "signup" ? (
              "Create Account"
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>

        {/* Footer switchers */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
          {mode === "forgot_password" ? (
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
                setSuccessMessage(null);
              }}
              className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Sign In</span>
            </button>
          ) : (
            <>
              <span className="text-slate-500">
                {mode === "signin" ? "Don't have an account?" : "Already have an account?"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
              >
                {mode === "signin" ? "Sign Up" : "Log In"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
