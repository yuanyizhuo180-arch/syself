'use client';

import { useState } from 'react';

export type GoalNodeEditorState = {
  mode: 'create' | 'edit'; nodeId?: string; nodeType: 'month' | 'week'; parentId: string | null;
  title: string; successCriteria: string; startDate?: string; endDate?: string;
};

export function GoalNodeEditor({ editor, onSave, onCancel }: { editor: GoalNodeEditorState; onSave: (values: GoalNodeEditorState) => void; onCancel: () => void }) {
  const [values, setValues] = useState(editor);
  const isCreate = values.mode === 'create';
  const heading = `${isCreate ? '新建' : '编辑'}${values.nodeType === 'month' ? '月' : '周'}目标`;
  return <form className="goal-node-editor" onSubmit={(event) => { event.preventDefault(); onSave(values); }}><div><p>{isCreate ? '手动创建' : '编辑文字'}</p><h2>{heading}</h2></div><label>目标名称<input required value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} /></label><label>完成标准<textarea required rows={3} value={values.successCriteria} onChange={(event) => setValues({ ...values, successCriteria: event.target.value })} /></label>{isCreate && <div className="goal-date-fields"><label>开始日期<input required type="date" value={values.startDate} onChange={(event) => setValues({ ...values, startDate: event.target.value })} /></label><label>结束日期<input required type="date" value={values.endDate} onChange={(event) => setValues({ ...values, endDate: event.target.value })} /></label></div>}<div className="goal-editor-actions"><button type="submit">保存目标</button><button type="button" onClick={onCancel}>取消</button></div></form>;
}
