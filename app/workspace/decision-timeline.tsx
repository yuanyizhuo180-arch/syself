import styles from './decision-timeline.module.css';

type DecisionEvent = { id: string; event_type: string; created_at: string; rationale: string | null; impact_json: string };
const labels: Record<string, string> = { goal_confirmed: '主目标已确认', route_selected: '路线已选择', node_suggested: 'AI 提出了目标建议', node_accepted: '目标建议已采纳', node_created: '手动创建目标', node_edited: '目标已编辑', node_completed: '目标已完成', node_paused: '目标已暂停', task_recovered: '任务已恢复', replan_started: '新的规划分支已开始' };

export function DecisionTimeline({ events }: { events: DecisionEvent[] }) {
  return <section className={styles.timeline}><p className={styles.kicker}>决策路径</p><h1>每一步都有来处</h1><p className={styles.intro}>历史不会被覆盖。需要改变方向时，从对应节点发起新的规划分支。</p>{events.length ? <ol>{events.map((event) => <li key={event.id}><time>{event.created_at.slice(0, 10)}</time><div><h2>{labels[event.event_type] ?? event.event_type}</h2><p>{event.rationale || '该决定没有额外备注。'}</p><button type="button">从这里重新规划</button></div></li>)}</ol> : <div className={styles.empty}>确认目标、选择路线和采纳建议后，决策依据会在这里保留。</div>}</section>;
}
