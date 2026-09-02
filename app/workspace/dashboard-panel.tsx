import styles from './dashboard-panel.module.css';

export type DashboardData = {
  goalName: string;
  keyAction: { title: string; completionCriteria: string; minimumAction: string; estimatedMinutes: number; monthTitle: string | null; weekTitle: string | null } | null;
  supportingActions: { title: string; estimatedMinutes: number }[];
  capacity: { committed: number; limit: number } | null;
};

export function DashboardPanel({ data }: { data: DashboardData }) {
  if (!data.keyAction) return <section className={styles.empty}><p>今天还没有承诺行动。</p><a href="/goal-tree">创建本周目标</a></section>;
  const { keyAction } = data;
  return <>
    <p className={styles.kicker}>仪表盘 / 当前主目标</p><h1>先完成一件真正推进方向的事。</h1>
    <section className={styles.key}><p className={styles.label}>今天的关键行动</p><h2>{keyAction.title}</h2><p>完成标准：{keyAction.completionCriteria}</p><p>最低行动：{keyAction.minimumAction} · {keyAction.estimatedMinutes} 分钟</p><p className={styles.linkage}>{[keyAction.monthTitle, keyAction.weekTitle].filter(Boolean).join(' / ')}</p><a className={styles.action} href="/today">开始行动</a></section>
    <div className={styles.details}><section><h3>本周容量</h3><strong>{data.capacity ? `${data.capacity.committed} / ${data.capacity.limit} 分钟` : '等待建立周目标'}</strong><p>预留缓冲，计划才经得起现实变化。</p></section><section><h3>支撑行动</h3>{data.supportingActions.length ? data.supportingActions.slice(0, 3).map((task) => <p key={task.title}>{task.title} <small>{task.estimatedMinutes} 分钟</small></p>) : <p>今天只需要专注关键行动。</p>}</section></div>
  </>;
}
