'use client';

import { useEffect, useState } from 'react';
import { DecisionTimeline } from '@/app/workspace/decision-timeline';
import { WorkspaceShell } from '@/app/workspace/workspace-shell';

export function DecisionPathClient() {
  const [goal, setGoal] = useState<{ id: string; normalized_name?: string; raw_input?: string } | null>(null);
  const [events, setEvents] = useState<Array<{ id: string; event_type: string; created_at: string; rationale: string | null; impact_json: string }>>([]);
  const [error, setError] = useState('');
  useEffect(() => { void fetch('/api/goal').then((response) => response.json()).then(async ({ goal: activeGoal }) => { setGoal(activeGoal); if (!activeGoal) return; const response = await fetch(`/api/decision-events?goalId=${activeGoal.id}`); const body = await response.json(); setEvents(body.events ?? []); }).catch(() => setError('无法读取决策路径，请稍后重试。')); }, []);
  async function replan(eventId: string) { if (!goal) return; const reason = window.prompt('为什么需要调整路线？'); if (!reason?.trim()) return; const response = await fetch('/api/replans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goalId: goal.id, eventId, reason }) }); const body = await response.json(); if (!response.ok) { setError(body.userMessage ?? '重新规划失败，请重试。'); return; } window.location.href = '/goal-tree'; }
  return <WorkspaceShell active="decisionPath" goalName={goal?.normalized_name ?? goal?.raw_input ?? ''}>{error ? <p role="alert">{error}</p> : <DecisionTimeline events={events} onReplan={replan} />}</WorkspaceShell>;
}
