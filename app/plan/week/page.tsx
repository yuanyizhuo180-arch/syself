import { Suspense } from 'react';
import { WeekClient } from './week-client';
export default function WeekPage() { return <Suspense fallback={<main className="status-screen">正在载入任务……</main>}><WeekClient /></Suspense>; }
