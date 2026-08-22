const DB_NAME='atd-works-archive';
const DB_VERSION=1;
const STORE='works';

function openDB(){return new Promise((resolve,reject)=>{if(typeof window==='undefined'){reject(new Error('Browser storage unavailable'));return}const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE)){const store=db.createObjectStore(STORE,{keyPath:'id'});store.createIndex('date','date');store.createIndex('createdAt','createdAt')}};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
function sortLocal(works){return [...works].map((w,i)=>({...w,order:Number.isFinite(Number(w.order))?Number(w.order):i,hidden:Boolean(w.hidden)})).sort((a,b)=>a.order-b.order || (b.createdAt||0)-(a.createdAt||0))}
async function localSave(work){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(work);tx.oncomplete=()=>{db.close();resolve(work)};tx.onerror=()=>{db.close();reject(tx.error)}})}
async function localWorks(includeHidden=false){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const req=tx.objectStore(STORE).getAll();req.onsuccess=()=>{const works=sortLocal(req.result).filter(w=>includeHidden||!w.hidden);db.close();resolve(works)};req.onerror=()=>{db.close();reject(req.error)}})}
async function localWork(id){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const req=tx.objectStore(STORE).get(id);req.onsuccess=()=>{db.close();resolve(req.result||null)};req.onerror=()=>{db.close();reject(req.error)}})}
async function localDelete(id){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}
async function localUpdate(id,changes){const current=await localWork(id);if(!current)throw new Error('Artwork not found');return localSave({...current,...changes})}

export async function saveWork(work,password=''){
  if(work.image instanceof File){const data=new FormData();Object.entries(work).forEach(([key,value])=>{if(key!=='image'&&value!=null)data.append(key,String(value))});data.append('image',work.image);const response=await fetch('/api/works',{method:'POST',headers:{'x-admin-password':password},body:data});if(response.ok)return response.json();if(response.status!==503){const body=await response.json().catch(()=>({}));throw new Error(body.error||'Cloud save failed')}}
  return localSave(work)
}

export async function getWorks(includeHidden=false,password=''){
  try{const response=await fetch(`/api/works${includeHidden?'?includeHidden=1':''}`,{cache:'no-store',headers:includeHidden?{'x-admin-password':password}:{}});if(response.ok)return response.json()}catch{}
  return localWorks(includeHidden)
}

export async function getWork(id){try{const response=await fetch(`/api/works?id=${encodeURIComponent(id)}`,{cache:'no-store'});if(response.ok){const item=await response.json();if(item)return item}}catch{}return localWork(id)}

export async function updateWork(id,changes,password=''){
  try{const response=await fetch('/api/works',{method:'PATCH',headers:{'Content-Type':'application/json','x-admin-password':password},body:JSON.stringify({id,changes})});if(response.ok)return response.json();if(response.status!==503){const body=await response.json().catch(()=>({}));throw new Error(body.error||'Cloud update failed')}}catch(error){if(error?.message&&error.message!=='Failed to fetch')throw error}
  return localUpdate(id,changes)
}

export async function deleteWork(id,password=''){try{const response=await fetch(`/api/works?id=${encodeURIComponent(id)}`,{method:'DELETE',headers:{'x-admin-password':password}});if(response.ok)return;if(response.status!==503){const body=await response.json().catch(()=>({}));throw new Error(body.error||'Cloud delete failed')}}catch(error){if(error?.message&&error.message!=='Failed to fetch')throw error}return localDelete(id)}

export function makeId(){if(globalThis.crypto?.randomUUID)return crypto.randomUUID();return `${Date.now()}-${Math.random().toString(36).slice(2)}`}
