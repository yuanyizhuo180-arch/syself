import Link from 'next/link';
import type { ReactNode } from 'react';

import styles from './workspace-shell.module.css';

const navigation = [
  { key: 'dashboard', href: '/dashboard', label: '仪表盘' },
  { key: 'decisionPath', href: '/decision-path', label: '决策路径' },
  { key: 'goalTree', href: '/goal-tree', label: '目标工作树' },
  { key: 'today', href: '/today', label: '今日行动' },
  { key: 'reflection', href: '/reflection', label: '每日复盘' },
] as const;

export type WorkspaceView = typeof navigation[number]['key'];

export function WorkspaceShell({ active, goalName, children }: { active: WorkspaceView; goalName: string; children: ReactNode }) {
  return <div className={styles.shell}>
    <aside className={styles.sidebar} aria-label="工作区导航">
      <Link href="/" className={styles.brand}><span>叙</span>叙己</Link>
      <div className={styles.goal}><small>当前主目标</small><strong>{goalName || '尚未建立主目标'}</strong></div>
      <nav>{navigation.map((item) => <Link key={item.key} href={item.href} className={item.key === active ? styles.active : ''} aria-current={item.key === active ? 'page' : undefined}>{item.label}</Link>)}</nav>
      <p className={styles.footer}>一次只推进一个真正重要的目标</p>
    </aside>
    <main className={styles.main}>{children}</main>
    <nav className={styles.mobileNav} aria-label="工作区导航">{navigation.map((item) => <Link key={item.key} href={item.href} className={item.key === active ? styles.active : ''} aria-current={item.key === active ? 'page' : undefined}>{item.label}</Link>)}</nav>
  </div>;
}
