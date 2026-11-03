'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {ArrowRight,FileCheck2,RefreshCw} from 'lucide-react';
import {useAppApi} from '../lib/client-api';
import {activeMaterialMatch,availableMaterials} from '../lib/profile-materials';
import {workChangeConfirmed} from '../lib/application-evidence';
import {MaterialsList} from './profile-materials';
import {SharedWorkExample} from './hiring-workflows';
type Row=Record<string,any>;
type Result={ok:boolean;error?:string};

export function PipelineWorkEvidence({application:a,onOpen,showMaterials=false}:{application:Row;onOpen:()=>void;showMaterials?:boolean}){
 if(!activeMaterialMatch(a))return null;
 const summary=a.workEvidence||{count:0,checks:0,firstTitle:''};
 return <div className="pipeline-work-evidence">{showMaterials&&availableMaterials(a.data?.swipeMaterials).length>0&&<div className="pipeline-material-links"><small>Shared application materials</small><MaterialsList materials={a.data.swipeMaterials}/></div>}{summary.count>0?<div className="pipeline-work-summary"><FileCheck2 size={19}/><div><b>{summary.count} work example{summary.count===1?'':'s'} shared</b><small>{summary.firstTitle}{summary.count>1?` · ${summary.count-1} more`:''}</small><span>{summary.checks} evidence check{summary.checks===1?'':'s'} recorded</span></div><button className="outline-btn" onClick={onOpen} aria-label={'View work examples for '+(a.side==='candidate'?a.job.companyName:a.candidate.name)+' · '+a.job.title}>View work examples<ArrowRight size={15}/></button></div>:<p className="live-muted">No work examples shared for this application yet.</p>}</div>;
}

export function ApplicationWorkEvidence({application:a,busy,onSave,onShare}:{application?:Row;busy:boolean;onSave:(payload:Row)=>Promise<Result>;onShare:()=>void}){
 const {request:fetch}=useAppApi(),[shares,setShares]=useState<Row[]|null>(null),[error,setError]=useState('');
 const serial=useRef(0),saving=useRef(false),active=Boolean(a&&activeMaterialMatch(a));
 const load=useCallback(async()=>{
  if(!a||!active)return null;const ticket=++serial.current;
  try{const params=new URLSearchParams({applicationId:a.id});if(a.side==='employer')params.set('companyId',a.companyId);
   const response=await fetch('/api/workflows?'+params,{cache:'no-store'}),body=await response.json() as Row;if(!response.ok)throw Error(body.error||'Could not load shared work.');if(ticket!==serial.current)return null;
   const rows=(body.shares||[]).filter((share:Row)=>share.applicationId===a.id);setShares(rows);setError('');return rows as Row[];
  }catch(err:any){if(ticket===serial.current){setShares(null);setError(err.message||'Could not load shared work.')}return null}
 },[fetch,a?.id,a?.companyId,a?.side,active]);
 useEffect(()=>{setShares(null);setError('');void load();const timer=setInterval(()=>{if(!saving.current&&document.visibilityState==='visible')void load()},15000);return()=>{serial.current++;clearInterval(timer)}},[load]);
 async function save(payload:Row):Promise<Result>{if(saving.current||busy)return {ok:false,error:'A change is still saving.'};saving.current=true;setError('');try{const result=await onSave(payload);if(!result.ok){setError(result.error||'Could not save this change.');return result}const rows=await load();if(!rows||!workChangeConfirmed(rows,payload)){const message='The updated status could not be confirmed. Refresh this view before trying again.';setError(message);return {ok:false,error:message}}return {ok:true}}finally{saving.current=false}}
 if(!a||!active)return <div className="live-empty"><h2>Shared work is no longer available.</h2><p>An active mutual match is required to view these examples.</p></div>;
 return <section className="application-work-evidence"><span className="eyebrow">{a.side==='candidate'?a.job.companyName:a.candidate.name} · {a.job.title}</span><div className="live-between"><h2>Shared work examples</h2><button className="text-link" onClick={()=>void load()} disabled={busy}><RefreshCw size={15}/>Refresh shared work</button></div><p className="live-muted">Only examples explicitly shared for this application appear here. Checks and follow-up questions stay with this application.</p>{error&&<p role="alert" className="live-error">{error}</p>}{shares===null&&!error?<p role="status">Loading shared work…</p>:shares?.length?shares.map(share=><SharedWorkExample key={share.id} share={share} candidate={a.side==='candidate'} busy={busy} onSave={save}/>):!error&&<p>No work examples are currently shared for this application.</p>}{a.side==='candidate'&&<button className="outline-btn" onClick={onShare} disabled={busy}>Choose work examples to share<ArrowRight size={15}/></button>}</section>;
}
