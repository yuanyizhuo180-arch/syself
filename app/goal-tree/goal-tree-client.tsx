'use client';

import { useEffect, useState } from 'react';
import { GoalWorkTree, type TreeNode } from '@/app/workspace/goal-work-tree';
import { WorkspaceShell } from '@/app/workspace/workspace-shell';

export function GoalTreeClient() {
  const [goal, setGoal] = useState<{ id: string; normalized_name?: string; raw_input?: string } | null>(null);
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { void fetch('/api/goal').then((response) => response.json()).then(async ({ goal: activeGoal }) => { setGoal(activeGoal); if (!activeGoal) return; const response = await fetch(`/api/goal-work-tree?goalId=${activeGoal.id}`); const body = await response.json(); setNodes(body.nodes ?? []); }).catch(() => setError('无法读取目标工作树，请稍后重试。')); }, []);
  async function act(id: string, action: 'accept' | 'complete' | 'pause') { const response = await fetch(`/api/goal-work-nodes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) }); if (!response.ok) { setError('保存目标状态失败，请重试。'); return; } setNodes((current) => current.map((node) => node.id === id ? { ...node, status: action === 'accept' ? 'active' : action === 'complete' ? 'completed' : 'paused' } : node)); }
  async function edit(node: TreeNode) { const title = window.prompt('目标名称', node.title); const successCriteria = window.prompt('完成标准', node.success_criteria); if (!title || !successCriteria) return; const response = await fetch(`/api/goal-work-nodes/${node.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'edit', title, successCriteria }) }); if (!response.ok) { setError('保存编辑失败，请重试。'); return; } setNodes((current) => current.map((item) => item.id === node.id ? { ...item, title, success_criteria: successCriteria } : item)); }
  return <WorkspaceShell active="goalTree" goalName={goal?.normalized_name ?? goal?.raw_input ?? ''}>{error ? <p role="alert">{error}</p> : <GoalWorkTree nodes={nodes} onAction={act} onEdit={edit} />}</WorkspaceShell>;
}
