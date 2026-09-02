PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS planning_branch (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL REFERENCES goal(id),
  parent_branch_id TEXT REFERENCES planning_branch(id),
  base_decision_event_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS goal_work_node (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL REFERENCES goal(id),
  parent_id TEXT REFERENCES goal_work_node(id),
  branch_id TEXT NOT NULL REFERENCES planning_branch(id),
  node_type TEXT NOT NULL,
  title TEXT NOT NULL,
  success_criteria TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL,
  source TEXT NOT NULL,
  route_phase_ref TEXT,
  supersedes_id TEXT REFERENCES goal_work_node(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS decision_event (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL REFERENCES goal(id),
  branch_id TEXT NOT NULL REFERENCES planning_branch(id),
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  before_json TEXT,
  after_json TEXT,
  rationale TEXT,
  impact_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE task ADD COLUMN work_node_id TEXT REFERENCES goal_work_node(id);
