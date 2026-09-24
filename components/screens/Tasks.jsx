'use client';

import { useRef, useState } from 'react';
import { Check, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react';
import { addTask, removeTask, toggleTask, updateTask } from '@/lib/store';
import { effectiveBucket, relativeDueLabel } from '@/lib/dates';
import { initialStepText, TASK_TYPES } from '@/lib/steps';
import { availableModules, moduleColor } from '@/lib/modules';
import { CALM_SESSION_DEFAULTS, GENERIC_ERROR } from '@/components/constants';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { AccessibleSheet } from '@/components/ui/AccessibleSheet';
import { PageTitle } from '@/components/ui/PageTitle';
import { Empty } from '@/components/ui/Empty';

const priorities = [['low', 'Low'], ['normal', 'Normal'], ['high', 'High']];

function TaskForm({ initial, tasks, onCancel, onSave, saving }) {
  const [module, setModule] = useState(initial?.module || 'Dissertation');
  const [addingModule, setAddingModule] = useState(false);
  const [customModule, setCustomModule] = useState('');
  const chips = availableModules(tasks);

  return <form className="panel" onSubmit={e => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    onSave({ title: f.get('title'), module, due: f.get('due'), priority: f.get('priority'), taskType: f.get('taskType') });
  }}>
    <label>Task name<input name="title" defaultValue={initial?.title} required autoFocus /></label>
    <div>
      <div className="hint">Module</div>
      <div className="module-chips">
        {chips.filter(c => c !== 'Other').map(m => (
          <button key={m} type="button" data-color={moduleColor(m)} className={`module-chip ${module === m ? 'selected' : ''}`} onClick={() => { setModule(m); setAddingModule(false); }}>{m}</button>
        ))}
        <button type="button" className={`module-chip ${addingModule ? 'selected' : ''}`} onClick={() => setAddingModule(true)}>+ New module</button>
      </div>
      {addingModule && <input type="text" placeholder="Type a module name" value={customModule} onChange={e => { setCustomModule(e.target.value); setModule(e.target.value || 'Other'); }} style={{ marginTop: 8 }} />}
    </div>
    <label>Due date<input name="due" type="date" defaultValue={initial?.due} /></label>
    <label>Priority<select name="priority" defaultValue={initial?.priority || 'normal'}>{priorities.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
    <label>Task type<select name="taskType" defaultValue={initial?.taskType || 'general'}>{TASK_TYPES.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}</select></label>
    {!initial && <p className="hint">Nuvora will suggest a small first step based on the task type.</p>}
    <div className="row">
      <button type="button" onClick={onCancel} disabled={saving}>Cancel</button>
      <button className="primary" disabled={saving || !module.trim()}>{saving ? 'Saving…' : (initial ? 'Save changes' : 'Add task')}</button>
    </div>
  </form>;
}

// The student's plan. Tasks are grouped into Today / Week / Later, but the
// group is worked out from the due date each time (lib/dates.js
// effectiveBucket), so a task moves forward on its own as the date gets
// closer — the tab it was created on only matters when it has no due date.
// Each new task starts with a fixed first micro-step for its task type
// (lib/steps.js). Completing a task shows an Undo option, and deleting asks
// for confirmation, so a mis-tap is easy to recover from. In Calm Mode only
// the Today tab is shown until the student asks for the others.
export function Tasks({ data, uid, setData, calmMode, calmSession = CALM_SESSION_DEFAULTS }) {
  const [tab, setTab] = useState('today');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyIds, setBusyIds] = useState(() => new Set());
  const [error, setError] = useState('');
  const [undo, setUndo] = useState(null); // { id, title }
  const [showAllTabs, setShowAllTabs] = useState(false);
  const addTaskTriggerRef = useRef(null);
  const editTaskTriggerRef = useRef(null);
  const filtered = data.tasks.filter(t => effectiveBucket(t) === tab);

  async function create(fields) {
    if (saving) return;
    const task = {
      title: fields.title,
      module: fields.module,
      due: fields.due,
      priority: fields.priority,
      taskType: fields.taskType || 'general',
      bucket: tab,
      done: false,
      currentStep: { id: crypto.randomUUID(), text: initialStepText(fields.taskType), done: false, completedAt: null },
    };
    setSaving(true);
    setError('');
    try {
      const saved = await addTask(uid, task);
      setData(d => ({ ...d, tasks: [saved, ...d.tasks] }));
      setAdding(false);
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(id, fields) {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      // updateTask resolves to nothing in Firestore mode, so the edit is
      // applied to the local copy rather than replaced by a return value.
      await updateTask(uid, id, fields);
      setData(d => ({ ...d, tasks: d.tasks.map(t => (t.id === id ? { ...t, ...fields } : t)) }));
      setEditingId(null);
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setSaving(false);
    }
  }

  async function runOnTask(id, action) {
    if (busyIds.has(id)) return;
    setBusyIds(s => new Set(s).add(id));
    setError('');
    try {
      await action();
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setBusyIds(s => { const n = new Set(s); n.delete(id); return n; });
    }
  }

  async function toggle(t) {
    await runOnTask(t.id, async () => {
      await toggleTask(uid, t.id, !t.done);
      setData(d => ({ ...d, tasks: d.tasks.map(x => (x.id === t.id ? { ...x, done: !x.done } : x)) }));
      setUndo(!t.done ? { id: t.id, title: t.title } : null);
    });
  }

  async function undoComplete() {
    if (!undo) return;
    const { id } = undo;
    setUndo(null);
    await runOnTask(id, async () => {
      await toggleTask(uid, id, false);
      setData(d => ({ ...d, tasks: d.tasks.map(x => (x.id === id ? { ...x, done: false } : x)) }));
    });
  }

  async function remove(t) {
    if (!window.confirm(`Delete "${t.title}"? This cannot be undone.`)) return;
    await runOnTask(t.id, async () => {
      await removeTask(uid, t.id);
      setData(d => ({ ...d, tasks: d.tasks.filter(x => x.id !== t.id) }));
    });
  }

  const editingTask = editingId ? data.tasks.find(t => t.id === editingId) : null;

  return <>
    <PageTitle
      title="My plan"
      tone="blue"
      icon={<ListChecks />}
      action={<button className="icon filled page-title-action" ref={addTaskTriggerRef} onClick={() => setAdding(true)} aria-label="Add task"><Plus /></button>}
    />
    {calmMode && !showAllTabs
      ? <button className="link" onClick={() => setShowAllTabs(true)}>Show week &amp; later</button>
      : <div className="tabs">{['today', 'week', 'later'].map(t => <button className={tab === t ? 'active' : ''} onClick={() => setTab(t)} key={t}>{t}</button>)}</div>}
    <StatusMessage text={error} tone="error" />
    {undo && <div className="status-msg status" role="status">
      “{undo.title}” marked complete. <button className="link" onClick={undoComplete}>Undo</button>
    </div>}
    {filtered.map(t => (
      <article className={`task row-task ${t.done ? 'done' : ''}`} data-color={moduleColor(t.module)} key={t.id}>
        <button className="check" aria-label={t.done ? `Mark ${t.title} as not done` : `Mark ${t.title} as done`} aria-pressed={t.done} disabled={busyIds.has(t.id)} onClick={() => toggle(t)}>
          <span className="check-dot">{t.done && <Check />}</span>
        </button>
        <div>
          <small>
            {t.module}
            {!(calmMode && calmSession.hideDeadlines) && <>{' · '}{relativeDueLabel(t.due)}{t.priority === 'high' && ' · High priority'}</>}
          </small>
          <h2>{t.title}</h2>
          {!(calmMode && calmSession.reduceVisualDetail) && <p>{t.currentStep?.text}</p>}
        </div>
        {!(calmMode && calmSession.reduceVisualDetail) && <>
          <button className="icon" aria-label={`Edit ${t.title}`} disabled={busyIds.has(t.id)} onClick={e => { editTaskTriggerRef.current = e.currentTarget; setEditingId(t.id); }}><Pencil /></button>
          <button className="icon trash" aria-label={`Delete ${t.title}`} disabled={busyIds.has(t.id)} onClick={() => remove(t)}><Trash2 /></button>
        </>}
      </article>
    ))}
    {!filtered.length && !adding && !editingId && <Empty title="Nothing here yet" text="Add one task when you are ready." />}
    {/* Add/edit opens as a focused overlay panel rather than sitting
        permanently inline in the list — the list itself never re-renders
        into a form. */}
    {adding && <AccessibleSheet label="Add task" onClose={() => setAdding(false)} triggerRef={addTaskTriggerRef}>
      <div className="sheet-header"><span className="sheet-title">Add task</span></div>
      <TaskForm tasks={data.tasks} saving={saving} onCancel={() => setAdding(false)} onSave={create} />
    </AccessibleSheet>}
    {editingTask && <AccessibleSheet label={`Edit ${editingTask.title}`} onClose={() => setEditingId(null)} triggerRef={editTaskTriggerRef}>
      <div className="sheet-header"><span className="sheet-title">Edit task</span></div>
      <TaskForm initial={editingTask} tasks={data.tasks} saving={saving} onCancel={() => setEditingId(null)} onSave={fields => saveEdit(editingTask.id, fields)} />
    </AccessibleSheet>}
  </>;
}
