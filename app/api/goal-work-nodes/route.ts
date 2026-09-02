import { GoalWorkNodeInputSchema } from '@/lib/schemas/goal-work';
import { createGoalWorkNode } from '@/lib/workspace-repository';

export async function POST(request: Request): Promise<Response> {
  try {
    const input = GoalWorkNodeInputSchema.parse(await request.json());
    if (input.nodeType === 'month' && input.parentId !== null) throw new Error('月目标不能拥有父节点');
    if (input.nodeType === 'week' && input.parentId === null) throw new Error('周目标必须归属到月目标');
    const node = await createGoalWorkNode(input);
    return Response.json({ node }, { status: 201 });
  } catch (error) {
    return Response.json({ code: 'INVALID_INPUT', userMessage: error instanceof Error ? error.message : '目标信息不完整', retryable: false }, { status: 400 });
  }
}
