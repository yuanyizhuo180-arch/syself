import { all, generateId, get, run, transaction } from '@/lib/db';
import type { GoalWorkNodeInput } from '@/lib/schemas/goal-work';

export type GoalWorkNodeRecord = {
  id: string; goal_id: string; parent_id: string | null; branch_id: string; node_type: 'month' | 'week';
  title: string; success_criteria: string; start_date: string; end_date: string;
  status: 'suggested' | 'active' | 'completed' | 'paused' | 'carried_forward' | 'archived';
  source: 'ai_suggestion' | 'manual' | 'replan'; route_phase_ref: string | null; supersedes_id: string | null;
};

export type GoalWorkTreeTaskRecord = {
  id: string; work_node_id: string | null; title: string; completion_criteria: string | null;
  minimum_action: string | null; estimated_minutes: number | null; day_date: string | null;
  status: 'planned' | 'done' | 'skipped' | 'partial' | 'paused';
};

export async function getActiveBranch(goalId: string) {
  return get<{ id: string; goal_id: string }>("SELECT id, goal_id FROM planning_branch WHERE goal_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1", goalId);
}

export async function getGoalWorkTree(goalId: string) {
  const branch = await getActiveBranch(goalId);
  if (!branch) return { branch: null, nodes: [] as GoalWorkNodeRecord[], tasks: [] as GoalWorkTreeTaskRecord[] };
  const nodes = await all<GoalWorkNodeRecord>('SELECT * FROM goal_work_node WHERE goal_id = ? AND branch_id = ? ORDER BY start_date, created_at', goalId, branch.id);
  const tasks = await all<GoalWorkTreeTaskRecord>(
    `SELECT task.id, task.work_node_id, task.title, task.completion_criteria, task.minimum_action, task.estimated_minutes, task.day_date, task.status
     FROM task INNER JOIN goal_work_node ON goal_work_node.id = task.work_node_id
     WHERE task.goal_id = ? AND goal_work_node.branch_id = ? ORDER BY task.day_date, task.created_at`, goalId, branch.id,
  );
  return { branch, nodes, tasks };
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

type RoutePathSource = {
  phases: Array<{ name?: unknown; focus?: unknown }>;
  firstMonthPreview: { week1_summary?: unknown; week2_summary?: unknown };
};

const addDays = (date: string, days: number) => {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
};

const textOr = (value: unknown, fallback: string) => typeof value === 'string' && value.trim() ? value.trim() : fallback;

async function createPathNode(input: Omit<GoalWorkNodeInput, 'source'> & { status: GoalWorkNodeRecord['status']; routePhaseRef: string }) {
  const id = generateId();
  await run(
    'INSERT INTO goal_work_node (id, goal_id, parent_id, branch_id, node_type, title, success_criteria, start_date, end_date, status, source, route_phase_ref) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    id, input.goalId, input.parentId, input.branchId, input.nodeType, input.title, input.successCriteria, input.startDate, input.endDate, input.status, 'ai_suggestion', input.routePhaseRef,
  );
  const node = await getGoalWorkNode(id);
  if (!node) throw new Error('创建目标路径节点失败');
  await insertDecisionEvent({ goalId: input.goalId, branchId: input.branchId, entityType: 'goal_work_node', entityId: id, eventType: input.status === 'suggested' ? 'node_suggested' : 'node_created', before: null, after: node, rationale: null });
  return node;
}

async function currentNode(goalId: string, branchId: string, nodeType: 'month' | 'week', startDate: string, parentId: string | null) {
  const parentClause = parentId === null ? 'parent_id IS NULL' : 'parent_id = ?';
  const params = parentId === null
    ? [goalId, branchId, nodeType, startDate, startDate]
    : [goalId, branchId, nodeType, parentId, startDate, startDate];
  return get<GoalWorkNodeRecord>(`SELECT * FROM goal_work_node WHERE goal_id = ? AND branch_id = ? AND node_type = ? AND ${parentClause} AND start_date <= ? AND end_date >= ? AND status IN ('active', 'suggested') ORDER BY start_date DESC LIMIT 1`, ...params);
}

async function futureNode(goalId: string, branchId: string, nodeType: 'month' | 'week', startDate: string, parentId: string | null) {
  const parentClause = parentId === null ? 'parent_id IS NULL' : 'parent_id = ?';
  const params = parentId === null
    ? [goalId, branchId, nodeType, startDate]
    : [goalId, branchId, nodeType, parentId, startDate];
  return get<GoalWorkNodeRecord>(`SELECT * FROM goal_work_node WHERE goal_id = ? AND branch_id = ? AND node_type = ? AND ${parentClause} AND start_date > ? AND status IN ('active', 'suggested') ORDER BY start_date ASC LIMIT 1`, ...params);
}

export async function ensureGoalWorkPath(input: { goalId: string; branchId: string; route: RoutePathSource; startDate: string }) {
  const firstPhase = input.route.phases[0] ?? {};
  const secondPhase = input.route.phases[1] ?? {};
  const firstName = textOr(firstPhase.name, '建立实践基础');
  const firstFocus = textOr(firstPhase.focus, '完成第一阶段的最小可验证产出');
  const secondName = textOr(secondPhase.name, `巩固${firstName}`);
  const secondFocus = textOr(secondPhase.focus, `在${firstName}基础上形成下一阶段成果`);
  const currentMonth = await currentNode(input.goalId, input.branchId, 'month', input.startDate, null)
    ?? await createPathNode({ goalId: input.goalId, branchId: input.branchId, parentId: null, nodeType: 'month', title: `第一个月：${firstName}`, successCriteria: firstFocus, startDate: input.startDate, endDate: addDays(input.startDate, 29), status: 'active', routePhaseRef: firstName });
  const currentWeek = await currentNode(input.goalId, input.branchId, 'week', input.startDate, currentMonth.id)
    ?? await createPathNode({ goalId: input.goalId, branchId: input.branchId, parentId: currentMonth.id, nodeType: 'week', title: `第 1 周：${textOr(input.route.firstMonthPreview.week1_summary, firstName)}`, successCriteria: firstFocus, startDate: input.startDate, endDate: addDays(input.startDate, 6), status: 'active', routePhaseRef: firstName });
  const nextWeekStart = addDays(input.startDate, 7);
  const futureWeek = await futureNode(input.goalId, input.branchId, 'week', input.startDate, currentMonth.id)
    ?? await createPathNode({ goalId: input.goalId, branchId: input.branchId, parentId: currentMonth.id, nodeType: 'week', title: `第 2 周：${textOr(input.route.firstMonthPreview.week2_summary, `继续推进${firstName}`)}`, successCriteria: `完成${textOr(input.route.firstMonthPreview.week2_summary, firstFocus)}的最小可验证产出`, startDate: nextWeekStart, endDate: addDays(nextWeekStart, 6), status: 'suggested', routePhaseRef: firstName });
  const nextMonthStart = addDays(input.startDate, 30);
  const futureMonth = await futureNode(input.goalId, input.branchId, 'month', input.startDate, null)
    ?? await createPathNode({ goalId: input.goalId, branchId: input.branchId, parentId: null, nodeType: 'month', title: `第二个月：${secondName}`, successCriteria: secondFocus, startDate: nextMonthStart, endDate: addDays(nextMonthStart, 29), status: 'suggested', routePhaseRef: secondName });
  return { currentMonth, currentWeek, futureWeek, futureMonth };
}

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

export async function editGoalWorkNode(id: string, title: string, successCriteria: string, rationale: string | null = null) {
  return transaction(async () => {
    const node = await getGoalWorkNode(id);
    if (!node) return null;
    await run('UPDATE goal_work_node SET title = ?, success_criteria = ?, updated_at = datetime(\'now\') WHERE id = ?', title, successCriteria, id);
    const next = { ...node, title, success_criteria: successCriteria };
    await insertDecisionEvent({ goalId: node.goal_id, branchId: node.branch_id, entityType: 'goal_work_node', entityId: id, eventType: 'node_edited', before: node, after: next, rationale });
    return next;
  });
}
