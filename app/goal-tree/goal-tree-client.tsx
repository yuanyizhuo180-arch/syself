'use client';

import { useEffect, useState } from 'react';
import { GoalWorkTree, type NewGoalWorkNode, type TreeNode } from '@/app/workspace/goal-work-tree';
import { WorkspaceShell } from '@/app/workspace/workspace-shell';

export function GoalTreeClient() {
  const [goal, setGoal] = useState<{ id: string; normalized_name?: string; raw_input?: string } | null>(null);
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [branchId, setBranchId] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { void fetch('/api/goal').then((response) => response.json()).then(async ({ goal: activeGoal }) => { setGoal(activeGoal); if (!activeGoal) return; const response = await fetch(`/api/goal-work-tree?goalId=${activeGoal.id}`); const body = await response.json(); setNodes(body.nodes ?? []); setBranchId(body.branch?.id ?? ''); }).catch(() => setError('无法读取目标工作树，请稍后重试。')); }, []);
  async function act(id: string, action: 'accept' | 'complete' | 'pause') { const response = await fetch(`/api/goal-work-nodes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) }); if (!response.ok) { setError('保存目标状态失败，请重试。'); return; } setNodes((current) => current.map((node) => node.id === id ? { ...node, status: action === 'accept' ? 'active' : action === 'complete' ? 'completed' : 'paused' } : node)); }
  async function edit(node: TreeNode) { const title = window.prompt('目标名称', node.title); const successCriteria = window.prompt('完成标准', node.success_criteria); if (!title || !successCriteria) return; const response = await fetch(`/api/goal-work-nodes/${node.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'edit', title, successCriteria }) }); if (!response.ok) { setError('保存编辑失败，请重试。'); return; } setNodes((current) => current.map((item) => item.id === node.id ? { ...item, title, success_criteria: successCriteria } : item)); }
  async function create({ nodeType, parentId }: NewGoalWorkNode) { if (!goal || !branchId) { setError('请先创建主目标和规划分支。'); return; } const title = window.prompt(nodeType === 'month' ? '月目标名称' : '周目标名称'); const successCriteria = window.prompt('完成标准'); const startDate = window.prompt('开始日期（YYYY-MM-DD）', new Date().toISOString().slice(0, 10)); const endDate = window.prompt('结束日期（YYYY-MM-DD）', startDate ?? ''); if (!title || !successCriteria || !startDate || !endDate) return; const response = await fetch('/api/goal-work-nodes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goalId: goal.id, branchId, nodeType, parentId, title, successCriteria, startDate, endDate, source: 'manual' }) }); const body = await response.json(); if (!response.ok || !body.node) { setError(body.userMessage ?? '创建目标失败，请重试。'); return; } setNodes((current) => [...current, body.node]); }
  return <WorkspaceShell active="goalTree" goalName={goal?.normalized_name ?? goal?.raw_input ?? ''}>{error ? <p role="alert">{error}</p> : <GoalWorkTree nodes={nodes} onAction={act} onEdit={edit} onCreate={create} />}</WorkspaceShell>;
}
