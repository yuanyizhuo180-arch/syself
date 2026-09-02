import { changeGoalWorkNode, editGoalWorkNode } from '@/lib/workspace-repository';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await context.params;
  try {
    const body = await request.json() as { action?: 'accept' | 'complete' | 'pause' | 'edit'; rationale?: string; title?: string; successCriteria?: string };
    if (!body.action || !['accept', 'complete', 'pause', 'edit'].includes(body.action)) return Response.json({ code: 'INVALID_INPUT', userMessage: '不支持的节点操作', retryable: false }, { status: 400 });
    if (body.action === 'edit' && (!body.title?.trim() || !body.successCriteria?.trim())) return Response.json({ code: 'INVALID_INPUT', userMessage: '请填写目标名称和完成标准', retryable: false }, { status: 400 });
    const node = body.action === 'edit' ? await editGoalWorkNode(id, body.title!.trim(), body.successCriteria!.trim(), body.rationale ?? null) : await changeGoalWorkNode(id, body.action, body.rationale ?? null);
    if (!node) return Response.json({ code: 'NOT_FOUND', userMessage: '目标节点不存在', retryable: false }, { status: 404 });
    return Response.json({ node });
  } catch {
    return Response.json({ code: 'INTERNAL_ERROR', userMessage: '目标节点保存失败，请重试', retryable: true }, { status: 500 });
  }
}
