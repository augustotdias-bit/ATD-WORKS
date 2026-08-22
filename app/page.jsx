'use client';
import {useEffect,useMemo,useState} from 'react';
import {getWorks} from '../lib/archive';

export default function Home(){
  const [works,setWorks]=useState([]);
  const [loading,setLoading]=useState(true);
  const [filter,setFilter]=useState('All');

  useEffect(()=>{
    let urls=[];
    getWorks().then(items=>{
      const withUrls=items.map(work=>{
        const localUrl=work.image instanceof Blob?URL.createObjectURL(work.image):null;
        if(localUrl)urls.push(localUrl);
        return {...work,imageUrl:work.imageUrl||localUrl};
      });
      setWorks(withUrls);
    }).finally(()=>setLoading(false));
    return ()=>urls.forEach(URL.revokeObjectURL);
  },[]);

  const shown=useMemo(()=>filter==='All'?works:works.filter(w=>w.availability===filter),[works,filter]);

  return <main className="site">
    <header className="header">
      <a className="brand" href="/">ATD WORKS</a>
      <nav className="nav"><a href="#archive">Archive</a><a href="#about">About</a><a href="/admin">Add work</a></nav>
    </header>
    <section className="hero"><p className="eyebrow">Personal artwork archive</p><h1>ATD<br/>WORKS</h1><p>An evolving catalogue of artworks. Each work is documented with its title, medium, dimensions, date and availability, with the original uploaded image kept available for download.</p></section>
    <section id="archive"><div className="toolbar"><span>Archive · {works.length} {works.length===1?'work':'works'}</span><div className="filters">{['All','Available','Sold','Not for sale'].map(v=><button key={v} className={filter===v?'active':''} onClick={()=>setFilter(v)}>{v}</button>)}</div></div>
      {loading?<div className="empty">Opening archive…</div>:shown.length?<div className="grid">{shown.map(work=><a className="card" href={`/work/${work.id}`} key={work.id}><div className="art-image">{work.imageUrl?<img src={work.imageUrl} alt={work.title}/>:<span>No image</span>}</div><div className="meta"><div className="meta-top"><h2>{work.title}</h2><span className="status">{work.availability}</span></div><p>{work.medium}<br/>{work.dimensions} · {work.date}</p></div></a>)}</div>:<div className="empty"><p>{works.length?'No works match this filter.':'The archive is ready for its first work.'}</p><a className="text-link" href="/admin">Add an artwork →</a></div>}
    </section>
    <section id="about" className="about-section"><p className="eyebrow">About</p><h2>A living catalogue,<br/>not a conventional portfolio.</h2><p>ATD WORKS is designed as a quiet record of the work: image first, catalogue information second, without unnecessary decoration.</p></section>
    <footer className="footer"><span>ATD WORKS</span><span>Artwork archive</span></footer>
  </main>
}