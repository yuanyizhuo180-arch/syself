import type { FormEventHandler } from 'react';
import Link from 'next/link';

import type { GoalUnderstanding } from '@/lib/schemas/goal-understanding';

export function UnderstandingPanel({
  goalId,
  understanding,
  onConfirm,
  saving = false,
}: {
  goalId: string;
  understanding: GoalUnderstanding;
  onConfirm?: FormEventHandler<HTMLFormElement>;
  saving?: boolean;
}) {
  const facts = understanding.assumptions.filter((item) => item.basis === 'user_stated');
  const assumptions = understanding.assumptions.filter((item) => item.basis !== 'user_stated');
  const criticalQuestions = understanding.missing_information.filter(
    (item) => item.priority === 'critical',
  );

  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <Link href="/" className="wordmark"><span className="wordmark-seal">叙</span><span>叙己</span></Link>
        <span className="step-counter">01 / 03 · 理解目标</span>
      </header>

      <section className="understanding-intro">
        <p className="eyebrow">先校准理解，再开始规划</p>
        <h1>AI 对你的理解</h1>
        <p>下面不是结论。请修改不准确的地方，并回答影响路线设计的关键问题。</p>
      </section>

      <form className="understanding-grid" onSubmit={onConfirm}>
        <input type="hidden" name="goalId" value={goalId} />
        <section className="understanding-main">
          <label className="editable-field">
            <span>你真正想达到的结果</span>
            <textarea name="desiredOutcome" defaultValue={understanding.desired_outcome} rows={3} />
          </label>
          <div className="field-pair">
            <label className="editable-field">
              <span>当前状态</span>
              <textarea name="currentState" defaultValue={understanding.current_state} rows={3} />
            </label>
            <label className="editable-field">
              <span>时间跨度</span>
              <input name="timeHorizon" defaultValue={understanding.time_horizon} />
            </label>
          </div>

          {criticalQuestions.length > 0 && (
            <section className="question-block">
              <p className="section-kicker">关键追问</p>
              {criticalQuestions.map((item) => (
                <label key={item.field}>
                  <strong>{item.question}</strong>
                  <small>{item.why_important}</small>
                  <textarea name={`followUp.${item.field}`} required rows={2} />
                </label>
              ))}
            </section>
          )}

          <button className="primary-action" disabled={saving} type="submit">
            {saving ? '正在保存…' : '确认并比较路线'} <span aria-hidden="true">→</span>
          </button>
        </section>

        <aside className="evidence-rail">
          <section>
            <p className="section-kicker">你明确提供的信息</p>
            {facts.length ? facts.map((item) => <p key={item.statement}>{item.statement}</p>) : <p>暂无额外事实</p>}
          </section>
          <section className="assumption-card">
            <p className="section-kicker">需要你确认的假设</p>
            {assumptions.length ? assumptions.map((item) => <p key={item.statement}>{item.statement}</p>) : <p>AI 没有添加额外假设</p>}
          </section>
          <section className="confidence-card">
            <span>理解置信度</span>
            <strong>{Math.round(understanding.confidence * 100)}%</strong>
          </section>
        </aside>
      </form>
    </main>
  );
}
