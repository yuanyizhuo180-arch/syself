'use client';

import { useState } from 'react';
import type { SkipReason } from '@/lib/types';

export type RecoveryAction = 'shrink' | 'reschedule' | 'pause_week';

const reasons: Array<{ value: SkipReason; label: string }> = [
  { value: 'no_time', label: '时间不足' }, { value: 'too_hard', label: '任务太难' }, { value: 'forgot', label: '忘记了' }, { value: 'not_in_mood', label: '精力不足' }, { value: 'other', label: '其他原因' },
];
const actions: Array<{ value: RecoveryAction; label: string; description: string }> = [
  { value: 'shrink', label: '缩小为最低行动', description: '保留方向，只做最小的一步。' },
  { value: 'reschedule', label: '移至明天', description: '给今天留白，明天继续推进。' },
  { value: 'pause_week', label: '暂停本周目标', description: '暂时停下，不把它算作失败。' },
];

export function TaskRecoveryPanel({ taskTitle, onRecover, onCancel }: { taskTitle: string; onRecover: (input: { action: RecoveryAction; reason: SkipReason }) => void; onCancel: () => void }) {
  const [reason, setReason] = useState<SkipReason>('no_time');
  return <aside className="task-recovery" aria-label="任务恢复"><p>“{taskTitle}”暂时没完成也没关系。</p><h2>先选择恢复方式</h2><div className="recovery-reasons">{reasons.map((item) => <button key={item.value} className={reason === item.value ? 'selected' : ''} type="button" onClick={() => setReason(item.value)}>{item.label}</button>)}</div><div className="recovery-actions">{actions.map((item) => <button key={item.value} type="button" onClick={() => onRecover({ action: item.value, reason })}><strong>{item.label}</strong><small>{item.description}</small></button>)}</div><button className="recovery-cancel" type="button" onClick={onCancel}>暂不调整</button></aside>;
}
