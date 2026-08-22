'use client';
import {useEffect,useState} from 'react';
import {deleteWork,getWorks,makeId,saveWork} from '../../lib/archive';

const emptyForm={title:'',medium:'',dimensions:'',date:'',availability:'Available'};

export default function Admin(){
  const [file,setFile]=useState(null);
  const [preview,setPreview]=useState(null);
  const [form,setForm]=useState(emptyForm);
  const [works,setWorks]=useState([]);
  const [message,setMessage]=useState('');
  const [saving,setSaving]=useState(false);
  const [password,setPassword]=useState('');

  async function refresh(){setWorks(await getWorks())}
  useEffect(()=>{setPassword(sessionStorage.getItem('atd-admin-password')||'');refresh()},[]);
  useEffect(()=>{if(!file){setPreview(null);return} const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url)},[file]);

  function rememberPassword(value){setPassword(value);sessionStorage.setItem('atd-admin-password',value)}

  async function submit(e){
    e.preventDefault();
    if(!file){setMessage('Choose an artwork image first.');return}
    setSaving(true);setMessage('');
    try{
      await saveWork({...form,id:makeId(),image:file,originalName:file.name,mime:file.type,createdAt:Date.now()},password);
      setForm(emptyForm);setFile(null);setMessage('Artwork added to the archive.');await refresh();
    }catch(err){setMessage(err.message==='Unauthorized'?'Incorrect admin password.':'Could not save this artwork. If cloud storage is not configured yet, it will remain local to this browser.');}
    finally{setSaving(false)}
  }

  async function remove(id){
    if(!confirm('Remove this artwork from the archive?'))return;
    try{await deleteWork(id,password);await refresh();setMessage('Artwork removed.')}catch(err){setMessage(err.message==='Unauthorized'?'Incorrect admin password.':'Could not delete this artwork.')}
  }

  return <main className="site admin-page">
    <header className="header"><a className="brand" href="/">ATD WORKS</a><nav className="nav"><a href="/">Archive</a></nav></header>
    <section className="admin-shell">
      <div className="admin-intro"><p className="eyebrow">Archive administration</p><h1>Add<br/>work</h1><p>Upload the artwork image and enter its catalogue information. When cloud storage is enabled, the archive is shared across all your devices.</p></div>
      <form className="work-form" onSubmit={submit}>
        <label><span>Admin password</span><input type="password" autoComplete="current-password" placeholder="Required for cloud changes" value={password} onChange={e=>rememberPassword(e.target.value)}/></label>
        <label className="upload-box">{preview?<img src={preview} alt="Artwork preview"/>:<><strong>Artwork image</strong><span>Click to choose JPG, PNG, WEBP or another browser-supported image.</span></>}<input required type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
        <label><span>Title</span><input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
        <label><span>Medium</span><input required placeholder="e.g. Acrylic on canvas" value={form.medium} onChange={e=>setForm({...form,medium:e.target.value})}/></label>
        <label><span>Dimensions</span><input required placeholder="e.g. 80 × 60 cm" value={form.dimensions} onChange={e=>setForm({...form,dimensions:e.target.value})}/></label>
        <label><span>Date</span><input required type="text" placeholder="e.g. 2026" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label>
        <label><span>Availability</span><select value={form.availability} onChange={e=>setForm({...form,availability:e.target.value})}><option>Available</option><option>Sold</option><option>Not for sale</option></select></label>
        <button className="primary-button" disabled={saving} type="submit">{saving?'Saving…':'Add to archive'}</button>
        {message&&<p className="form-message">{message}</p>}
      </form>
    </section>

    <section className="admin-list"><div className="toolbar"><span>Stored works</span><span>{works.length}</span></div>{works.length?<div>{works.map(w=><div className="admin-row" key={w.id}><div><strong>{w.title}</strong><span>{w.medium} · {w.dimensions} · {w.date}</span></div><div className="admin-actions"><a href={`/work/${w.id}`}>View</a><button onClick={()=>remove(w.id)}>Delete</button></div></div>)}</div>:<div className="empty">No works stored yet.</div>}</section>
  </main>
}