'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ReflectionPanel } from './reflection-panel';
import type { AIInsight } from '@/lib/schemas/reflection';

export function ReflectionClient() {
  const [goalId, setGoalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const date = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    void fetch('/api/goal').then((response) => response.json()).then((data) => setGoalId(data.goal?.id ?? null)).catch(() => setError('无法读取当前目标，请稍后重试。'));
  }, []);

  async function submit(values: { rating: number; reasons: string[]; note: string; adjustment: string }) {
    setLoading(true); setError('');
    try {
      const note = [values.note, values.adjustment !== '保持原计划' ? `明天调整：${values.adjustment}` : ''].filter(Boolean).join('\n');
      const response = await fetch('/api/ai/reflect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goalId, date, userRating: values.rating, userNote: note, incompleteReasons: values.reasons }) });
      const data = await response.json() as { insight?: AIInsight; userMessage?: string };
      if (!response.ok || !data.insight) throw new Error(data.userMessage ?? '洞察生成失败，请稍后重试。');
      setInsight(data.insight);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '保存复盘失败，请稍后重试。');
    } finally { setLoading(false); }
  }

  return <main className="workspace-shell reflection-shell">
    <header className="workspace-header"><Link className="wordmark" href="/"><span className="wordmark-seal">S</span>syself</Link><span className="step-counter">日终复盘</span></header>
    <div className="reflection-intro"><p className="eyebrow">DAILY CHECK-IN · {date}</p><h1>给今天一个<br /><em>清晰的收尾。</em></h1><p>不用解释自己，只记录发生了什么。我们从中为明天留出一个更轻的选择。</p></div>
    {!goalId && !error && <p className="empty-state">正在读取当前目标…</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <ReflectionPanel loading={loading} onSubmit={submit} insight={insight} />
  </main>;
}
