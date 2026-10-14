export interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string | null;
  github?: string | null;
  website?: string | null;
}

export interface WorkExperienceItem {
  company: string;
  position: string;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current: boolean;
  bullet_points: string[];
}

export interface EducationItem {
  institution: string;
  degree: string;
  field_of_study?: string | null;
  graduation_date?: string | null;
  location?: string | null;
  gpa?: string | null;
}

export interface ProjectItem {
  title: string;
  role?: string | null;
  technologies: string[];
  link?: string | null;
  bullet_points: string[];
}

export interface TailoredBulletPoint {
  original: string;
  tailored: string;
  rationale: string;
  keywords_targeted: string[];
}

export interface TailoredWorkExperienceItem {
  company: string;
  position: string;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current: boolean;
  bullets: TailoredBulletPoint[];
}

export interface ATSKeywordMatch {
  keyword: string;
  category: string;
  found_in_original: boolean;
  highlighted_in_tailored: boolean;
}

export interface TruthfulnessAudit {
  verified_honest: boolean;
  unmatched_jd_skills: string[];
  truth_notes: string;
}

export interface TailoredResumeResponse {
  contact_info: ContactInfo;
  original_summary: string;
  tailored_summary: string;
  summary_rationale: string;
  work_experience: TailoredWorkExperienceItem[];
  education: EducationItem[];
  skills: Record<string, string[]>;
  projects: ProjectItem[];
  certifications: string[];
  ats_score_estimate: number;
  ats_keyword_matches: ATSKeywordMatch[];
  truthfulness_audit: TruthfulnessAudit;
  executive_feedback: string;
}

export interface ParseResumeResponse {
  filename: string;
  text: string;
  character_count: number;
  contact_info: ContactInfo;
}

export interface TailorRequestPayload {
  resume_text?: string;
  job_description: string;
  target_role?: string;
  focus_notes?: string;
  required_tech_stack?: string[];
  protected_contact?: Partial<ContactInfo>;
}

export type ResumeTemplateId = "neo" | "classic" | "modern" | "compact";
export type ResumeColorAccent = "indigo" | "emerald" | "slate" | "blue" | "violet";

export interface ResumeCustomizerOptions {
  fullName: string;
  website: string;
  targetRole: string;
  requiredTechStack: string[];
  language: string;
  tone: string;
  bulletsPerExperience: number;
  includeSummary: boolean;
  includeSkills: boolean;
  includeEducation: boolean;
  includeCertifications: boolean;
  includeProjects: boolean;
  template: ResumeTemplateId;
  accentColor: ResumeColorAccent;
}


export interface AtsCompatibilityMetrics {
  overallScore: number;
  keywordsMatch: number;
  jobTitleMatch: number;
  qualificationsMatch: number;
  responsibilitiesMatch: number;
  suggestions: string[];
}

export interface MatchBreakdown {
  skills_score: number;
  experience_score: number;
  keyword_score: number;
  formula_explanation: string;
}

export interface ATSFriendlinessCheck {
  category: string;
  passed: boolean;
  details: string;
  impact: "High" | "Medium" | "Low";
}

export interface RequirementItem {
  requirement: string;
  category: "technical_skill" | "experience" | "responsibility" | "education" | "soft_skill" | string;
  status: "matched" | "partially_matched" | "missing";
  resumeEvidence?: string | null;
  jobEvidence?: string | null;
  explanation?: string;
  confidence?: number;
}

export interface MatchScoreResponse {
  overall_match_score: number;
  ats_score: number;
  breakdown: MatchBreakdown;
  matched_skills: string[];
  partially_matched_skills?: string[];
  missing_skills: string[];
  matched_keywords: string[];
  missing_keywords: string[];
  requirements?: RequirementItem[];
  actionable_suggestions: string[];
  ats_checks: ATSFriendlinessCheck[];
  ats_limitations_disclaimer: string;
}

export interface CoverLetterParagraph {
  title: string;
  content: string;
}

export interface CoverLetterResponse {
  candidate_name: string;
  candidate_email: string;
  candidate_phone: string;
  company_name: string;
  job_title: string;
  date_formatted: string;
  salutation: string;
  paragraphs: CoverLetterParagraph[];
  full_text: string;
  closing_salutation: string;
  truthfulness_guarantee: string;
}

export interface CoverLetterRequest {
  resume_text: string;
  job_description: string;
  company_name?: string;
  target_role?: string;
  tone?: string;
  focus_points?: string;
}

export interface ResumeVersionSummary {
  id: string;
  user_id?: string;
  version_name: string;
  label: string;
  job_title?: string;
  target_role?: string;
  company_name?: string;
  job_description?: string;
  job_description_snippet?: string;
  original_resume_id?: string;
  parent_version_id?: string;
  target_tech_stack?: string[];
  match_score?: number;
  ats_score?: number;
  created_at: string;
  updated_at: string;
}

export interface ResumeVersionItem extends ResumeVersionSummary {
  professional_summary?: string;
  resume_data: TailoredResumeResponse;
}

export interface ResumeVersionCreate {
  version_name?: string;
  label?: string;
  job_title?: string;
  target_role?: string;
  company_name?: string;
  job_description?: string;
  job_description_snippet?: string;
  original_resume_id?: string;
  parent_version_id?: string;
  target_tech_stack?: string[];
  professional_summary?: string;
  match_score?: number;
  ats_score?: number;
  resume_data: TailoredResumeResponse;
}

export interface ResumeVersionUpdate {
  version_name?: string;
  label?: string;
  job_title?: string;
  target_role?: string;
  company_name?: string;
  job_description?: string;
  target_tech_stack?: string[];
  professional_summary?: string;
  match_score?: number;
  ats_score?: number;
  resume_data?: TailoredResumeResponse;
}

export interface UserResponse {
  id: string;
  email: string;
  full_name?: string;
  created_at: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  user: UserResponse;
}

export interface CoverLetterSaveRequest {
  id?: string;
  title?: string;
  company_name?: string;
  job_title?: string;
  cover_letter_data: CoverLetterResponse;
}

export interface CoverLetterItem {
  id: string;
  user_id?: string;
  title: string;
  company_name?: string;
  job_title?: string;
  candidate_name?: string;
  cover_letter_data: CoverLetterResponse;
  created_at: string;
  updated_at: string;
}

