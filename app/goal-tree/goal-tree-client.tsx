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
  return <WorkspaceShell active="goalTree" goalName={goal?.normalized_name ?? goal?.raw_input ?? ''}>{error ? <p role="alert">{error}</p> : <GoalWorkTree nodes={nodes} onAction={act} />}</WorkspaceShell>;
}
