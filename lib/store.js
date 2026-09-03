import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db, firebaseEnabled } from './firebase';

const key = 'nuvora-demo-data-v1';

export const defaultSettings = { calmMode: false, reducedMotion: false, textScale: 1 };

const seed = {
  tasks: [
    { id: '1', title: 'Draft literature notes', module: 'Dissertation', due: '2026-08-12', step: 'Open the document and write three headings.', done: false, bucket: 'today' },
    { id: '2', title: 'Email supervisor', module: 'Dissertation', due: '2026-08-13', step: 'Open the email and write only the subject line.', done: false, bucket: 'week' },
    { id: '3', title: 'Review database diagram', module: 'Database Systems', due: '2026-08-18', step: 'Check the first two relationships.', done: true, bucket: 'later' },
  ],
  checkins: [],
  settings: { ...defaultSettings },
};

// A task previously stored a single flat `step` string. The current model
// separates the full academic task from its current micro-step so that
// completing the step never implies completing the whole assignment.
// This migration upgrades old-shaped tasks the first time they are read,
// without discarding anything the user already has.
export function migrateTask(t) {
  if (t.currentStep) return t;
  const { step, ...rest } = t;
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
      settings: { ...defaultSettings, ...(d.settings || {}) },
    };
  }
  const taskSnap = await getDocs(query(collection(db, 'users', uid, 'tasks'), orderBy('createdAt', 'desc')));
  const checkSnap = await getDocs(query(collection(db, 'users', uid, 'checkins'), orderBy('createdAt', 'desc')));
  const userSnap = await getDoc(doc(db, 'users', uid));
  const storedSettings = userSnap.exists() ? userSnap.data()?.settings : null;
  return {
    tasks: taskSnap.docs.map(d => migrateTask({ id: d.id, ...d.data() })),
    checkins: checkSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    settings: { ...defaultSettings, ...(storedSettings || {}) },
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
