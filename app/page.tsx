const planningSteps = [
  { index: '01', title: '理解目标', detail: '分清事实、假设与真正缺失的信息' },
  { index: '02', title: '比较路线', detail: '在两条实质不同的路径之间主动选择' },
  { index: '03', title: '开始本周', detail: '得到不过载、可验收的第一周行动' },
];

export default function Home() {
  return (
    <main className="home-shell">
      <header className="topbar">
        <a className="wordmark" href="#top" aria-label="叙己首页">
          <span className="wordmark-seal">叙</span>
          <span>叙己</span>
        </a>
        <p>AI 个人战略与执行规划</p>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">一次只推进一个真正重要的目标</p>
          <h1>
            把模糊目标，
            <em>变成今天能开始的行动</em>
          </h1>
          <p className="lede">
            不是再生成一份漂亮却落灰的计划。叙己会先确认自己是否真正理解你，
            再与你比较路线、控制负荷，并把选择落实到第一周。
          </p>
        </div>

        <aside className="principle-card" aria-label="规划原则">
          <span className="card-number">70%</span>
          <p>计划最多占用可支配时间的七成，其余留给生活和意外。</p>
        </aside>
      </section>

      <section className="goal-panel" aria-labelledby="goal-prompt">
        <div className="goal-panel-heading">
          <span>从这里开始</span>
          <h2 id="goal-prompt">告诉我，你现在最想推进的一件事</h2>
        </div>

        <form className="goal-form" action="/plan/understanding" method="get">
          <label className="sr-only" htmlFor="goal">
            目标描述
          </label>
          <textarea
            id="goal"
            name="goal"
            rows={5}
            required
            placeholder="例如：我想在 6 个月内具备独立分析公司财报的能力，但不知道应该从哪里开始……"
          />
          <div className="form-footer">
            <p>可以很具体，也可以只是一个还说不清的念头。</p>
            <button type="submit">
              帮我规划
              <span aria-hidden="true">↗</span>
            </button>
          </div>
        </form>
      </section>

      <section className="process" aria-label="规划流程">
        {planningSteps.map((step) => (
          <article key={step.index}>
            <span>{step.index}</span>
            <div>
              <h2>{step.title}</h2>
              <p>{step.detail}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
