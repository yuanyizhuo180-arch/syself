import { all, generateId, get, run, transaction } from '@/lib/db';
import type { GoalWorkNodeInput } from '@/lib/schemas/goal-work';

export type GoalWorkNodeRecord = {
  id: string; goal_id: string; parent_id: string | null; branch_id: string; node_type: 'month' | 'week';
  title: string; success_criteria: string; start_date: string; end_date: string;
  status: 'suggested' | 'active' | 'completed' | 'paused' | 'carried_forward' | 'archived';
  source: 'ai_suggestion' | 'manual' | 'replan'; route_phase_ref: string | null; supersedes_id: string | null;
};

export async function getActiveBranch(goalId: string) {
  return get<{ id: string; goal_id: string }>("SELECT id, goal_id FROM planning_branch WHERE goal_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1", goalId);
}

export async function getGoalWorkTree(goalId: string) {
  const branch = await getActiveBranch(goalId);
  if (!branch) return { branch: null, nodes: [] as GoalWorkNodeRecord[] };
  return { branch, nodes: await all<GoalWorkNodeRecord>('SELECT * FROM goal_work_node WHERE goal_id = ? AND branch_id = ? ORDER BY start_date, created_at', goalId, branch.id) };
}

export async function createGoalWorkNode(input: GoalWorkNodeInput & { status?: GoalWorkNodeRecord['status']; routePhaseRef?: string | null }) {
  const id = generateId();
  await transaction(async () => {
    await run(
      'INSERT INTO goal_work_node (id, goal_id, parent_id, branch_id, node_type, title, success_criteria, start_date, end_date, status, source, route_phase_ref) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      id, input.goalId, input.parentId, input.branchId, input.nodeType, input.title, input.successCriteria, input.startDate, input.endDate, input.status ?? 'active', input.source, input.routePhaseRef ?? null,
    );
    await insertDecisionEvent({ goalId: input.goalId, branchId: input.branchId, entityType: 'goal_work_node', entityId: id, eventType: input.status === 'suggested' ? 'node_suggested' : 'node_created', before: null, after: { ...input, id }, rationale: null });
  });
  return getGoalWorkNode(id);
}

export async function getGoalWorkNode(id: string) { return get<GoalWorkNodeRecord>('SELECT * FROM goal_work_node WHERE id = ?', id); }

export async function insertDecisionEvent(input: { goalId: string; branchId: string; entityType: string; entityId: string; eventType: string; before: unknown; after: unknown; rationale: string | null }) {
  await run(
    'INSERT INTO decision_event (id, goal_id, branch_id, event_type, entity_type, entity_id, before_json, after_json, rationale) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    generateId(), input.goalId, input.branchId, input.eventType, input.entityType, input.entityId, JSON.stringify(input.before), JSON.stringify(input.after), input.rationale,
  );
}

export async function changeGoalWorkNode(id: string, action: 'accept' | 'complete' | 'pause', rationale: string | null = null) {
  return transaction(async () => {
    const node = await getGoalWorkNode(id);
    if (!node) return null;
    const status = action === 'accept' ? 'active' : action === 'complete' ? 'completed' : 'paused';
    await run('UPDATE goal_work_node SET status = ?, completed_at = ?, updated_at = datetime(\'now\') WHERE id = ?', status, status === 'completed' ? new Date().toISOString() : null, id);
    const next = { ...node, status };
    await insertDecisionEvent({ goalId: node.goal_id, branchId: node.branch_id, entityType: 'goal_work_node', entityId: id, eventType: `node_${action === 'accept' ? 'accepted' : action === 'complete' ? 'completed' : 'paused'}`, before: node, after: next, rationale });
    return next;
  });
}
