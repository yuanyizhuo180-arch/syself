'use client';

import { useEffect, useState } from 'react';
import { DecisionTimeline } from '@/app/workspace/decision-timeline';
import { WorkspaceShell } from '@/app/workspace/workspace-shell';

export function DecisionPathClient() {
  const [goal, setGoal] = useState<{ id: string; normalized_name?: string; raw_input?: string } | null>(null);
  const [events, setEvents] = useState<never[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { void fetch('/api/goal').then((response) => response.json()).then(async ({ goal: activeGoal }) => { setGoal(activeGoal); if (!activeGoal) return; const response = await fetch(`/api/decision-events?goalId=${activeGoal.id}`); const body = await response.json(); setEvents(body.events ?? []); }).catch(() => setError('无法读取决策路径，请稍后重试。')); }, []);
  return <WorkspaceShell active="decisionPath" goalName={goal?.normalized_name ?? goal?.raw_input ?? ''}>{error ? <p role="alert">{error}</p> : <DecisionTimeline events={events} />}</WorkspaceShell>;
}
