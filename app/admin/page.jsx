'use client';
import {useEffect,useState} from 'react';
import {deleteWork,getWorks,makeId,saveWork,updateWork} from '../../lib/archive';

const emptyForm={title:'',medium:'',dimensions:'',date:'',price:'',availability:'Available'};

export default function Admin(){
  const [file,setFile]=useState(null);
  const [preview,setPreview]=useState(null);
  const [form,setForm]=useState(emptyForm);
  const [works,setWorks]=useState([]);
  const [message,setMessage]=useState('');
  const [saving,setSaving]=useState(false);
  const [password,setPassword]=useState('');
  const [unlocked,setUnlocked]=useState(false);
  const [checking,setChecking]=useState(false);
  const [editing,setEditing]=useState(null);
  const [draft,setDraft]=useState(emptyForm);

  useEffect(()=>{sessionStorage.removeItem('atd-admin-password')},[]);
  useEffect(()=>{if(!file){setPreview(null);return}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url)},[file]);

  async function login(e){
    e?.preventDefault();setChecking(true);setMessage('');
    try{
      const response=await fetch('/api/works?verify=1',{headers:{'x-admin-password':password},cache:'no-store'});
      if(!response.ok){setUnlocked(false);setMessage(response.status===401?'Incorrect password.':'Could not verify the admin login.');return}
      sessionStorage.setItem('atd-admin-password',password);setUnlocked(true);await refresh(password);
    }catch{setUnlocked(false);setMessage('Could not verify the admin login.')}
    finally{setChecking(false)}
  }
  function logout(){sessionStorage.removeItem('atd-admin-password');setPassword('');setUnlocked(false);setWorks([]);setMessage('')}
  async function refresh(pass=password){setWorks(await getWorks(true,pass))}

  async function submit(e){
    e.preventDefault();if(!file){setMessage('Choose an artwork image first.');return}
    setSaving(true);setMessage('');
    try{await saveWork({...form,id:makeId(),image:file,originalName:file.name,mime:file.type,createdAt:Date.now()},password);setForm(emptyForm);setFile(null);setMessage('Artwork added to the archive.');await refresh()}
    catch(err){setMessage(err.message==='Unauthorized'?'Incorrect admin password.':'Could not save this artwork.')}
    finally{setSaving(false)}
  }

  function startEdit(work){setEditing(work.id);setDraft({title:work.title,medium:work.medium,dimensions:work.dimensions,date:work.date,price:work.price||'',availability:work.availability})}
  async function saveEdit(id){try{await updateWork(id,draft,password);setEditing(null);setMessage('Artwork updated.');await refresh()}catch(err){setMessage(err.message==='Unauthorized'?'Incorrect admin password.':'Could not update this artwork.')}}
  async function toggleHidden(work){try{await updateWork(work.id,{hidden:!work.hidden},password);setMessage(work.hidden?'Artwork is visible again.':'Artwork hidden from the public archive.');await refresh()}catch(err){setMessage(err.message==='Unauthorized'?'Incorrect admin password.':'Could not change visibility.')}}
  async function move(index,direction){const other=index+direction;if(other<0||other>=works.length)return;const a=works[index],b=works[other];try{await updateWork(a.id,{order:b.order},password);await updateWork(b.id,{order:a.order},password);await refresh()}catch(err){setMessage(err.message==='Unauthorized'?'Incorrect admin password.':'Could not reorder artworks.')}}
  async function remove(id){if(!confirm('Remove this artwork from the archive permanently?'))return;try{await deleteWork(id,password);await refresh();setMessage('Artwork removed.')}catch(err){setMessage(err.message==='Unauthorized'?'Incorrect admin password.':'Could not delete this artwork.')}}

  if(!unlocked)return <main className="site admin-page">
    <header className="header"><a className="brand" href="/">ATD WORKS</a><nav className="nav"><a href="/">Archive</a></nav></header>
    <section className="login-shell"><form className="login-card" onSubmit={login}><p className="eyebrow">Private administration</p><h1>Admin</h1><p>Enter the private password to manage ATD WORKS.</p><label><span>Password</span><input autoFocus type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="primary-button" disabled={checking||!password} type="submit">{checking?'Checking…':'Enter'}</button>{message&&<p className="form-message">{message}</p>}</form></section>
  </main>;

  return <main className="site admin-page">
    <header className="header"><a className="brand" href="/">ATD WORKS</a><nav className="nav"><a href="/">Archive</a><button className="nav-button" onClick={logout}>Log out</button></nav></header>
    <section className="admin-shell">
      <div className="admin-intro"><p className="eyebrow">Archive administration</p><h1>Add<br/>work</h1><p>Upload new work here. Below, you can edit catalogue information, price and availability, hide works temporarily and control their display order.</p></div>
      <form className="work-form" onSubmit={submit}>
        <label className="upload-box">{preview?<img src={preview} alt="Artwork preview"/>:<><strong>Artwork image</strong><span>Recommended: JPEG, sRGB, around 3000 px on the long edge.</span></>}<input required type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
        <label><span>Title</span><input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
        <label><span>Medium</span><input required placeholder="e.g. Acrylic on canvas" value={form.medium} onChange={e=>setForm({...form,medium:e.target.value})}/></label>
        <label><span>Dimensions</span><input required placeholder="e.g. 80 × 60 cm" value={form.dimensions} onChange={e=>setForm({...form,dimensions:e.target.value})}/></label>
        <label><span>Date</span><input required type="text" placeholder="e.g. 2026" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label>
        <label><span>Price</span><input type="text" placeholder="e.g. €800" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label>
        <label><span>Availability</span><select value={form.availability} onChange={e=>setForm({...form,availability:e.target.value})}><option>Available</option><option>Sold</option><option>Not for sale</option></select></label>
        <button className="primary-button" disabled={saving} type="submit">{saving?'Saving…':'Add to archive'}</button>
        {message&&<p className="form-message">{message}</p>}
      </form>
    </section>

    <section className="admin-list">
      <div className="toolbar"><span>Manage works</span><span>{works.length}</span></div>
      {works.length?<div>{works.map((w,index)=><div className={`admin-row ${w.hidden?'is-hidden':''}`} key={w.id}>
        {editing===w.id?<div className="edit-grid"><input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/><input value={draft.medium} onChange={e=>setDraft({...draft,medium:e.target.value})}/><input value={draft.dimensions} onChange={e=>setDraft({...draft,dimensions:e.target.value})}/><input value={draft.date} onChange={e=>setDraft({...draft,date:e.target.value})}/><input placeholder="Price" value={draft.price} onChange={e=>setDraft({...draft,price:e.target.value})}/><select value={draft.availability} onChange={e=>setDraft({...draft,availability:e.target.value})}><option>Available</option><option>Sold</option><option>Not for sale</option></select></div>:<div><strong>{w.title}{w.hidden?' · Hidden':''}</strong><span>{w.medium} · {w.dimensions} · {w.date}{w.price?` · ${w.price}`:''} · {w.availability}</span></div>}
        <div className="admin-actions">{editing===w.id?<><button onClick={()=>saveEdit(w.id)}>Save</button><button onClick={()=>setEditing(null)}>Cancel</button></>:<button onClick={()=>startEdit(w)}>Edit</button>}<button title="Move up" onClick={()=>move(index,-1)}>↑</button><button title="Move down" onClick={()=>move(index,1)}>↓</button><button onClick={()=>toggleHidden(w)}>{w.hidden?'Show':'Hide'}</button><a href={`/work/${w.id}`}>View</a><button onClick={()=>remove(w.id)}>Delete</button></div>
      </div>)}</div>:<div className="empty">No works stored yet.</div>}
    </section>
  </main>
}
