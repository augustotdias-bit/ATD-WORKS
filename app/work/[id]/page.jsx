'use client';
import {useEffect,useState} from 'react';
import {useParams} from 'next/navigation';
import {getWork} from '../../../lib/archive';

export default function WorkPage(){
  const {id}=useParams();
  const [work,setWork]=useState(null);
  const [imageUrl,setImageUrl]=useState(null);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    let localUrl=null;
    getWork(id).then(item=>{
      setWork(item);
      if(item?.imageUrl)setImageUrl(item.imageUrl);
      else if(item?.image instanceof Blob){localUrl=URL.createObjectURL(item.image);setImageUrl(localUrl)}
    }).finally(()=>setLoading(false));
    return()=>{if(localUrl)URL.revokeObjectURL(localUrl)};
  },[id]);

  async function download(){
    if(work?.imageUrl){
      const a=document.createElement('a');a.href=work.imageUrl;a.target='_blank';a.rel='noopener';a.download=work.originalName||`${work.title}.jpg`;document.body.appendChild(a);a.click();a.remove();return;
    }
    if(!work?.image)return;
    const url=URL.createObjectURL(work.image);
    const a=document.createElement('a');a.href=url;a.download=work.originalName||`${work.title}.jpg`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  if(loading)return <main className="site"><header className="header"><a className="brand" href="/">ATD WORKS</a></header><div className="empty">Opening work…</div></main>;
  if(!work)return <main className="site"><header className="header"><a className="brand" href="/">ATD WORKS</a></header><div className="empty"><p>This work could not be found.</p><a className="text-link" href="/">Return to archive →</a></div></main>;

  return <main className="site"><header className="header"><a className="brand" href="/">ATD WORKS</a><nav className="nav"><a href="/">Archive</a><a href="/admin">Manage</a></nav></header><article className="work-detail"><div className="work-visual">{imageUrl?<img src={imageUrl} alt={work.title}/>:<span>No image</span>}</div><div className="work-info"><p className="eyebrow">Artwork record</p><h1>{work.title}</h1><dl><div><dt>Medium</dt><dd>{work.medium}</dd></div><div><dt>Dimensions</dt><dd>{work.dimensions}</dd></div><div><dt>Date</dt><dd>{work.date}</dd></div><div><dt>Availability</dt><dd>{work.availability}</dd></div></dl><button className="primary-button" onClick={download}>Download image</button></div></article></main>
}