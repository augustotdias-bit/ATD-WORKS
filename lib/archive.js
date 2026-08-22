const DB_NAME='atd-works-archive';
const DB_VERSION=1;
const STORE='works';

function openDB(){
  return new Promise((resolve,reject)=>{
    if(typeof window==='undefined'){reject(new Error('Browser storage unavailable'));return;}
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(STORE)){
        const store=db.createObjectStore(STORE,{keyPath:'id'});
        store.createIndex('date','date');
        store.createIndex('createdAt','createdAt');
      }
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}

async function localSave(work){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).put(work);
    tx.oncomplete=()=>{db.close();resolve(work)};
    tx.onerror=()=>{db.close();reject(tx.error)};
  });
}

async function localWorks(){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readonly');
    const req=tx.objectStore(STORE).getAll();
    req.onsuccess=()=>{
      const works=req.result.sort((a,b)=>(b.date||'').localeCompare(a.date||'') || (b.createdAt||0)-(a.createdAt||0));
      db.close();resolve(works);
    };
    req.onerror=()=>{db.close();reject(req.error)};
  });
}

async function localWork(id){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readonly');
    const req=tx.objectStore(STORE).get(id);
    req.onsuccess=()=>{db.close();resolve(req.result||null)};
    req.onerror=()=>{db.close();reject(req.error)};
  });
}

async function localDelete(id){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete=()=>{db.close();resolve()};
    tx.onerror=()=>{db.close();reject(tx.error)};
  });
}

export async function saveWork(work,password=''){
  if(work.image instanceof File){
    const data=new FormData();
    Object.entries(work).forEach(([key,value])=>{if(key!=='image'&&value!=null)data.append(key,String(value))});
    data.append('image',work.image);
    const response=await fetch('/api/works',{method:'POST',headers:{'x-admin-password':password},body:data});
    if(response.ok)return response.json();
    if(response.status!==503){const body=await response.json().catch(()=>({}));throw new Error(body.error||'Cloud save failed')}
  }
  return localSave(work);
}

export async function getWorks(){
  try{
    const response=await fetch('/api/works',{cache:'no-store'});
    if(response.ok)return response.json();
  }catch{}
  return localWorks();
}

export async function getWork(id){
  try{
    const response=await fetch(`/api/works?id=${encodeURIComponent(id)}`,{cache:'no-store'});
    if(response.ok){const item=await response.json();if(item)return item}
  }catch{}
  return localWork(id);
}

export async function deleteWork(id,password=''){
  try{
    const response=await fetch(`/api/works?id=${encodeURIComponent(id)}`,{method:'DELETE',headers:{'x-admin-password':password}});
    if(response.ok)return;
    if(response.status!==503){const body=await response.json().catch(()=>({}));throw new Error(body.error||'Cloud delete failed')}
  }catch(error){if(error?.message&&error.message!=='Failed to fetch')throw error}
  return localDelete(id);
}

export function makeId(){
  if(globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
