PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS goal (
  id TEXT PRIMARY KEY, raw_input TEXT NOT NULL, normalized_name TEXT, success_criteria TEXT,
  target_date TEXT, primary_area TEXT, current_state TEXT, status TEXT DEFAULT 'draft',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS goal_understanding (
  id TEXT PRIMARY KEY, goal_id TEXT NOT NULL REFERENCES goal(id), extracted_json TEXT NOT NULL,
  assumptions_json TEXT NOT NULL, missing_info_json TEXT, confidence REAL DEFAULT 0,
  prompt_version TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS follow_up_answers (
  id TEXT PRIMARY KEY, goal_id TEXT NOT NULL REFERENCES goal(id), field TEXT NOT NULL,
  question TEXT NOT NULL, answer TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS plan_route (
  id TEXT PRIMARY KEY, goal_id TEXT NOT NULL REFERENCES goal(id), route_type TEXT NOT NULL,
  title TEXT NOT NULL, thesis TEXT NOT NULL, phases_json TEXT NOT NULL, advantages_json TEXT NOT NULL,
  risks_json TEXT NOT NULL, first_month_preview_json TEXT NOT NULL, user_profile_basis_json TEXT NOT NULL,
  status TEXT DEFAULT 'draft', created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS route_selection (
  id TEXT PRIMARY KEY, goal_id TEXT NOT NULL REFERENCES goal(id),
  selected_route_id TEXT NOT NULL REFERENCES plan_route(id), rejected_route_id TEXT NOT NULL REFERENCES plan_route(id),
  user_notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS task (
  id TEXT PRIMARY KEY, goal_id TEXT NOT NULL REFERENCES goal(id), route_id TEXT REFERENCES plan_route(id),
  title TEXT NOT NULL, completion_criteria TEXT, minimum_action TEXT, estimated_minutes INTEGER,
  actual_minutes INTEGER, quadrant TEXT DEFAULT 'important_not_urgent', time_block TEXT, day_date TEXT,
  energy_level TEXT DEFAULT 'medium', status TEXT DEFAULT 'planned', skip_reason TEXT, partial_note TEXT,
  user_modified_fields TEXT DEFAULT '[]', created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS execution_event (
  id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES task(id), goal_id TEXT NOT NULL REFERENCES goal(id),
  date TEXT NOT NULL, status TEXT NOT NULL, actual_minutes INTEGER, difficulty TEXT, note TEXT,
  skip_reason TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS daily_reflection (
  id TEXT PRIMARY KEY, goal_id TEXT NOT NULL REFERENCES goal(id), date TEXT NOT NULL,
  stats_json TEXT NOT NULL, user_rating INTEGER, user_note TEXT, incomplete_reasons_json TEXT DEFAULT '[]',
  ai_insight_json TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS personal_model (
  id TEXT PRIMARY KEY DEFAULT 'singleton', behavior_patterns_json TEXT DEFAULT '{}',
  goal_preferences_json TEXT DEFAULT '{}', calibration_json TEXT DEFAULT '{}', data_points INTEGER DEFAULT 0,
  confidence REAL DEFAULT 0, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
