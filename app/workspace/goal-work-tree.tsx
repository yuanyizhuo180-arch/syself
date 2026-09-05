'use client';

import { type FormEvent, type KeyboardEvent, useState } from 'react';

import styles from './goal-work-tree.module.css';

export type TreeNode = { id: string; parent_id: string | null; node_type: 'month' | 'week'; title: string; success_criteria: string; start_date: string; end_date: string; status: string; source: string };
export type TreeTask = { id: string; work_node_id: string | null; title: string; completion_criteria: string | null; minimum_action: string | null; estimated_minutes: number | null; day_date: string | null; status: string };
export type NewGoalWorkNode = { nodeType: 'month' | 'week'; parentId: string | null };
export type TaskEditValues = { id: string; title: string; completionCriteria: string; minimumAction: string; estimatedMinutes: number };

const isFuture = (node: TreeNode, today: string) => node.start_date > today;
const byStartDate = (a: TreeNode, b: TreeNode) => a.start_date.localeCompare(b.start_date);
const coversToday = (node: TreeNode, today: string) => node.start_date <= today && node.end_date >= today;
const selectCurrentNode = (nodes: TreeNode[], today: string) => {
  const sorted = [...nodes].sort(byStartDate);
  return sorted.find((node) => coversToday(node, today))
    ?? [...sorted].reverse().find((node) => node.start_date <= today)
    ?? sorted[0];
};
const selectFutureNode = (nodes: TreeNode[], currentId: string | undefined, today: string) => [...nodes]
  .filter((node) => node.id !== currentId && isFuture(node, today))
  .sort(byStartDate)[0];
const plannedToday = (tasks: TreeTask[], weekId: string, today: string) => tasks.filter((task) => task.work_node_id === weekId && task.day_date === today && task.status === 'planned');
const pausedToday = (tasks: TreeTask[], weekId: string, today: string) => tasks.filter((task) => task.work_node_id === weekId && task.day_date === today && task.status === 'paused');

function CardActionRow({ children }: { children: React.ReactNode }) { return <div className={styles.actionRow} onClick={(event) => event.stopPropagation()}>{children}</div>; }

function PathCard({ children, className, expanded, onToggle }: { children: React.ReactNode; className: string; expanded: boolean; onToggle: () => void }) {
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onToggle(); } };
  return <article className={`${styles.pathCard} ${className} ${expanded ? styles.expanded : ''}`} role="button" tabIndex={0} onClick={onToggle} onKeyDown={onKeyDown}>{children}</article>;
}

function TaskCardEditor({ task, onSave, onCancel }: { task: TreeTask; onSave: (values: TaskEditValues) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(task.title);
  const [completionCriteria, setCompletionCriteria] = useState(task.completion_criteria ?? '');
  const [minimumAction, setMinimumAction] = useState(task.minimum_action ?? '');
  const [estimatedMinutes, setEstimatedMinutes] = useState(String(task.estimated_minutes ?? 30));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const minutes = Number(estimatedMinutes);
    if (!title.trim() || !completionCriteria.trim() || !minimumAction.trim() || !Number.isInteger(minutes) || minutes < 5 || minutes > 240) return;
    onSave({ id: task.id, title: title.trim(), completionCriteria: completionCriteria.trim(), minimumAction: minimumAction.trim(), estimatedMinutes: minutes });
  };
  return <form className={styles.taskEditor} onClick={(event) => event.stopPropagation()} onSubmit={submit}>
    <label>任务名称<input value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
    <label>完成标准<input value={completionCriteria} onChange={(event) => setCompletionCriteria(event.target.value)} required /></label>
    <label>最低行动<input value={minimumAction} onChange={(event) => setMinimumAction(event.target.value)} required /></label>
    <label>预计分钟<input type="number" min="5" max="240" value={estimatedMinutes} onChange={(event) => setEstimatedMinutes(event.target.value)} required /></label>
    <CardActionRow><button className={styles.subtleAction} type="submit">保存</button><button className={styles.subtleAction} type="button" onClick={onCancel}>取消</button></CardActionRow>
  </form>;
}

export function GoalWorkTree({ goalName, nodes, tasks = [], today = new Date().toISOString().slice(0, 10), onAction, onEdit, onCreate, onSuggest, onCompleteTask, onEditTask, onPauseTask }: { goalName?: string; nodes: TreeNode[]; tasks?: TreeTask[]; today?: string; onAction?: (id: string, action: 'accept' | 'complete' | 'pause') => void; onEdit?: (node: TreeNode) => void; onCreate?: (input: NewGoalWorkNode) => void; onSuggest?: () => void; onCompleteTask?: (id: string) => void; onEditTask?: (values: TaskEditValues) => void; onPauseTask?: (id: string) => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const months = nodes.filter((node) => node.node_type === 'month');
  const currentMonth = selectCurrentNode(months, today);
  const futureMonth = selectFutureNode(months, currentMonth?.id, today);
  const weeks = currentMonth ? nodes.filter((node) => node.node_type === 'week' && node.parent_id === currentMonth.id) : [];
  const currentWeek = selectCurrentNode(weeks, today);
  const futureWeek = selectFutureNode(weeks, currentWeek?.id, today);
  const toggle = (key: string) => setExpanded((current) => current === key ? null : key);
  const todayTasks = currentWeek ? plannedToday(tasks, currentWeek.id, today) : [];
  const pausedTasks = currentWeek ? pausedToday(tasks, currentWeek.id, today) : [];
  const nodeActions = (node: TreeNode, allowWeekCreation = false) => <CardActionRow><button className={styles.subtleAction} type="button" onClick={() => onEdit?.(node)}>编辑</button><button className={styles.subtleAction} type="button" onClick={() => onAction?.(node.id, 'complete')}>完成</button><button className={styles.subtleAction} type="button" onClick={() => onAction?.(node.id, 'pause')}>暂停</button>{allowWeekCreation && <button className={styles.subtleAction} type="button" onClick={() => onCreate?.({ nodeType: 'week', parentId: node.id })}>新建周目标</button>}</CardActionRow>;
  const futureCard = (node: TreeNode, label: string, className: string) => <details className={`${styles.futureCard} ${className}`}><summary><span>{label} · 未展开</span><span>点击展开</span></summary><h3>{node.title}</h3><p>{node.success_criteria}</p><CardActionRow><button className={styles.subtleAction} type="button" onClick={() => onEdit?.(node)}>编辑</button><button className={styles.subtleAction} type="button" onClick={() => onAction?.(node.id, 'complete')}>完成</button><button className={styles.subtleAction} type="button" onClick={() => onAction?.(node.id, 'pause')}>暂停</button></CardActionRow></details>;

  if (!currentMonth || !currentWeek) return <section className={styles.tree}><div className={styles.treeTools}><button type="button" onClick={onSuggest}>生成 AI 建议</button><button type="button" onClick={() => onCreate?.({ nodeType: 'month', parentId: null })}>新建月目标</button></div><div className={styles.empty}><p>还没有完整的月、周目标。</p><p>请先根据已选路线生成建议，或手动创建第一个月目标。</p></div></section>;

  return <section className={styles.tree}>
    <div className={styles.treeTools}><button type="button" onClick={onSuggest}>生成 AI 建议</button><button type="button" onClick={() => onCreate?.({ nodeType: 'month', parentId: null })}>新建月目标</button></div>
    <div className={styles.canvas}><div className={styles.path}>
      <article className={styles.goalNode}><small>唯一主目标</small><h1>{goalName || '当前主目标'}</h1></article>
      <section className={styles.branch}>
        <span className={`${styles.stem} ${styles.stemOne}`} aria-hidden="true" /><span className={`${styles.stem} ${styles.stemTwo}`} aria-hidden="true" /><span className={`${styles.stem} ${styles.stemThree}`} aria-hidden="true" />
        <div className={styles.monthWrap}><span className={styles.join} aria-hidden="true" /><PathCard className={styles.monthCard} expanded={expanded === `month-${currentMonth.id}`} onToggle={() => toggle(`month-${currentMonth.id}`)}><div className={styles.cardMain}><small>当前月 · 第一个月</small><h2>{currentMonth.title}</h2></div><div className={styles.expand}><div className={styles.expandInner}>{nodeActions(currentMonth, true)}</div></div></PathCard></div>
        {futureMonth && futureCard(futureMonth, '下一章节', styles.futureMonth)}
        <div className={styles.weekWrap}><span className={styles.join} aria-hidden="true" /><PathCard className={styles.weekCard} expanded={expanded === `week-${currentWeek.id}`} onToggle={() => toggle(`week-${currentWeek.id}`)}><div className={styles.cardMain}><small>当前周 · 第 1 周</small><h2>{currentWeek.title}</h2></div><div className={styles.expand}><div className={styles.expandInner}>{nodeActions(currentWeek)}</div></div></PathCard></div>
        {futureWeek && futureCard(futureWeek, '后续任务', styles.futureWeek)}
      </section>
      <section className={styles.actionArea} aria-label="今日行动"><aside className={styles.caption}><h2>当前追踪路径</h2><p>三个日任务都归属于当前周目标。展开时仍可向上回溯。</p></aside><section className={styles.taskGroup}><p className={styles.taskGroupTitle}>今日行动 · AI 已安排 {todayTasks.length} 项</p>{todayTasks.length ? <ol className={styles.taskList}>{todayTasks.slice(0, 3).map((task, index) => { const key = `task-${task.id}`; const isEditing = editingTask === task.id; return <li key={task.id}><PathCard className={`${styles.taskCard} ${index === 0 ? styles.primaryTask : ''}`} expanded={expanded === key} onToggle={() => { setEditingTask(null); toggle(key); }}><div className={styles.taskMain}><small>{index === 0 ? '关键行动' : '支撑行动'} · {task.estimated_minutes ?? 0} 分钟</small><h3>{task.title}</h3><p>{task.completion_criteria ?? task.minimum_action ?? '待补充'}</p></div><div className={styles.expand}><div className={styles.expandInner}>{isEditing ? <TaskCardEditor task={task} onSave={(values) => { onEditTask?.(values); setEditingTask(null); }} onCancel={() => setEditingTask(null)} /> : <CardActionRow><button className={styles.subtleAction} type="button" onClick={() => setEditingTask(task.id)}>编辑</button><button className={styles.subtleAction} type="button" onClick={() => onCompleteTask?.(task.id)}>完成</button><button className={styles.subtleAction} type="button" onClick={() => onPauseTask?.(task.id)}>暂停</button></CardActionRow>}</div></div></PathCard></li>; })}</ol> : <p className={styles.noTasks}>今天还没有归属到这一周的行动。</p>}{pausedTasks.length > 0 && <p className={styles.pausedTasks}>已暂停 · {pausedTasks.length} 项</p>}</section></section>
    </div></div>
  </section>;
}
