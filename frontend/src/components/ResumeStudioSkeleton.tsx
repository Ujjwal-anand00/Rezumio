"use client";

import React from "react";

export const ResumeStudioSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-pulse pt-6">
      {/* Top ATS Match Skeleton */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div className="space-y-2">
            <div className="h-4 w-48 bg-slate-200 rounded-md" />
            <div className="h-3 w-64 bg-slate-100 rounded-md" />
          </div>
          <div className="h-7 w-28 bg-slate-200 rounded-full" />
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl">
            <div className="h-32 w-32 rounded-full border-4 border-slate-200 border-t-indigo-400 animate-spin" />
            <div className="h-3 w-32 bg-slate-200 rounded-md mt-4" />
          </div>

          <div className="lg:col-span-8 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-12 w-full bg-slate-100 rounded-2xl flex items-center justify-between px-4"
              >
                <div className="h-3 w-36 bg-slate-200 rounded-md" />
                <div className="h-3 w-16 bg-slate-200 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Document Paper Skeleton */}
      <div className="flex justify-center p-8 bg-slate-100 rounded-3xl border border-slate-200">
        <div className="w-full max-w-[760px] bg-white rounded-lg p-10 space-y-6 shadow-md border border-slate-200">
          <div className="space-y-2 text-center flex flex-col items-center">
            <div className="h-6 w-52 bg-slate-200 rounded-md" />
            <div className="h-3 w-72 bg-slate-100 rounded-md" />
          </div>

          <div className="space-y-2 pt-4">
            <div className="h-4 w-40 bg-indigo-100 rounded-md" />
            <div className="h-3 w-full bg-slate-100 rounded-md" />
            <div className="h-3 w-5/6 bg-slate-100 rounded-md" />
          </div>

          <div className="space-y-3 pt-4">
            <div className="h-4 w-44 bg-indigo-100 rounded-md" />
            {[1, 2, 3].map((j) => (
              <div key={j} className="space-y-1.5 pl-2">
                <div className="h-3.5 w-60 bg-slate-200 rounded-md" />
                <div className="h-3 w-full bg-slate-100 rounded-md" />
                <div className="h-3 w-4/5 bg-slate-100 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
