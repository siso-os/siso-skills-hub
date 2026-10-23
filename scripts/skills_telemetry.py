"""
Skills Telemetry SDK - Track skill invocations for analytics
"""
import sqlite3
import uuid
import time
import os
import hashlib
from pathlib import Path

DB_PATH = Path(os.environ.get("SISO_SKILLS_TELEMETRY_DB", str(Path.home() / ".local" / "share" / "siso-skills-hub" / "telemetry.db")))


def get_db():
    """Get database connection, creating tables if needed."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS skill_events (
            event_id TEXT PRIMARY KEY,
            skill_id TEXT NOT NULL,
            agent_id TEXT,
            session_id TEXT,
            timestamp REAL NOT NULL,
            duration_ms INTEGER,
            success INTEGER NOT NULL DEFAULT 1,
            error_type TEXT,
            context_hash TEXT,
            input_size INTEGER,
            output_size INTEGER
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_skill_id ON skill_events(skill_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_timestamp ON skill_events(timestamp)")
    conn.execute('''CREATE TABLE IF NOT EXISTS skill_import_cursors (
        source_hash TEXT PRIMARY KEY, inode INTEGER NOT NULL, byte_offset INTEGER NOT NULL
    )''')
    return conn


def track(skill_id, success=True, agent_id=None, session_id=None,
          duration_ms=None, error_type=None, context=None, event_id=None, timestamp=None):
    """Log a skill invocation."""
    conn = get_db()
    event_id = event_id or str(uuid.uuid4())
    timestamp = time.time() if timestamp is None else timestamp
    context_hash = hashlib.md5(context.encode()).hexdigest() if context else None

    conn.execute("""
        INSERT OR IGNORE INTO skill_events
        (event_id, skill_id, agent_id, session_id, timestamp, duration_ms, success, error_type, context_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (event_id, skill_id, agent_id, session_id, timestamp, duration_ms,
          int(success), error_type, context_hash))
    conn.commit()
    conn.close()


def get_stats(skill_id, days=30):
    """Return dict of stats for a skill: count, success_rate, avg_duration, unique_agents."""
    conn = get_db()
    cutoff = time.time() - (days * 86400)
    row = conn.execute("""
        SELECT COUNT(*),
               AVG(CASE WHEN success=1 THEN 1.0 ELSE 0.0 END),
               AVG(duration_ms),
               COUNT(DISTINCT agent_id)
        FROM skill_events WHERE skill_id=? AND timestamp>?
    """, (skill_id, cutoff)).fetchone()
    conn.close()
    return {
        "count": row[0],
        "success_rate": row[1],
        "avg_duration_ms": row[2],
        "unique_agents": row[3]
    }


def init_db():
    """Initialize the database schema."""
    conn = get_db()
    conn.close()
