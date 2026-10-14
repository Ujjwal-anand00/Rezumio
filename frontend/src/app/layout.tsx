import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rezumio — Truthful ATS Resume Customizer",
  description:
    "Tailor your resume truthfully to any target job description. Aligns experience, enhances bullet points with active metrics, and exports clean ATS PDF and DOCX files.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} min-h-full bg-slate-50 text-slate-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}
