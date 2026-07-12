import { Suspense } from 'react';

import { UnderstandingClient } from './understanding-client';

export default function UnderstandingPage() {
  return <Suspense fallback={<main className="status-screen">正在载入规划上下文……</main>}><UnderstandingClient /></Suspense>;
}
