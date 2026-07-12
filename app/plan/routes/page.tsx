import { Suspense } from 'react';
import { RoutesClient } from './routes-client';
export default function RoutesPage() { return <Suspense fallback={<main className="status-screen">正在载入路线……</main>}><RoutesClient /></Suspense>; }
