import { all, get } from '@/lib/db';

export async function GET(): Promise<Response> {
  const goal = await get<{ id: string; normalized_name: string | null; raw_input: string }>("SELECT id, normalized_name, raw_input FROM goal WHERE status = 'active' ORDER BY updated_at DESC LIMIT 1");
  if (!goal) return Response.json({ goalName: '', keyAction: null, supportingActions: [], capacity: null });
  const tasks = await all<{ title: string; completion_criteria: string; minimum_action: string; estimated_minutes: number; work_node_id: string | null }>("SELECT title, completion_criteria, minimum_action, estimated_minutes, work_node_id FROM task WHERE goal_id = ? AND day_date = ? AND status = 'planned' ORDER BY created_at", goal.id, new Date().toISOString().slice(0, 10));
  const nodes = await all<{ id: string; title: string; node_type: string }>("SELECT id, title, node_type FROM goal_work_node WHERE goal_id = ? AND status = 'active'", goal.id);
  const enrich = (task: typeof tasks[number]) => {
    const week = nodes.find((node) => node.id === task.work_node_id && node.node_type === 'week');
    const month = week ? nodes.find((node) => node.id === week.id) : null;
    return { title: task.title, completionCriteria: task.completion_criteria, minimumAction: task.minimum_action, estimatedMinutes: task.estimated_minutes, weekTitle: week?.title ?? null, monthTitle: month?.title ?? null };
  };
  const [first, ...rest] = tasks;
  const capacity = await get<{ total: number }>("SELECT COALESCE(SUM(estimated_minutes), 0) AS total FROM task WHERE goal_id = ? AND status = 'planned'", goal.id);
  return Response.json({ goalName: goal.normalized_name ?? goal.raw_input, keyAction: first ? enrich(first) : null, supportingActions: rest.map((task) => ({ title: task.title, estimatedMinutes: task.estimated_minutes })), capacity: { committed: capacity?.total ?? 0, limit: 210 } });
}
