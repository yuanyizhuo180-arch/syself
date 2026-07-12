'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { RouteComparison } from '@/lib/schemas/plan-route';
import { RouteComparisonPanel } from './route-comparison-panel';

export function RoutesClient() {
  const goalId = useSearchParams().get('goalId') ?? '';
  const [comparison, setComparison] = useState<RouteComparison | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!goalId) { setError('缺少目标信息'); return; }
    fetch('/api/ai/routes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goalId }) })
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.userMessage); return body; })
      .then(setComparison).catch((reason: Error) => setError(reason.message));
  }, [goalId]);
  async function select(routeId: string) {
    const response = await fetch('/api/ai/routes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goalId, routeId }) });
    if (response.ok) setSelectedId(routeId); else setError('路线保存失败，请重试');
  }
  if (error) return <main className="status-screen"><h1>路线暂时无法生成</h1><p>{error}</p></main>;
  if (!comparison) return <main className="status-screen"><p className="eyebrow">正在推演两条路线</p><h1>同一个目标，不止一种走法。</h1></main>;
  return <RouteComparisonPanel comparison={comparison} selectedId={selectedId} onSelect={select} goalId={goalId} />;
}
