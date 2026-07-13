'use client';

import { useState } from 'react';
import type { AIInsight } from '@/lib/schemas/reflection';

const ratings = [
  { value: 1, emoji: '😣', label: '很艰难' },
  { value: 2, emoji: '😕', label: '有些吃力' },
  { value: 3, emoji: '😐', label: '还算平稳' },
  { value: 4, emoji: '🙂', label: '进展不错' },
  { value: 5, emoji: '😄', label: '状态很好' },
];

const reasons = [
  ['no_time', '时间不够'],
  ['too_hard', '任务太难'],
  ['forgot', '忘记了'],
  ['not_in_mood', '不在状态'],
  ['other', '其他原因'],
] as const;

const adjustments = ['保持原计划', '减少一项任务', '预留更多缓冲', '调整任务顺序'];

export function ReflectionPanel({
  loading,
  onSubmit,
  insight,
}: {
  loading: boolean;
  onSubmit: (values: { rating: number; reasons: string[]; note: string; adjustment: string }) => void | Promise<void>;
  insight: AIInsight | null;
}) {
  const [rating, setRating] = useState(3);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [adjustment, setAdjustment] = useState(adjustments[0]);

  function toggleReason(reason: string) {
    setSelectedReasons((current) => current.includes(reason) ? current.filter((item) => item !== reason) : [...current, reason]);
  }

  return <form className="reflection-form" onSubmit={(event) => { event.preventDefault(); void onSubmit({ rating, reasons: selectedReasons, note, adjustment }); }}>
    <section className="reflection-question">
      <span>01</span>
      <div>
        <h2>今天完成情况怎么样？</h2>
        <p>给今天一个不带评判的感受分数。</p>
        <div className="emoji-rating" role="radiogroup" aria-label="今日评分">
          {ratings.map((item) => <button key={item.value} type="button" role="radio" aria-checked={rating === item.value} className={rating === item.value ? 'selected' : ''} onClick={() => setRating(item.value)}><span>{item.emoji}</span><small>{item.label}</small></button>)}
        </div>
      </div>
    </section>

    <section className="reflection-question">
      <span>02</span>
      <div>
        <h2>没完成的任务是因为什么？</h2>
        <p>可多选；没有未完成任务也可以跳过。</p>
        <div className="reason-options">
          {reasons.map(([value, label]) => <label key={value}><input type="checkbox" checked={selectedReasons.includes(value)} onChange={() => toggleReason(value)} />{label}</label>)}
        </div>
        <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="补充一句今天发生了什么（可选）" rows={3} />
      </div>
    </section>

    <section className="reflection-question">
      <span>03</span>
      <div>
        <h2>明天需要调整什么？</h2>
        <p>选一个最小的调整，让计划更容易发生。</p>
        <div className="adjustment-options">
          {adjustments.map((item) => <button key={item} type="button" className={adjustment === item ? 'selected' : ''} onClick={() => setAdjustment(item)}>{item}</button>)}
        </div>
      </div>
    </section>
    <button className="primary-action reflection-submit" type="submit" disabled={loading}>{loading ? '正在生成洞察…' : '保存复盘 →'}</button>

    {insight && <section className={`insight-card tone-${insight.tone}`} aria-live="polite">
      <p className="section-kicker">AI 洞察</p>
      <h2>{insight.one_line_insight}</h2>
      {insight.positive_observation && <p className="insight-positive">{insight.positive_observation}</p>}
      <div><strong>明天微调</strong><p>{insight.improvement_hint}</p></div>
      <small>{insight.tomorrow_preview}</small>
    </section>}
  </form>;
}
