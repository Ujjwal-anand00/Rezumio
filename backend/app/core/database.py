import os
import sqlite3
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger("database")

DB_DIR = Path(__file__).resolve().parent.parent / "data"
DB_PATH = DB_DIR / "resume_app.db"


def init_db():
    """Initializes local SQLite database and tables with WAL mode for fast concurrent operations."""
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    cursor = conn.cursor()

    # Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            full_name TEXT,
            created_at TEXT NOT NULL
        )
    """)

    # Sessions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    """)

    # Original Resumes table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS original_resumes (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            original_filename TEXT NOT NULL,
            file_type TEXT NOT NULL,
            protected_data TEXT NOT NULL DEFAULT '{}',
            original_resume_data TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    """)

    # Resume versions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS resume_versions (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            label TEXT NOT NULL,
            version_name TEXT,
            target_role TEXT,
            job_title TEXT,
            company_name TEXT,
            job_description TEXT,
            job_description_snippet TEXT,
            original_resume_id TEXT,
            parent_version_id TEXT,
            target_tech_stack TEXT DEFAULT '[]',
            professional_summary TEXT,
            match_score REAL,
            ats_score INTEGER,
            resume_data TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    """)

    # Cover letters table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cover_letters (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            title TEXT NOT NULL,
            candidate_name TEXT,
            job_title TEXT,
            company_name TEXT,
            cover_letter_data TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    """)

    # Migrations for existing sqlite databases missing new columns
    cursor.execute("PRAGMA table_info(resume_versions)")
    existing_cols = {row[1] for row in cursor.fetchall()}
    new_cols = {
        "version_name": "TEXT",
        "job_title": "TEXT",
        "job_description": "TEXT",
        "original_resume_id": "TEXT",
        "parent_version_id": "TEXT",
        "target_tech_stack": "TEXT DEFAULT '[]'",
        "professional_summary": "TEXT",
        "match_score": "REAL",
    }
    for col_name, col_type in new_cols.items():
        if col_name not in existing_cols:
            try:
                cursor.execute(f"ALTER TABLE resume_versions ADD COLUMN {col_name} {col_type}")
            except Exception as e:
                logger.debug(f"Column {col_name} might already exist: {e}")

    conn.commit()
    conn.close()
    logger.info(f"Database initialized at {DB_PATH}")


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn
