import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db, firebaseEnabled } from './firebase';

const key = 'nuvora-demo-data-v1';
const seed = { tasks: [
  { id:'1', title:'Draft literature notes', module:'Dissertation', due:'2026-08-12', step:'Open the document and write three headings.', done:false, bucket:'today' },
  { id:'2', title:'Email supervisor', module:'Dissertation', due:'2026-08-13', step:'Open the email and write only the subject line.', done:false, bucket:'week' },
  { id:'3', title:'Review database diagram', module:'Database Systems', due:'2026-08-18', step:'Check the first two relationships.', done:true, bucket:'later' }
], checkins: [], settings:{ calmMode:false, reducedMotion:false, textScale:1 } };

function localRead(){ if(typeof window==='undefined') return seed; const raw=localStorage.getItem(key); return raw ? JSON.parse(raw) : structuredClone(seed); }
function localWrite(data){ localStorage.setItem(key, JSON.stringify(data)); return data; }

export async function loadData(uid='demo') {
  if (!firebaseEnabled) return localRead();
  const taskSnap = await getDocs(query(collection(db,'users',uid,'tasks'), orderBy('createdAt','desc')));
  const checkSnap = await getDocs(query(collection(db,'users',uid,'checkins'), orderBy('createdAt','desc')));
  return { tasks:taskSnap.docs.map(d=>({id:d.id,...d.data()})), checkins:checkSnap.docs.map(d=>({id:d.id,...d.data()})), settings:{} };
}
export async function addTask(uid, task){ if(!firebaseEnabled){const d=localRead(); d.tasks.unshift({...task,id:crypto.randomUUID()}); return localWrite(d);} const ref=await addDoc(collection(db,'users',uid,'tasks'),{...task,createdAt:serverTimestamp()}); return {...task,id:ref.id}; }
export async function toggleTask(uid,id,done){ if(!firebaseEnabled){const d=localRead(); d.tasks=d.tasks.map(t=>t.id===id?{...t,done}:t); return localWrite(d);} await updateDoc(doc(db,'users',uid,'tasks',id),{done}); }
export async function removeTask(uid,id){ if(!firebaseEnabled){const d=localRead(); d.tasks=d.tasks.filter(t=>t.id!==id); return localWrite(d);} await deleteDoc(doc(db,'users',uid,'tasks',id)); }
export async function saveCheckin(uid,data){ if(!firebaseEnabled){const d=localRead(); d.checkins.unshift({...data,id:crypto.randomUUID(),createdAt:new Date().toISOString()}); return localWrite(d);} await addDoc(collection(db,'users',uid,'checkins'),{...data,createdAt:serverTimestamp()}); }
export async function saveSettings(uid,settings){ if(!firebaseEnabled){const d=localRead(); d.settings=settings; return localWrite(d);} await setDoc(doc(db,'users',uid),{settings},{merge:true}); }
