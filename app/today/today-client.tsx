'use client';
import { useEffect, useState } from 'react';
import { TodayTaskList, type TodayTask } from './today-task-list';
import { WorkspaceShell } from '@/app/workspace/workspace-shell';
const today = () => new Date().toISOString().slice(0, 10);
export function TodayClient() {
  const [tasks, setTasks] = useState<TodayTask[]>([]); const [error, setError] = useState<string | null>(null);
  useEffect(() => { fetch(`/api/tasks?date=${today()}`).then(r => r.json()).then(body => setTasks(body.tasks ?? [])).catch(() => setError('无法读取今日任务')); }, []);
  async function action(id: string, actionName: 'complete' | 'skip') { const response = await fetch(`/api/tasks/${id}/${actionName}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(actionName === 'skip' ? { reason: 'no_time' } : {}) }); if (response.ok) setTasks(current => current.filter(task => task.id !== id)); else setError('操作失败，请重试'); }
  return <WorkspaceShell active="today" goalName="当前主目标"><section className="route-intro"><p className="eyebrow">不是清空待办，而是推进方向</p><h1>今日，只推进最重要的事。</h1></section>{error && <p role="alert">{error}</p>}{tasks.length ? <TodayTaskList tasks={tasks} onComplete={id => action(id, 'complete')} onSkip={id => action(id, 'skip')} /> : <p className="empty-state">今天没有待执行任务。完成首周确认后，任务会在这里出现。</p>}</WorkspaceShell>;
}
