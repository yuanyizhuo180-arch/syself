export type TodayTask = { id: string; title: string; estimated_minutes: number; completion_criteria: string; minimum_action: string; status: string };
export function TodayTaskList({ tasks, onComplete, onSkip }: { tasks: TodayTask[]; onComplete: (id: string) => void; onSkip: (task: TodayTask) => void }) {
  return <section className="today-list">{tasks.map(task => <article key={task.id}><div><h2>{task.title}</h2><p><strong>完成标准：</strong>{task.completion_criteria}</p><small>最低行动：{task.minimum_action} · {task.estimated_minutes} 分钟</small></div><div className="task-actions"><button onClick={() => onComplete(task.id)}>完成</button><button onClick={() => onSkip(task)}>跳过</button></div></article>)}</section>;
}
