import type { RouteComparison } from '@/lib/schemas/plan-route';
import Link from 'next/link';

export function RouteComparisonPanel({ comparison, selectedId, onSelect, goalId = '' }: { comparison: RouteComparison; selectedId: string | null; onSelect?: (id: string) => void; goalId?: string }) {
  return <main className="workspace-shell">
    <header className="workspace-header"><Link href="/" className="wordmark"><span className="wordmark-seal">叙</span><span>叙己</span></Link><span className="step-counter">02 / 03 · 比较路线</span></header>
    <section className="route-intro"><p className="eyebrow">没有默认答案</p><h1>两种走法，你来决定。</h1><p>{comparison.comparison_summary}</p></section>
    <section className="route-grid">{comparison.routes.map((route) => {
      const selected = selectedId === route.id;
      return <article className={`route-card${selected ? ' selected' : ''}`} key={route.id}>
        <div className="route-card-head"><span>{route.route_type === 'depth_first' ? '深度优先' : '广度优先'}</span><h2>{route.title}</h2><p>{route.thesis}</p></div>
        <details open><summary>阶段路径</summary>{route.phases.map((phase) => <div className="phase-row" key={phase.name}><strong>{phase.name}</strong><span>{phase.duration} · 每周 {phase.weekly_hours}h</span><p>{phase.focus}</p></div>)}</details>
        <div className="route-section"><h3>为什么适合你</h3>{route.advantages.map((item) => <p key={item.point}><strong>{item.point}</strong> — {item.why_relevant_to_user}</p>)}</div>
        <div className="route-section risk"><h3>风险与失败预警</h3>{route.risks.map((item) => <p key={item.risk}><strong>{item.risk}</strong><br /><span>失败预警：{item.early_warning_sign}</span></p>)}</div>
        <button type="button" className="route-choice" onClick={() => route.id && onSelect?.(route.id)}>{selected ? '已选中' : '选择这条路线'}</button>
      </article>;
    })}</section>
    {selectedId && <Link className="primary-action route-next" href={`/plan/week?goalId=${encodeURIComponent(goalId)}`}>继续生成首周任务 →</Link>}
  </main>;
}
