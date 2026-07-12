'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';

import type { GoalUnderstandingResult } from '@/lib/schemas/goal-understanding';

import { UnderstandingPanel } from './understanding-panel';

export function UnderstandingClient() {
  const params = useSearchParams();
  const router = useRouter();
  const rawGoal = params.get('goal')?.trim() ?? '';
  const [result, setResult] = useState<GoalUnderstandingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!rawGoal) return;
    const controller = new AbortController();
    fetch('/api/ai/understand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawGoal }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.userMessage ?? '目标理解失败');
        return body as GoalUnderstandingResult;
      })
      .then(setResult)
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name !== 'AbortError') setError(reason.message);
      });
    return () => controller.abort();
  }, [rawGoal]);

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!result) return;
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/goal', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goalId: result.goalId,
        desiredOutcome: form.get('desiredOutcome'),
        currentState: form.get('currentState'),
        timeHorizon: form.get('timeHorizon'),
      }),
    });
    if (response.ok) router.push(`/plan/routes?goalId=${encodeURIComponent(result.goalId)}`);
    else {
      const body = await response.json();
      setError(body.userMessage ?? '保存失败，请重试');
      setSaving(false);
    }
  }

  if (!rawGoal || error) return <main className="status-screen"><h1>暂时无法继续</h1><p>{error ?? '没有收到目标描述，请返回首页重新填写。'}</p><Link href="/">返回首页</Link></main>;
  if (!result) return <main className="status-screen"><p className="eyebrow">正在理解你的目标</p><h1>先把问题想清楚。</h1><p>我们正在区分事实、假设和缺失信息……</p></main>;
  return <UnderstandingPanel {...result} onConfirm={confirm} saving={saving} />;
}
