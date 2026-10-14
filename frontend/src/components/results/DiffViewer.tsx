"use client";

import React, { useState } from "react";
import { Sparkles, Info, Check, Edit2 } from "lucide-react";
import { TailoredResumeResponse } from "@/lib/types";

interface DiffViewerProps {
  data: TailoredResumeResponse;
  onUpdateBullet?: (expIndex: number, bulletIndex: number, newText: string) => void;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ data, onUpdateBullet }) => {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const startEdit = (key: string, currentText: string) => {
    setEditingKey(key);
    setEditText(currentText);
  };

  const saveEdit = (expIndex: number, bulletIndex: number) => {
    if (onUpdateBullet) {
      onUpdateBullet(expIndex, bulletIndex, editText);
    }
    setEditingKey(null);
  };

  return (
    <div className="space-y-6">
      {/* Summary Diff */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-indigo-700">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">Professional Summary Evolution</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Original Summary
            </div>
            <p className="text-xs text-slate-600 leading-relaxed italic">
              &ldquo;{data.original_summary || "No previous summary provided."}&rdquo;
            </p>
          </div>

          <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
            <div className="text-xs font-semibold text-indigo-900 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Tailored Summary</span>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-medium">
                Target Role Aligned
              </span>
            </div>
            <p className="text-xs text-slate-800 leading-relaxed font-medium">
              &ldquo;{data.tailored_summary}&rdquo;
            </p>
            {data.summary_rationale && (
              <div className="mt-2.5 pt-2 border-t border-indigo-100/80 flex items-start gap-1.5 text-[11px] text-indigo-700">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{data.summary_rationale}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Technical Skills Alignment Diff */}
      {data.skills && Object.keys(data.skills).length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">Technical Skills Prioritization</h3>
            </div>
            <span className="text-[11px] text-slate-500">Categorized & aligned with target job priorities</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {Object.entries(data.skills).map(([category, skillsList], idx) => (
              <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="text-xs font-bold text-slate-700 border-b border-slate-200/80 pb-1">
                  {category}
                </div>
                <div className="flex flex-wrap gap-1">
                  {skillsList.map((s, sIdx) => {
                    const isMatched = data.ats_keyword_matches?.some((m) => m.keyword.toLowerCase() === s.toLowerCase());
                    return (
                      <span
                        key={sIdx}
                        className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                          isMatched
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-white text-slate-700 border border-slate-200"
                        }`}
                      >
                        {s}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* Experience Bullets Diff */}
      <div className="space-y-5">
        {data.work_experience.map((exp, expIdx) => (
          <div key={expIdx} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 mb-4 gap-1">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {exp.position} <span className="font-normal text-slate-500">• {exp.company}</span>
                </h4>
                {exp.location && (
                  <span className="text-xs text-slate-400">{exp.location}</span>
                )}
              </div>
              <div className="text-xs font-medium text-slate-500">
                {exp.start_date} – {exp.is_current ? "Present" : exp.end_date || "Present"}
              </div>
            </div>

            <div className="space-y-4">
              {exp.bullets.map((b, bIdx) => {
                const itemKey = `${expIdx}-${bIdx}`;
                const isEditing = editingKey === itemKey;

                return (
                  <div
                    key={bIdx}
                    className="rounded-xl border border-slate-100 bg-slate-50/40 p-3.5 transition-colors hover:border-slate-300"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
                      {/* Original Bullet */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          Original Experience
                        </span>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {b.original}
                        </p>
                      </div>

                      {/* Tailored Bullet */}
                      <div className="space-y-2 lg:border-l lg:border-slate-200 lg:pl-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="h-2.5 w-2.5" /> Tailored & ATS-Optimized
                          </span>
                          {!isEditing ? (
                            <button
                              onClick={() => startEdit(itemKey, b.tailored)}
                              className="text-slate-400 hover:text-indigo-600 transition-colors"
                              title="Edit text manually"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          ) : (
                            <button
                              onClick={() => saveEdit(expIdx, bIdx)}
                              className="text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 text-xs font-medium"
                            >
                              <Check className="h-3 w-3" /> Save
                            </button>
                          )}
                        </div>

                        {isEditing ? (
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={3}
                            className="w-full text-xs text-slate-800 bg-white border border-indigo-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        ) : (
                          <p className="text-xs text-slate-900 font-medium leading-relaxed">
                            {b.tailored}
                          </p>
                        )}

                        {/* Targeted Keywords */}
                        {b.keywords_targeted && b.keywords_targeted.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {b.keywords_targeted.map((kw, kwIdx) => (
                              <span
                                key={kwIdx}
                                className="inline-block rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 border border-indigo-100"
                              >
                                #{kw}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Rationale explanation */}
                        {b.rationale && (
                          <div className="rounded-lg bg-amber-50/60 p-2 text-[11px] text-amber-900 border border-amber-200/50 flex items-start gap-1.5 leading-snug">
                            <Info className="h-3 w-3 shrink-0 text-amber-600 mt-0.5" />
                            <span>
                              <strong className="font-semibold text-amber-950">Why changed:</strong>{" "}
                              {b.rationale}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
