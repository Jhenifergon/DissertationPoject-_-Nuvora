import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, increment, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db, firebaseEnabled } from './firebase';

const key = 'nuvora-demo-data-v1';

export const defaultSettings = { calmMode: false, reducedMotion: false, textScale: 1, displayName: '', hideProgress: false, supportPersonName: '', supportPersonNote: '' };

// Deliberately not "tasks completed" or "average pressure" — those are
// supplemented (Phase 3c) with gentler, non-comparative counts that don't
// read as a productivity score: small steps taken, and which support
// strategies have actually been used. No streaks, no targets, no "missed
// day" tracking of any kind.
export const defaultStats = { stepsCompleted: 0, strategyUses: { start: 0, big: 0, energy: 0, reset: 0, support: 0 } };

const seed = {
  tasks: [
    { id: '1', title: 'Draft literature notes', module: 'Dissertation', due: '2026-08-12', step: 'Open the document and write three headings.', done: false, bucket: 'today' },
    { id: '2', title: 'Email supervisor', module: 'Dissertation', due: '2026-08-13', step: 'Open the email and write only the subject line.', done: false, bucket: 'week' },
    { id: '3', title: 'Review database diagram', module: 'Database Systems', due: '2026-08-18', step: 'Check the first two relationships.', done: true, bucket: 'later' },
  ],
  checkins: [],
  reflections: [],
  settings: { ...defaultSettings },
  stats: { ...defaultStats },
};

// A task previously stored a single flat `step` string. The current model
// separates the full academic task from its current micro-step so that
// completing the step never implies completing the whole assignment.
// This migration upgrades old-shaped tasks the first time they are read,
// without discarding anything the user already has. It also fills in a
// default `priority` for tasks created before that field existed.
export function migrateTask(t) {
  const withDefaults = { priority: 'normal', ...t };
  if (withDefaults.currentStep) return withDefaults;
  const { step, ...rest } = withDefaults;
  return {
    ...rest,
    currentStep: {
      id: `${t.id}-step-1`,
      text: step || 'Open this task and note one small first action.',
      done: false,
      completedAt: null,
    },
  };
}

function localRead() {
  if (typeof window === 'undefined') return structuredClone(seed);
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : structuredClone(seed);
}
function localWrite(data) {
  localStorage.setItem(key, JSON.stringify(data));
  return data;
}

export async function loadData(uid = 'demo') {
  if (!firebaseEnabled) {
    const d = localRead();
    return {
      tasks: d.tasks.map(migrateTask),
      checkins: d.checkins || [],
      reflections: d.reflections || [],
      settings: { ...defaultSettings, ...(d.settings || {}) },
      stats: { ...defaultStats, ...(d.stats || {}), strategyUses: { ...defaultStats.strategyUses, ...(d.stats?.strategyUses || {}) } },
    };
  }
  const taskSnap = await getDocs(query(collection(db, 'users', uid, 'tasks'), orderBy('createdAt', 'desc')));
  const checkSnap = await getDocs(query(collection(db, 'users', uid, 'checkins'), orderBy('createdAt', 'desc')));
  const reflectionSnap = await getDocs(query(collection(db, 'users', uid, 'reflections'), orderBy('createdAt', 'desc')));
  const userSnap = await getDoc(doc(db, 'users', uid));
  const stored = userSnap.exists() ? userSnap.data() : null;
  return {
    tasks: taskSnap.docs.map(d => migrateTask({ id: d.id, ...d.data() })),
    checkins: checkSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    reflections: reflectionSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    settings: { ...defaultSettings, ...(stored?.settings || {}) },
    stats: { ...defaultStats, ...(stored?.stats || {}), strategyUses: { ...defaultStats.strategyUses, ...(stored?.stats?.strategyUses || {}) } },
  };
}

export async function addTask(uid, task) {
  if (!firebaseEnabled) {
    const d = localRead();
    const saved = migrateTask({ ...task, id: crypto.randomUUID(), done: false });
    d.tasks.unshift(saved);
    localWrite(d);
    return saved;
  }
  const ref = await addDoc(collection(db, 'users', uid, 'tasks'), { ...task, done: false, createdAt: serverTimestamp() });
  return migrateTask({ ...task, id: ref.id, done: false });
}

export async function toggleTask(uid, id, done) {
  if (!firebaseEnabled) {
    const d = localRead();
    d.tasks = d.tasks.map(t => (t.id === id ? { ...t, done } : t));
    localWrite(d);
    return d.tasks.find(t => t.id === id);
  }
  await updateDoc(doc(db, 'users', uid, 'tasks', id), { done });
}

export async function removeTask(uid, id) {
  if (!firebaseEnabled) {
    const d = localRead();
    d.tasks = d.tasks.filter(t => t.id !== id);
    localWrite(d);
    return;
  }
  await deleteDoc(doc(db, 'users', uid, 'tasks', id));
}

// Edits the task's own fields (title, module, due date, priority). This is
// deliberately separate from anything that touches `currentStep` or `done`.
export async function updateTask(uid, id, patch) {
  if (!firebaseEnabled) {
    const d = localRead();
    d.tasks = d.tasks.map(t => (t.id === id ? { ...t, ...patch } : t));
    localWrite(d);
    return d.tasks.find(t => t.id === id);
  }
  await updateDoc(doc(db, 'users', uid, 'tasks', id), patch);
}

// Replaces the task's current micro-step outright — used when the user
// edits the step text, picks a different suggested step, or a new
// rule-based step is generated after the previous one is completed.
export async function setCurrentStep(uid, id, step) {
  if (!firebaseEnabled) {
    const d = localRead();
    d.tasks = d.tasks.map(t => (t.id === id ? { ...t, currentStep: step } : t));
    localWrite(d);
    return d.tasks.find(t => t.id === id);
  }
  await updateDoc(doc(db, 'users', uid, 'tasks', id), { currentStep: step });
}

// Completes (or reopens) only the task's current micro-step. This must
// never mark the full academic task as done — that is `toggleTask`'s job.
export async function completeCurrentStep(uid, id, done = true) {
  const completedAt = done ? new Date().toISOString() : null;
  if (!firebaseEnabled) {
    const d = localRead();
    d.tasks = d.tasks.map(t => (t.id === id ? { ...t, currentStep: { ...t.currentStep, done, completedAt } } : t));
    localWrite(d);
    return d.tasks.find(t => t.id === id);
  }
  await updateDoc(doc(db, 'users', uid, 'tasks', id), {
    'currentStep.done': done,
    'currentStep.completedAt': done ? serverTimestamp() : null,
  });
}

export async function saveCheckin(uid, data) {
  if (!firebaseEnabled) {
    const d = localRead();
    d.checkins.unshift({ ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    localWrite(d);
    return;
  }
  await addDoc(collection(db, 'users', uid, 'checkins'), { ...data, createdAt: serverTimestamp() });
}

// A short, free-text weekly reflection — entirely the student's own words,
// never generated or summarised for them. Stored the same way as check-ins
// so it benefits from the same Firebase/local-demo consistency and will be
// covered by the Phase 4 data-deletion sweep.
export async function saveReflection(uid, data) {
  if (!firebaseEnabled) {
    const d = localRead();
    d.reflections = d.reflections || [];
    d.reflections.unshift({ ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    localWrite(d);
    return;
  }
  await addDoc(collection(db, 'users', uid, 'reflections'), { ...data, createdAt: serverTimestamp() });
}

export async function saveSettings(uid, settings) {
  const merged = { ...defaultSettings, ...settings };
  if (!firebaseEnabled) {
    const d = localRead();
    d.settings = merged;
    localWrite(d);
    return;
  }
  await setDoc(doc(db, 'users', uid), { settings: merged }, { merge: true });
}

// Records that a small step was completed, for the gentle "small steps
// taken" count on the Progress screen — never framed as a target or streak.
export async function recordStepCompleted(uid) {
  if (!firebaseEnabled) {
    const d = localRead();
    const stats = { ...defaultStats, ...(d.stats || {}) };
    d.stats = { ...stats, stepsCompleted: (stats.stepsCompleted || 0) + 1 };
    localWrite(d);
    return d.stats;
  }
  await setDoc(doc(db, 'users', uid), { stats: { stepsCompleted: increment(1) } }, { merge: true });
}

// Records that a particular Overwhelmed Mode strategy was actually used
// (not just viewed), so Progress can show which kinds of support have
// helped — again, a reflective count, not a leaderboard or streak.
export async function recordStrategyUse(uid, barrierId) {
  if (!firebaseEnabled) {
    const d = localRead();
    const stats = { ...defaultStats, ...(d.stats || {}) };
    const strategyUses = { ...defaultStats.strategyUses, ...(stats.strategyUses || {}) };
    strategyUses[barrierId] = (strategyUses[barrierId] || 0) + 1;
    d.stats = { ...stats, strategyUses };
    localWrite(d);
    return d.stats;
  }
  await setDoc(doc(db, 'users', uid), { stats: { strategyUses: { [barrierId]: increment(1) } } }, { merge: true });
}

// --- Data deletion (Phase 4) -----------------------------------------------
//
// Every function below is deliberately narrow in scope — each deletes
// exactly the category of data its name says, and nothing else. This
// mirrors the plain-language explanation the Privacy screen gives, so a
// student can trust that "delete check-in history" really does leave
// their tasks alone, and vice versa.

async function deleteAllDocsIn(uid, subcollection) {
  const snap = await getDocs(collection(db, 'users', uid, subcollection));
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
}

export async function deleteCheckinHistory(uid) {
  if (!firebaseEnabled) {
    const d = localRead();
    d.checkins = [];
    d.reflections = [];
    localWrite(d);
    return;
  }
  await Promise.all([deleteAllDocsIn(uid, 'checkins'), deleteAllDocsIn(uid, 'reflections')]);
}

export async function deleteCompletedTasks(uid) {
  if (!firebaseEnabled) {
    const d = localRead();
    d.tasks = d.tasks.filter(t => !t.done);
    localWrite(d);
    return;
  }
  const snap = await getDocs(collection(db, 'users', uid, 'tasks'));
  await Promise.all(snap.docs.filter(d => d.data().done).map(d => deleteDoc(d.ref)));
}

// The full reset: every task (not just completed ones), every check-in and
// reflection, settings, and the recorded stats — in Firestore mode this
// also removes the users/{uid} document itself, not just its subcollections.
export async function deleteAllData(uid) {
  if (!firebaseEnabled) {
    // Deliberately writes an explicitly empty state rather than removing
    // the key outright — removing the key would make localRead() fall back
    // to the seeded demo tasks, silently undoing the deletion the student
    // just asked for.
    localWrite({ tasks: [], checkins: [], reflections: [], settings: { ...defaultSettings }, stats: { ...defaultStats } });
    return;
  }
  await Promise.all([deleteAllDocsIn(uid, 'tasks'), deleteAllDocsIn(uid, 'checkins'), deleteAllDocsIn(uid, 'reflections')]);
  await deleteDoc(doc(db, 'users', uid));
}

// Gathers everything the student can export — used for the optional JSON
// download. Deliberately reuses loadData rather than re-reading storage,
// so the export always matches exactly what the app itself would show.
export async function exportAllData(uid) {
  const data = await loadData(uid);
  return { exportedAt: new Date().toISOString(), ...data };
}
