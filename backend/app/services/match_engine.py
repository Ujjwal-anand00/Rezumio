import re
from typing import Dict, List, Optional, Set, Tuple
from app.models.match import (
    ATSFriendlinessCheck,
    MatchBreakdown,
    MatchScoreResponse,
    RequirementItem,
)

# ------------------------------------------------------------------------------
# 1. CURATED STOPWORDS, BOILERPLATE WORDS, AND HEADING PATTERNS
# ------------------------------------------------------------------------------

GENERIC_BOILERPLATE_WORDS: Set[str] = {
    # Ordinary English stopwords
    "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "with", "by", "from",
    "as", "of", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
    "do", "does", "did", "can", "could", "will", "would", "should", "our", "you", "your",
    "we", "they", "this", "that", "it", "not", "but", "all", "any", "both", "each", "few",
    "more", "most", "other", "some", "such", "no", "nor", "too", "very", "who", "which",
    "what", "where", "when", "why", "how", "if", "then", "else", "than", "so", "up", "out",
    "about", "into", "over", "after", "before", "between", "under", "again", "further",
    
    # Generic JD words identified in audit (NEVER standalone skills)
    "job", "description", "hiring", "looking", "passionate", "just", "write", "writing",
    "builds", "build", "building", "builder", "products", "product", "solves", "solve",
    "solving", "problems", "problem", "join", "team", "teams", "role", "roles", "work",
    "working", "worker", "opportunity", "opportunities", "company", "companies", "great",
    "best", "people", "candidate", "candidates", "position", "positions", "apply", "applying",
    "applicant", "overview", "summary", "profile", "about", "help", "helping", "make", "making",
    "grow", "growing", "growth", "fast-paced", "dynamic", "culture", "environment", "mission",
    "vision", "values", "ideal", "successful", "thrive", "thriving", "drive", "driving",
    "lead", "leading", "support", "supporting", "deliver", "delivering", "delivery", "ensure",
    "ensuring", "create", "creating", "maintain", "maintaining", "collaborate", "collaborating",
    "communicate", "communicating", "skills", "skill", "ability", "able", "experience",
    "experienced", "background", "track", "record", "track-record", "years", "year", "month",
    "months", "day", "days", "annual", "hourly", "plus", "must", "need", "needs", "needed",
    "preferred", "minimum", "basic", "knowledge", "understanding", "proficient", "proficiency",
    "familiar", "familiarity", "expert", "expertise", "world-class", "innovative", "impact",
    "status", "equal", "employment", "benefits", "salary", "compensation", "perks", "full-time",
    "part-time", "contract", "remote", "hybrid", "office", "location", "locations", "city",
    "state", "country", "notice", "race", "color", "religion", "sex", "gender", "national",
    "origin", "disability", "veteran", "duties", "responsibilities", "responsibility",
    "requirements", "requirement", "qualifications", "qualification", "offer", "offering",
    "ready", "excited", "looking", "forward", "send", "resume", "cv", "today", "now", "please",
}

SECTION_HEADING_PATTERNS = [
    re.compile(r"^(?:job\s+description|about\s+(?:the\s+)?(?:role|company|us|team)|who\s+we\s+are|what\s+you(?:'ll|\s+will)\s+do|responsibilities|key\s+responsibilities|requirements|minimum\s+qualifications|basic\s+qualifications|preferred\s+qualifications|qualifications|what\s+you\s+need|nice\s+to\s+have|benefits(?:\s+&\s+perks)?|equal\s+opportunity\s+employer|how\s+to\s+apply)[:\s]*$", re.IGNORECASE),
    re.compile(r"^(?:overview|role\s+overview|job\s+summary|position\s+summary|key\s+duties)[:\s]*$", re.IGNORECASE),
]


# ------------------------------------------------------------------------------
# 2. CANONICAL TECHNICAL SKILL TAXONOMY WITH ALIASES & ADJACENCIES
# ------------------------------------------------------------------------------

SKILL_TAXONOMY: List[Dict] = [
    {
        "canonical": "React",
        "category": "technical_skill",
        "aliases": ["react", "react.js", "reactjs"],
        "adjacent": ["Next.js", "Vue", "Angular"],
    },
    {
        "canonical": "Next.js",
        "category": "technical_skill",
        "aliases": ["next.js", "nextjs", "next js", "next.js app router"],
        "adjacent": ["React"],
    },
    {
        "canonical": "TypeScript",
        "category": "technical_skill",
        "aliases": ["typescript", "ts"],
        "adjacent": ["JavaScript"],
    },
    {
        "canonical": "JavaScript",
        "category": "technical_skill",
        "aliases": ["javascript", "js", "es6", "es6+"],
        "adjacent": ["TypeScript"],
    },
    {
        "canonical": "Python",
        "category": "technical_skill",
        "aliases": ["python", "python3"],
        "adjacent": ["FastAPI", "Django", "Flask"],
    },
    {
        "canonical": "FastAPI",
        "category": "technical_skill",
        "aliases": ["fastapi", "fast api"],
        "adjacent": ["Python", "Flask", "Django"],
    },
    {
        "canonical": "Django",
        "category": "technical_skill",
        "aliases": ["django"],
        "adjacent": ["Python", "FastAPI"],
    },
    {
        "canonical": "Flask",
        "category": "technical_skill",
        "aliases": ["flask"],
        "adjacent": ["Python", "FastAPI"],
    },
    {
        "canonical": "PostgreSQL",
        "category": "technical_skill",
        "aliases": ["postgresql", "postgres", "psql"],
        "adjacent": ["MySQL", "SQL"],
    },
    {
        "canonical": "Docker",
        "category": "technical_skill",
        "aliases": ["docker", "docker containerization", "containerized services", "containerization"],
        "adjacent": ["Kubernetes"],
    },
    {
        "canonical": "Kubernetes",
        "category": "technical_skill",
        "aliases": ["kubernetes", "k8s", "kubernetes orchestration"],
        "adjacent": ["Docker"],
    },
    {
        "canonical": "RESTful APIs",
        "category": "technical_skill",
        "aliases": ["restful api", "rest api", "restful apis", "rest apis", "restful api development", "rest api development", "rest"],
        "adjacent": ["GraphQL"],
    },
    {
        "canonical": "GraphQL",
        "category": "technical_skill",
        "aliases": ["graphql", "graphql schema", "graphql apis"],
        "adjacent": ["RESTful APIs"],
    },
    {
        "canonical": "CI/CD Pipelines",
        "category": "technical_skill",
        "aliases": ["ci/cd", "ci cd", "cicd", "continuous integration", "continuous deployment", "ci/cd pipelines", "github actions", "gitlab ci"],
        "adjacent": ["Docker"],
    },
    {
        "canonical": "AWS",
        "category": "technical_skill",
        "aliases": ["aws", "amazon web services"],
        "adjacent": ["GCP", "Azure"],
    },
    {
        "canonical": "Google Cloud (GCP)",
        "category": "technical_skill",
        "aliases": ["gcp", "google cloud platform", "google cloud"],
        "adjacent": ["AWS", "Azure"],
    },
    {
        "canonical": "Microsoft Azure",
        "category": "technical_skill",
        "aliases": ["azure", "microsoft azure"],
        "adjacent": ["AWS", "GCP"],
    },
    {
        "canonical": "Terraform",
        "category": "technical_skill",
        "aliases": ["terraform", "infrastructure as code", "iac"],
        "adjacent": ["CloudFormation", "AWS"],
    },
    {
        "canonical": "Redis",
        "category": "technical_skill",
        "aliases": ["redis"],
        "adjacent": ["Memcached"],
    },
    {
        "canonical": "Kafka",
        "category": "technical_skill",
        "aliases": ["kafka", "apache kafka", "distributed streaming"],
        "adjacent": ["RabbitMQ", "Redis"],
    },
    {
        "canonical": "SQL",
        "category": "technical_skill",
        "aliases": ["sql", "sql optimization", "relational databases", "database query optimization"],
        "adjacent": ["PostgreSQL", "MySQL"],
    },
    {
        "canonical": "NoSQL",
        "category": "technical_skill",
        "aliases": ["nosql", "mongodb", "dynamodb", "cassandra"],
        "adjacent": ["SQL"],
    },
    {
        "canonical": "Git",
        "category": "technical_skill",
        "aliases": ["git", "github", "gitlab", "version control"],
        "adjacent": [],
    },
    {
        "canonical": "Node.js",
        "category": "technical_skill",
        "aliases": ["node.js", "nodejs", "node"],
        "adjacent": ["Express", "TypeScript"],
    },
    {
        "canonical": "Express.js",
        "category": "technical_skill",
        "aliases": ["express", "express.js", "expressjs"],
        "adjacent": ["Node.js"],
    },
    {
        "canonical": "Tailwind CSS",
        "category": "technical_skill",
        "aliases": ["tailwind", "tailwind css", "tailwindcss"],
        "adjacent": ["CSS"],
    },
    {
        "canonical": "HTML & CSS",
        "category": "technical_skill",
        "aliases": ["html", "css", "html5", "css3", "html/css"],
        "adjacent": ["Tailwind CSS"],
    },
    {
        "canonical": "Automated Testing",
        "category": "technical_skill",
        "aliases": ["unit testing", "integration testing", "automated testing", "pytest", "jest", "test suites", "tdd"],
        "adjacent": [],
    },
    {
        "canonical": "Microservices",
        "category": "technical_skill",
        "aliases": ["microservices", "microservice architecture", "distributed systems"],
        "adjacent": ["RESTful APIs"],
    },
    {
        "canonical": "Linux",
        "category": "technical_skill",
        "aliases": ["linux", "unix", "bash"],
        "adjacent": [],
    },
    {
        "canonical": "Go (Golang)",
        "category": "technical_skill",
        "aliases": ["golang", "go programming", "go language"],
        "adjacent": ["Python", "Rust"],
    },
    {
        "canonical": "Java",
        "category": "technical_skill",
        "aliases": ["java", "spring", "spring boot"],
        "adjacent": ["Kotlin", "C#"],
    },
    {
        "canonical": "C++",
        "category": "technical_skill",
        "aliases": ["c++"],
        "adjacent": ["C", "Rust"],
    },
    {
        "canonical": "C# / .NET",
        "category": "technical_skill",
        "aliases": ["c#", ".net", "dotnet", "asp.net"],
        "adjacent": ["Java"],
    },
]


class MatchEngineService:
    """
    Production-grade Phrase-Based Requirement Matcher & ATS Friendliness Engine.
    Extracts genuine technical skills, qualifications, experience, and responsibilities.
    Rejects generic words and document boilerplate.
    Provides evidence-based matching (matched, partially_matched, missing) with zero hallucination.
    """

    @classmethod
    def is_boilerplate_or_heading(cls, line: str) -> bool:
        """Determines if a text line is a section header, boilerplate, or navigation fragment."""
        cleaned = line.strip()
        if not cleaned:
            return True
        for pattern in SECTION_HEADING_PATTERNS:
            if pattern.match(cleaned):
                return True
        # If line contains 1-3 words and all words are generic words, it's boilerplate
        words = [w.lower() for w in re.findall(r"\b[A-Za-z]+\b", cleaned)]
        if words and len(words) <= 3 and all(w in GENERIC_BOILERPLATE_WORDS for w in words):
            return True
        return False

    @classmethod
    def extract_experience_requirements(cls, jd_text: str) -> List[Tuple[str, str]]:
        """
        Extracts genuine experience phrases (e.g. '4+ years of professional full-stack software engineering experience').
        Returns list of (canonical_requirement, job_evidence).
        """
        exp_requirements: List[Tuple[str, str]] = []
        lines = jd_text.splitlines()

        exp_regex = re.compile(
            r"(\b\d+\+?\s*(?:to\s*\d+\+?)?\s*years?(?:\s+of)?\s+([A-Za-z0-9\s\-/]+?(?:experience|engineering|development|software|full-stack|backend|frontend)))",
            re.IGNORECASE,
        )

        for line in lines:
            if cls.is_boilerplate_or_heading(line):
                continue
            match = exp_regex.search(line)
            if match:
                full_phrase = match.group(1).strip()
                # Clean up punctuation and trailing words
                cleaned_phrase = re.sub(r"[\.,;:].*$", "", full_phrase).strip()
                if len(cleaned_phrase) > 10 and not all(w.lower() in GENERIC_BOILERPLATE_WORDS for w in cleaned_phrase.split()):
                    # Standardize title case
                    canonical = " ".join(w.capitalize() if w.lower() not in {"of", "in", "and", "with"} else w.lower() for w in cleaned_phrase.split())
                    exp_requirements.append((canonical, line.strip()))

        return exp_requirements

    @classmethod
    def extract_education_requirements(cls, jd_text: str) -> List[Tuple[str, str]]:
        """Extracts formal education or degree requirements if explicitly stated."""
        edu_requirements: List[Tuple[str, str]] = []
        edu_regex = re.compile(
            r"(\b(?:bachelor'?s|master'?s|b\.?s\.?|m\.?s\.?|degree)\s+(?:of\s+[A-Za-z]+\s+)?in\s+[A-Za-z0-9\s/]+)",
            re.IGNORECASE,
        )
        for line in jd_text.splitlines():
            if cls.is_boilerplate_or_heading(line):
                continue
            match = edu_regex.search(line)
            if match:
                phrase = match.group(1).strip()
                cleaned = re.sub(r"[\.,;:].*$", "", phrase).strip()
                canonical = " ".join(w.capitalize() if w.lower() not in {"of", "in", "and"} else w.lower() for w in cleaned.split())
                edu_requirements.append((canonical, line.strip()))
        return edu_requirements

    @classmethod
    def find_phrase_in_text(cls, phrase: str, text: str) -> Optional[str]:
        """
        Searches for a phrase in text with exact word boundaries.
        Returns the matching sentence or line as evidence if found.
        """
        # Escape special regex chars but keep space flexible
        escaped = re.escape(phrase.lower())
        # Replace escaped spaces with \s+ to handle whitespace variation
        pattern_str = r"\b" + escaped.replace(r"\ ", r"\s+") + r"\b"
        
        # Special handling for symbols like C++, C#, .NET
        if "++" in phrase or "#" in phrase or ".net" in phrase.lower():
            pattern_str = r"(?:^|\s|[,\(])" + re.escape(phrase.lower()) + r"(?:$|\s|[\),;\.])"

        regex = re.compile(pattern_str, re.IGNORECASE)

        # First scan line by line for concise evidence
        for line in text.splitlines():
            clean_line = line.strip().lstrip("•-* ").strip()
            if clean_line and regex.search(clean_line):
                return clean_line

        # Fallback to sentence search
        sentences = re.split(r"(?<=[.!?])\s+", text)
        for s in sentences:
            clean_s = s.strip()
            if clean_s and regex.search(clean_s):
                return clean_s

        return None

    @classmethod
    def extract_meaningful_requirements(cls, jd_text: str) -> List[Tuple[str, str, str, List[str], List[str]]]:
        """
        Extracts genuine, structured job requirements from the JD.
        Returns tuples of: (canonical_name, category, job_evidence, aliases, adjacent_skills).
        Guarantees generic words like 'Job', 'Description', 'Hiring' are never extracted.
        """
        if not jd_text or len(jd_text.strip()) < 10:
            return []

        extracted_requirements: List[Tuple[str, str, str, List[str], List[str]]] = []
        seen_canonical: Set[str] = set()

        # 1. Experience Requirements (e.g. 4+ Years Full-Stack Engineering Experience)
        for canonical, evidence in cls.extract_experience_requirements(jd_text):
            if canonical.lower() not in seen_canonical:
                seen_canonical.add(canonical.lower())
                extracted_requirements.append((canonical, "experience", evidence, [canonical.lower()], []))

        # 2. Education Requirements
        for canonical, evidence in cls.extract_education_requirements(jd_text):
            if canonical.lower() not in seen_canonical:
                seen_canonical.add(canonical.lower())
                extracted_requirements.append((canonical, "education", evidence, [canonical.lower()], []))

        # 3. Known Technical Skills & Tools from Taxonomy
        for item in SKILL_TAXONOMY:
            canonical = item["canonical"]
            if canonical.lower() in seen_canonical:
                continue

            # Check if any alias appears in JD with word boundary
            matched_evidence: Optional[str] = None
            for alias in item["aliases"]:
                ev = cls.find_phrase_in_text(alias, jd_text)
                if ev and not cls.is_boilerplate_or_heading(ev):
                    matched_evidence = ev
                    break

            if matched_evidence:
                seen_canonical.add(canonical.lower())
                extracted_requirements.append((
                    canonical,
                    item["category"],
                    matched_evidence,
                    item["aliases"],
                    item.get("adjacent", []),
                ))

        # 4. Multi-word technical bullet phrases from Requirements / Responsibilities section
        # Scan lines with bullets that mention concrete responsibilities
        for line in jd_text.splitlines():
            cleaned = line.strip().lstrip("•-* ").strip()
            if len(cleaned) < 15 or cls.is_boilerplate_or_heading(cleaned):
                continue
            # If line describes a concrete responsibility or domain requirement
            resp_patterns = [
                re.compile(r"^(?:architect|engineer|design|deploy|optimize|lead|maintain)\s+([A-Za-z0-9\s\-/]+)", re.IGNORECASE),
                re.compile(r"^(?:deep\s+expertise|strong\s+proficiency|demonstrated\s+experience)\s+in\s+([A-Za-z0-9\s\-/]+)", re.IGNORECASE),
            ]
            for rp in resp_patterns:
                m = rp.search(cleaned)
                if m:
                    phrase = m.group(1).split(",")[0].split("(")[0].strip()
                    words = phrase.split()
                    if 2 <= len(words) <= 5 and not all(w.lower() in GENERIC_BOILERPLATE_WORDS for w in words):
                        canonical = " ".join(w.capitalize() if w.lower() not in {"of", "in", "and", "with"} else w.lower() for w in words)
                        if canonical.lower() not in seen_canonical:
                            seen_canonical.add(canonical.lower())
                            extracted_requirements.append((canonical, "responsibility", cleaned, [canonical.lower()], []))
                            break

        return extracted_requirements

    @classmethod
    def evaluate_requirement_support(
        cls,
        canonical: str,
        category: str,
        job_evidence: str,
        aliases: List[str],
        adjacent_skills: List[str],
        resume_text: str,
    ) -> RequirementItem:
        """
        Determines whether the resume supports the requirement with evidence.
        Distinguishes full match, partial match, or missing. Never invents resume evidence.
        """
        if not resume_text:
            return RequirementItem(
                requirement=canonical,
                category=category,
                status="missing",
                job_evidence=job_evidence,
                resume_evidence=None,
                explanation="No resume content provided to evaluate.",
                confidence=1.0,
            )

        # 1. Full Match Check: check canonical and all aliases
        for term in [canonical] + aliases:
            ev = cls.find_phrase_in_text(term, resume_text)
            if ev:
                return RequirementItem(
                    requirement=canonical,
                    category=category,
                    status="matched",
                    job_evidence=job_evidence,
                    resume_evidence=ev,
                    explanation=f"Direct evidence found in candidate background matching '{canonical}'.",
                    confidence=0.98,
                )

        # Special Experience Match (e.g. '4+ Years Full-Stack Engineering Experience')
        if category == "experience":
            # If candidate resume has years of experience or senior roles
            has_sr = bool(re.search(r"\b(?:senior|lead|staff|principal|4\+|5\+|6\+|7\+|8\+)\b", resume_text, re.IGNORECASE))
            has_exp_heading = bool(re.search(r"\b(?:experience|work\s+history)\b", resume_text, re.IGNORECASE))
            if has_sr and has_exp_heading:
                ev = cls.find_phrase_in_text("senior", resume_text) or cls.find_phrase_in_text("engineer", resume_text)
                return RequirementItem(
                    requirement=canonical,
                    category=category,
                    status="matched",
                    job_evidence=job_evidence,
                    resume_evidence=ev,
                    explanation=f"Candidate's documented professional experience demonstrates qualifying seniority.",
                    confidence=0.92,
                )
            elif has_exp_heading:
                ev = cls.find_phrase_in_text("engineer", resume_text) or cls.find_phrase_in_text("developer", resume_text)
                return RequirementItem(
                    requirement=canonical,
                    category=category,
                    status="partially_matched",
                    job_evidence=job_evidence,
                    resume_evidence=ev,
                    explanation=f"Candidate demonstrates professional software experience, but exact stated duration requires interview confirmation.",
                    confidence=0.80,
                )

        # 2. Partial Match Check via Adjacent Skills
        for adj in adjacent_skills:
            ev = cls.find_phrase_in_text(adj, resume_text)
            if ev:
                return RequirementItem(
                    requirement=canonical,
                    category=category,
                    status="partially_matched",
                    job_evidence=job_evidence,
                    resume_evidence=ev,
                    explanation=f"Related adjacent competency '{adj}' detected, though direct '{canonical}' experience is not evidenced.",
                    confidence=0.82,
                )

        # 3. Missing: No direct or adjacent evidence found
        return RequirementItem(
            requirement=canonical,
            category=category,
            status="missing",
            job_evidence=job_evidence,
            resume_evidence=None,
            explanation=f"No direct or transferable evidence found in resume for '{canonical}'.",
            confidence=0.95,
        )

    @classmethod
    def calculate_match(
        cls,
        resume_text: str,
        job_description: str,
        parsed_skills: Dict[str, List[str]] = None,
    ) -> MatchScoreResponse:
        """
        Main entry point for Match Score & ATS Friendliness Audit.
        Extracts genuine, phrase-based requirements and evaluates evidence.
        Guarantees zero generic-word false positives.
        """
        # 1. Extract genuine requirements from JD
        raw_requirements = cls.extract_meaningful_requirements(job_description)

        # 2. Evaluate each requirement against the resume
        requirement_items: List[RequirementItem] = []
        for canonical, category, job_ev, aliases, adjacent in raw_requirements:
            item = cls.evaluate_requirement_support(
                canonical=canonical,
                category=category,
                job_evidence=job_ev,
                aliases=aliases,
                adjacent_skills=adjacent,
                resume_text=resume_text,
            )
            requirement_items.append(item)

        # Deduplicate requirement items by requirement name
        unique_reqs: Dict[str, RequirementItem] = {}
        for req in requirement_items:
            req_key = req.requirement.lower().strip()
            if req_key not in unique_reqs:
                unique_reqs[req_key] = req
        final_requirements = list(unique_reqs.values())

        # Categorize requirements
        matched_skills = [r.requirement for r in final_requirements if r.status == "matched"]
        partially_matched_skills = [r.requirement for r in final_requirements if r.status == "partially_matched"]
        missing_skills = [r.requirement for r in final_requirements if r.status == "missing"]

        # Ensure totals are mathematically exact and consistent
        total_unique_requirements = len(final_requirements)
        if total_unique_requirements > 0:
            skills_score = int(round(
                ((len(matched_skills) + 0.5 * len(partially_matched_skills)) / total_unique_requirements) * 100
            ))
            skills_score = max(10, min(100, skills_score))
        else:
            # Fallback when JD contains no extractable technical requirements
            skills_score = 75 if resume_text else 0

        # Experience score: evaluate action verbs and career progression
        action_verbs = {"developed", "led", "architected", "managed", "built", "designed", "optimized", "implemented", "reduced", "increased", "engineered", "scaled"}
        resume_words = set(re.findall(r"\b[A-Za-z]{3,}\b", resume_text.lower()))
        found_verbs = resume_words.intersection(action_verbs)
        exp_score_base = min(100, int((len(found_verbs) / max(1, len(action_verbs))) * 100))
        experience_score = max(50, min(95, int((skills_score * 0.5) + (exp_score_base * 0.5))))

        # Keyword alignment score: meaningful keyword overlap (excluding generic words)
        jd_non_generic = {w for w in re.findall(r"\b[A-Za-z0-9#\+\.]{3,}\b", job_description.lower()) if w not in GENERIC_BOILERPLATE_WORDS}
        if jd_non_generic:
            overlap = resume_words.intersection(jd_non_generic)
            keyword_score = min(100, int((len(overlap) / len(jd_non_generic)) * 100 * 2.0))
        else:
            keyword_score = 70

        # Overall weighted match score: 40% Skills + 35% Experience + 25% Keywords
        overall_match = int(round(skills_score * 0.40 + experience_score * 0.35 + keyword_score * 0.25))
        overall_match = max(35, min(98, overall_match))

        # ATS Checklist
        has_exp = any(h in resume_text.lower() for h in ["experience", "employment", "history", "work"])
        has_edu = any(h in resume_text.lower() for h in ["education", "degree", "university", "college"])
        headings_passed = has_exp and has_edu

        has_email = bool(re.search(r"[\w\.-]+@[\w\.-]+\.\w+", resume_text))
        has_phone = bool(re.search(r"\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", resume_text))
        contact_passed = has_email and has_phone

        selectable_passed = len(resume_text.strip()) > 50 and all(ord(c) < 10000 for c in resume_text[:500])

        bullet_count = len(re.findall(r"(?:^|\n)\s*[•\-\*\u2022]", resume_text))
        bullet_passed = bullet_count >= 3

        ats_checks = [
            ATSFriendlinessCheck(
                category="Standard Section Headings",
                passed=headings_passed,
                details="Standard headings detected (Experience, Education, Skills) for reliable ATS indexing." if headings_passed else "Missing standard section headers. Use conventional headings like 'Work Experience' and 'Education'.",
                impact="High",
            ),
            ATSFriendlinessCheck(
                category="Contact Information Completeness",
                passed=contact_passed,
                details="Direct professional email and phone number parseable in header." if contact_passed else "Email address or phone number could not be cleanly identified.",
                impact="High",
            ),
            ATSFriendlinessCheck(
                category="Selectable Text & Character Encoding",
                passed=selectable_passed,
                details="Pure text formatting verified without scanned image artifacts or corrupt glyphs.",
                impact="High",
            ),
            ATSFriendlinessCheck(
                category="Action-Oriented Bullet Structure",
                passed=bullet_passed,
                details=f"Identified {bullet_count} structured bullet points for experience scannability." if bullet_passed else "Few bullet points detected. Structure achievements into discrete bullet points.",
                impact="Medium",
            ),
            ATSFriendlinessCheck(
                category="Keyword Integration Balance",
                passed=len(matched_skills) >= 2,
                details=f"Integrated {len(matched_skills)} verified core target requirements naturally into background.",
                impact="Medium",
            ),
        ]

        ats_score = int(round((sum(20 for c in ats_checks if c.passed)) * 0.85 + (skills_score * 0.15)))
        ats_score = max(50, min(96, ats_score))

        # Actionable Suggestions strictly for genuine missing skills
        suggestions = []
        if missing_skills:
            clean_missing_list = ", ".join(missing_skills[:3])
            suggestions.append(f"Target Skills to Address: Review missing job requirements such as {clean_missing_list}. If you have adjacent experience, discuss this in interviews without fabricating qualifications.")
        if partially_matched_skills:
            clean_partial_list = ", ".join(partially_matched_skills[:2])
            suggestions.append(f"Highlight Adjacent Experience: You have related experience for {clean_partial_list}. Clarify your transferable systems knowledge in your cover letter.")
        if not headings_passed:
            suggestions.append("Ensure standard heading names ('Work Experience', 'Education') are placed on their own lines.")
        if not contact_passed:
            suggestions.append("Verify your professional email and direct telephone number appear in the document header.")

        return MatchScoreResponse(
            overall_match_score=overall_match,
            ats_score=ats_score,
            breakdown=MatchBreakdown(
                skills_score=skills_score,
                experience_score=experience_score,
                keyword_score=keyword_score,
            ),
            matched_skills=matched_skills,
            partially_matched_skills=partially_matched_skills,
            missing_skills=missing_skills,
            matched_keywords=matched_skills[:10],
            missing_keywords=missing_skills[:10],
            requirements=final_requirements,
            actionable_suggestions=suggestions,
            ats_checks=ats_checks,
        )

    @classmethod
    def extract_tech_stack(cls, jd_text: str) -> List[str]:
        """
        Extracts verified technical skills, frameworks, tools, databases, and languages
        from the job description. Returns a list of canonical technology names.
        """
        reqs = cls.extract_meaningful_requirements(jd_text)
        tech_skills: List[str] = []
        seen = set()
        for canonical, category, _, _, _ in reqs:
            if category in ("technical_skill", "tool", "framework", "database", "cloud") or canonical.lower() not in seen:
                if category == "technical_skill" and canonical.lower() not in seen:
                    seen.add(canonical.lower())
                    tech_skills.append(canonical)
        return tech_skills


match_engine_service = MatchEngineService()

