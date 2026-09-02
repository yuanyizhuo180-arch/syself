import { all } from '@/lib/db';

export async function GET(request: Request): Promise<Response> {
  const goalId = new URL(request.url).searchParams.get('goalId');
  if (!goalId) return Response.json({ code: 'INVALID_INPUT', userMessage: '缺少目标 ID', retryable: false }, { status: 400 });
  const events = await all('SELECT id, event_type, created_at, rationale, impact_json FROM decision_event WHERE goal_id = ? ORDER BY created_at DESC', goalId);
  return Response.json({ events });
}
