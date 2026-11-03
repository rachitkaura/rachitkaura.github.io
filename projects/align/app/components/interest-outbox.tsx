'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {createRemoteOutbox} from '../lib/remote-outbox';
import {AlertCircle,ChevronUp,Clock,Heart,LoaderCircle,RotateCcw,X} from 'lucide-react';
import {createInterestOutbox,type PendingInterest,type QueueInterest} from '../lib/interest-outbox';
import {swipeFeedback} from '../lib/swipe-feedback';
import {focusWithoutScrolling,lockPageScroll} from '../lib/scroll';

export function useInterestOutbox({request,isDemo,onSent,onUndo}:{request:typeof fetch;isDemo:boolean;onSent:(entry:PendingInterest)=>void;onUndo:()=>void}){
 const [entries,setEntries]=useState<PendingInterest[]>([]),engine=useRef<ReturnType<typeof createInterestOutbox>|ReturnType<typeof createRemoteOutbox>|null>(null),callbacks=useRef({onSent,onUndo,request});callbacks.current={onSent,onUndo,request};
 useEffect(()=>{let storage:Storage|undefined;try{storage=localStorage}catch{}const key=isDemo?'align-demo-pending-swipes-v1':'align-live-pending-swipes-v1',outbox=isDemo?createInterestOutbox({key,storage,request:(input,init)=>callbacks.current.request(input,init),onChange:setEntries,onSent:entry=>callbacks.current.onSent(entry)}):createRemoteOutbox({request:(input,init)=>callbacks.current.request(input,init),onChange:setEntries,onSent:entry=>callbacks.current.onSent(entry)});const sync=(event:StorageEvent)=>{if(event.key===key||event.key===null)outbox.sync()};engine.current=outbox;outbox.start();window.addEventListener('storage',sync);return()=>{window.removeEventListener('storage',sync);outbox.stop();engine.current=null}},[isDemo]);
 return {entries,enqueue:(input:QueueInterest)=>Boolean(engine.current?.enqueue(input)),undo:async(id:string)=>{const undone=Boolean(await engine.current?.undo(id));if(undone)callbacks.current.onUndo();return undone},retry:(id:string)=>engine.current?.retry(id),dismiss:(id:string)=>engine.current?.dismiss(id),clear:()=>engine.current?.clearQueued()};
}
type Actions={onUndo:(id:string)=>unknown;onRetry:(id:string)=>unknown;onDismiss:(id:string)=>unknown};
export function InterestOutboxPanel({entries,onUndo,onRetry,onDismiss,mobileDock}:{entries:PendingInterest[];mobileDock?:HTMLElement|null}&Actions){
 const [now,setNow]=useState(Date.now()),[expanded,setExpanded]=useState(false),[queueOpen,setQueueOpen]=useState(false),[busyIds,setBusyIds]=useState<string[]>([]),[announcement,setAnnouncement]=useState('');
 const running=useRef(new Set<string>()),opener=useRef<HTMLElement|null>(null);
 const closeQueue=useCallback(()=>setQueueOpen(false),[]);
 useEffect(()=>{if(!entries.length)return;setNow(Date.now());const t=setInterval(()=>setNow(Date.now()),250);return()=>clearInterval(t)},[entries.length]);
 useEffect(()=>{if(!entries.length){setQueueOpen(false);setExpanded(false)}},[entries.length]);
 const feedback=swipeFeedback(entries,Math.max(now,Date.now()));
 async function perform(kind:keyof Actions,id:string){
  if(running.current.has(id))return;running.current.add(id);setBusyIds(Array.from(running.current));setAnnouncement('');
  try{const result=await ({onUndo,onRetry,onDismiss}[kind])(id);if(kind==='onUndo'&&result===true)setAnnouncement('Swipe undone. Nothing was sent.')}finally{running.current.delete(id);setBusyIds(Array.from(running.current))}
 }
 const actions:Actions={onUndo:id=>perform('onUndo',id),onRetry:id=>perform('onRetry',id),onDismiss:id=>perform('onDismiss',id)};
 function openQueue(){opener.current=document.activeElement as HTMLElement;setQueueOpen(true)}
 const bar=feedback.latest?<aside className={'ux-mobile-swipe-feedback '+(mobileDock?'is-docked':'is-global')} aria-label="Swipe undo">
  <div className="ux-mobile-swipe-inner">
  <div className="ux-mobile-swipe-status"><b>{feedback.status}</b><small>{feedback.latest.label}</small></div>
  {feedback.pendingCount>0&&<button className="ux-mobile-swipe-undo" aria-label={'Undo swipe for '+feedback.latest.label} disabled={!feedback.canUndo||busyIds.includes(feedback.latest.id)} onClick={()=>void actions.onUndo(feedback.latest!.id)}>{feedback.latest.state==='saving'||busyIds.includes(feedback.latest.id)?<LoaderCircle size={15} className="spinning"/>:<RotateCcw size={15}/>}Undo{feedback.canUndo&&<span className="ux-swipe-remaining" aria-hidden="true">{feedback.remaining}s</span>}</button>}
  <button className={'ux-mobile-swipe-queue'+(feedback.attentionCount?' has-issues':'')} aria-label={`View ${entries.length} pending ${entries.length===1?'swipe':'swipes'}${feedback.attentionCount?`; ${feedback.attentionCount} need attention`:''}`} aria-haspopup="dialog" aria-expanded={queueOpen} onClick={openQueue}>{feedback.attentionCount?<><AlertCircle size={14}/><span>{feedback.attentionCount} {feedback.attentionCount===1?'issue':'issues'}</span></>:<><Clock size={14}/><span>{entries.length}</span><span className="ux-pending-word">pending</span></>}<ChevronUp size={13}/></button>
  </div><div className="ux-mobile-swipe-progress" aria-hidden="true"><span style={{width:feedback.progress+'%'}}/></div>
 </aside>:null;
 return <>
  <span className="sr-only" role="status">{`${entries.length} pending ${entries.length===1?'swipe':'swipes'}${feedback.attentionCount?`; ${feedback.attentionCount} need attention`:''}.`}</span>
  <span className="sr-only" role="status">{announcement}</span>
  {entries.length>0&&<aside className={'ux-interest-outbox'+(mobileDock?' is-docked':'')} aria-label="Pending swipes"><div className="ux-outbox-heading"><span><Heart size={17}/>Pending swipes</span><small>10 seconds to undo</small></div><p className="ux-outbox-help">Your swipe is held here before it is sent.</p>{(expanded?entries:feedback.latest?[feedback.latest]:[]).map(entry=><OutboxItem key={entry.id} entry={entry} now={now} busy={busyIds.includes(entry.id)} {...actions}/>)}{entries.length>1&&<button className="ux-outbox-expand" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}><Clock size={15}/>{expanded?'Show fewer':`See all ${entries.length} pending swipes`}{feedback.attentionCount?` · ${feedback.attentionCount} need attention`:''}</button>}</aside>}
  {mobileDock?createPortal(bar,mobileDock):bar}
  {queueOpen&&entries.length>0&&<MobileSwipeQueue entries={entries} now={now} busyIds={busyIds} onClose={closeQueue} opener={opener.current} {...actions}/>}
 </>;
}

function OutboxItem({entry,now,busy,...actions}:{entry:PendingInterest;now:number;busy:boolean}&Actions){
 const status=swipeFeedback([entry],Math.max(now,Date.now()));
 return <div className="ux-outbox-item"><div><b>{entry.label}</b><small>{entry.payload.side==='employer'?'Hiring team':'Candidate'} · {status.status}</small>{entry.error&&<><p role="alert">{entry.error}</p><small>Review the card to update details, or retry this saved swipe.</small></>}</div>{entry.state==='failed'?<div className="ux-outbox-recovery"><button disabled={busy} onClick={()=>void actions.onRetry(entry.id)}>Retry</button><button disabled={busy} aria-label={'Dismiss failed swipe for '+entry.label} onClick={()=>void actions.onDismiss(entry.id)}><X size={16}/></button></div>:<button aria-label={'Undo swipe for '+entry.label} disabled={busy||!status.canUndo} onClick={()=>void actions.onUndo(entry.id)}>{entry.state==='saving'||busy?<LoaderCircle size={16} className="spinning"/>:<RotateCcw size={16}/>}{entry.state==='saving'?'Saving':'Undo'}{status.canUndo&&<span aria-hidden="true"> {status.remaining}s</span>}</button>}</div>;
}

function MobileSwipeQueue({entries,now,busyIds,onClose,opener,...actions}:{entries:PendingInterest[];now:number;busyIds:string[];onClose:()=>void;opener:HTMLElement|null}&Actions){
 const sheet=useRef<HTMLElement>(null);
 useEffect(()=>{
  const release=lockPageScroll();
  const controls=()=>Array.from(sheet.current?.querySelectorAll<HTMLElement>('button:not([disabled])')||[]);
  focusWithoutScrolling(controls()[0]);
  function key(event:KeyboardEvent){if(event.key==='Escape'){event.preventDefault();onClose()}if(event.key==='Tab'){const list=controls(),first=list[0],last=list.at(-1);if(!sheet.current?.contains(document.activeElement)){event.preventDefault();focusWithoutScrolling(first)}else if(event.shiftKey&&document.activeElement===first){event.preventDefault();focusWithoutScrolling(last)}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();focusWithoutScrolling(first)}}}
  document.addEventListener('keydown',key);
  return()=>{release();document.removeEventListener('keydown',key);focusWithoutScrolling(opener?.isConnected?opener:document.querySelector<HTMLElement>('.ux-mobile-swipe-queue')||document.querySelector<HTMLElement>('.ux-swipe-card')||document.getElementById('main-content'))};
 },[onClose,opener]);
 useEffect(()=>{if(!sheet.current?.contains(document.activeElement))focusWithoutScrolling(sheet.current?.querySelector<HTMLElement>('button'))},[entries.length]);
 const ordered=[...entries].sort((a,b)=>Number(Boolean(b.error)||b.state==='failed')-Number(Boolean(a.error)||a.state==='failed')||b.dueAt-a.dueAt);
 return <div className="ux-undo-sheet-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><section className="ux-undo-sheet" ref={sheet} role="dialog" aria-modal="true" aria-label="Pending swipes" aria-describedby="swipe-queue-explanation"><header><div><h2>Pending swipes</h2><p id="swipe-queue-explanation">Each swipe has its own 10-second undo window. Opening this list keeps the timers running.</p></div><button className="icon-btn" aria-label="Close pending swipes" onClick={onClose}><X size={20}/></button></header><div className="ux-undo-sheet-list">{ordered.map(entry=><OutboxItem key={entry.id} entry={entry} now={now} busy={busyIds.includes(entry.id)} {...actions}/>)}</div><button className="outline-btn ux-undo-sheet-done" onClick={onClose}>Back to what I was doing</button></section></div>;
}
