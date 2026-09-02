import { getGoalWorkTree } from '@/lib/workspace-repository';

export async function GET(request: Request): Promise<Response> {
  const goalId = new URL(request.url).searchParams.get('goalId');
  if (!goalId) return Response.json({ code: 'INVALID_INPUT', userMessage: '缺少目标 ID', retryable: false }, { status: 400 });
  return Response.json(await getGoalWorkTree(goalId));
}
