import type { WeeklyPlan } from '@/lib/schemas/task';

export function WeekPlanPanel({ plan, weeklyMinutes, onConfirm, confirming = false }: { plan: WeeklyPlan; weeklyMinutes: number; onConfirm: () => void; confirming?: boolean }) {
  const limit = Math.floor(weeklyMinutes * .7);
  return <main className="workspace-shell"><header className="workspace-header"><span className="wordmark"><span className="wordmark-seal">叙</span><span>叙己</span></span><span className="step-counter">03 / 03 · 首周行动</span></header><section className="route-intro"><p className="eyebrow">留出缓冲，才走得远</p><h1>首周，不求塞满。</h1><p>{plan.ai_note}</p><strong className="capacity-readout">{plan.total_minutes} / {limit} 分钟</strong></section><section className="week-list">{plan.tasks.map((task, index) => <article key={`${task.title}-${index}`}><span>周{task.day_of_week}</span><div><h2>{task.title}</h2><p>{task.completion_criteria}</p><small>最低行动：{task.minimum_action} · {task.estimated_minutes} 分钟</small></div></article>)}</section><button type="button" className="primary-action" disabled={confirming} onClick={onConfirm}>{confirming ? '正在确认…' : '确认这一周'} →</button></main>;
}
