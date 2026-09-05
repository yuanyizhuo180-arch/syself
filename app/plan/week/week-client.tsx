'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { WeeklyPlan } from '@/lib/schemas/task';
import { WeekPlanPanel } from './week-plan-panel';

export function WeekClient() {
  const goalId = useSearchParams().get('goalId') ?? ''; const router = useRouter();
  const [data, setData] = useState<{ plan: WeeklyPlan; routeId: string } | null>(null); const [error, setError] = useState<string | null>(null); const [confirming, setConfirming] = useState(false);
  useEffect(() => { if (!goalId) return; fetch('/api/ai/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goalId }) }).then(async r => { const body = await r.json(); if (!r.ok) throw new Error(body.userMessage); return body; }).then(setData).catch((e: Error) => setError(e.message)); }, [goalId]);
  async function confirm() { if (!data) return; setConfirming(true); const response = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goalId, routeId: data.routeId, tasks: data.plan.tasks }) }); if (response.ok) router.push('/today'); else { setError('确认失败，请重试'); setConfirming(false); } }
  if (!goalId || error) return <main className="status-screen"><h1>任务暂时无法生成</h1><p>{error ?? '缺少目标信息'}</p></main>;
  if (!data) return <main className="status-screen"><p className="eyebrow">正在安排未来七天</p><h1>每天推进三件事。</h1></main>;
  return <WeekPlanPanel plan={data.plan} onConfirm={confirm} confirming={confirming} />;
}
