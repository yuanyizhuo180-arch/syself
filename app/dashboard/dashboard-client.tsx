'use client';

import { useEffect, useState } from 'react';
import { DashboardPanel, type DashboardData } from '@/app/workspace/dashboard-panel';
import { WorkspaceShell } from '@/app/workspace/workspace-shell';

const empty: DashboardData = { goalName: '', keyAction: null, supportingActions: [], capacity: null };

export function DashboardClient() {
  const [data, setData] = useState<DashboardData>(empty);
  const [error, setError] = useState('');
  useEffect(() => { void fetch('/api/workspace').then((response) => response.json()).then(setData).catch(() => setError('无法读取工作台，请稍后重试。')); }, []);
  return <WorkspaceShell active="dashboard" goalName={data.goalName}>{error ? <p role="alert">{error}</p> : <DashboardPanel data={data} />}</WorkspaceShell>;
}
