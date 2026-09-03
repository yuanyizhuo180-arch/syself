'use client';
import { useEffect, useState } from 'react';
import { TodayTaskList, type TodayTask } from './today-task-list';
import { TaskRecoveryPanel, type RecoveryAction } from './task-recovery-panel';
import { WorkspaceShell } from '@/app/workspace/workspace-shell';
import type { SkipReason } from '@/lib/types';
const today = () => new Date().toISOString().slice(0, 10);
export function TodayClient() {
  const [tasks, setTasks] = useState<TodayTask[]>([]); const [error, setError] = useState<string | null>(null); const [recoveryTask, setRecoveryTask] = useState<TodayTask | null>(null);
  useEffect(() => { fetch(`/api/tasks?date=${today()}`).then(r => r.json()).then(body => setTasks(body.tasks ?? [])).catch(() => setError('无法读取今日任务')); }, []);
  async function complete(id: string) { const response = await fetch(`/api/tasks/${id}/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); if (response.ok) setTasks(current => current.filter(task => task.id !== id)); else setError('操作失败，请重试'); }
  async function recover({ action, reason }: { action: RecoveryAction; reason: SkipReason }) { if (!recoveryTask) return; const response = await fetch(`/api/tasks/${recoveryTask.id}/recover`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, reason }) }); const body = await response.json(); if (!response.ok) { setError(body.userMessage ?? '恢复任务失败，请重试。'); return; } setTasks((current) => action === 'shrink' ? current.map((task) => task.id === recoveryTask.id ? { ...task, estimated_minutes: Math.min(task.estimated_minutes, 15) } : task) : current.filter((task) => task.id !== recoveryTask.id)); setRecoveryTask(null); }
  return <WorkspaceShell active="today" goalName="当前主目标"><section className="route-intro"><p className="eyebrow">不是清空待办，而是推进方向</p><h1>此刻只做一件事</h1></section>{error && <p role="alert">{error}</p>}{recoveryTask ? <TaskRecoveryPanel taskTitle={recoveryTask.title} onRecover={recover} onCancel={() => setRecoveryTask(null)} /> : tasks.length ? <TodayTaskList tasks={tasks} onComplete={complete} onSkip={setRecoveryTask} /> : <p className="empty-state">今天没有待执行任务。完成首周确认后，任务会在这里出现。</p>}</WorkspaceShell>;
}
