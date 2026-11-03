import type {WorkspaceMode} from './workspace-navigation';
export const SWIPE_UNDO_MS=10_000;
export type InterestPayload={action:'interest';side:WorkspaceMode;jobId:string;candidateId?:string;answers?:Record<string,string>;profileVersion?:string;roleVersion?:string;materialSelection?:import('./profile-materials').MaterialSelection;review?:{batchId:string;consent:boolean;allowWaitlist:boolean}};
export type PendingInterest={id:string;actorId:string;companyId?:string;label:string;payload:InterestPayload;dueAt:number;state:'saving'|'queued'|'sending'|'failed';error?:string};
export type QueueInterest=Omit<PendingInterest,'id'|'dueAt'|'state'|'error'>;
type StorageLike=Pick<Storage,'getItem'|'setItem'>;
type Options={request:typeof fetch;storage?:StorageLike;key:string;now?:()=>number;setTimer?:(fn:()=>void,ms:number)=>any;clearTimer?:(id:any)=>void;onChange?:(entries:PendingInterest[])=>void;onSent?:(entry:PendingInterest)=>void};
export function createInterestOutbox(options:Options){
 const now=options.now||Date.now,setTimer=options.setTimer||setTimeout,clearTimer=options.clearTimer||clearTimeout;
 let entries:PendingInterest[]=[],timer:any,active=false,stopped=true,storageAvailable=Boolean(options.storage);
 function stored(restoring=false):PendingInterest[]|undefined{if(!storageAvailable)return;try{const saved=JSON.parse(options.storage!.getItem(options.key)||'[]');if(Array.isArray(saved))return saved.filter(e=>e&&typeof e.id==='string'&&typeof e.actorId==='string'&&typeof e.label==='string'&&e.payload?.action==='interest'&&['candidate','employer'].includes(e.payload.side)&&typeof e.payload.jobId==='string'&&Number.isFinite(e.dueAt)).slice(-100).map(e=>({...e,state:e.state==='failed'||e.dueAt<now()-86400000?'failed':!restoring&&e.state==='sending'?'sending':'queued',error:e.dueAt<now()-86400000?'This pending swipe expired. Retry when you are ready.':e.error}));}catch{storageAvailable=false}}
 entries=stored(true)||[];
 const snapshot=()=>structuredClone(entries);
 function changed(){try{if(storageAvailable)options.storage!.setItem(options.key,JSON.stringify(entries))}catch{storageAvailable=false}options.onChange?.(snapshot())}
 function sync(){const saved=stored();if(saved){entries=saved;options.onChange?.(snapshot());schedule()}}
 function schedule(){clearTimer(timer);if(stopped||active)return;const next=entries.filter(e=>e.state==='queued').sort((a,b)=>a.dueAt-b.dueAt)[0];if(next)timer=setTimer(()=>{void drain()},Math.max(0,next.dueAt-now()))}
 async function drain(){
  if(active||stopped)return;active=true;sync();
  try{while(!stopped){const entry=entries.find(e=>e.state==='queued'&&e.dueAt<=now());if(!entry)break;entry.state='sending';changed();try{
   const identity=await options.request('/api/live',{cache:'no-store'}),account=await identity.json() as Record<string,any>;
   if(!identity.ok||!account.signedIn||account.user?.id!==entry.actorId)throw Error('Your account changed. Sign in to the original account before retrying this swipe.');
   const response=await options.request('/api/live',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(entry.payload)}),result=await response.json() as Record<string,any>;
   if(!response.ok)throw Error(result.error||'Could not send this swipe.');
   sync();entries=entries.filter(e=>e.id!==entry.id);changed();options.onSent?.(structuredClone(entry));
  }catch(error:any){sync();entries=entries.map(e=>e.id===entry.id?{...e,state:'failed',error:['TypeError','SyntaxError'].includes(error?.name)?'Could not confirm this swipe. Check Applications before retrying.':error?.message||'Could not confirm this swipe. Check Applications before retrying.'}:e);changed()}}
  }finally{active=false;schedule()}
 }
 return {
  snapshot,
  sync,
  flush:drain,
  start(){stopped=false;changed();schedule()},
  stop(){stopped=true;clearTimer(timer)},
  enqueue(input:QueueInterest){
   sync();
   if(!input.actorId||!input.payload.jobId||input.payload.side==='employer'&&!input.payload.candidateId)return false;
   const duplicate=entries.find(e=>e.actorId===input.actorId&&e.payload.side===input.payload.side&&e.payload.jobId===input.payload.jobId&&e.payload.candidateId===input.payload.candidateId);if(duplicate){if(duplicate.state==='failed'){Object.assign(duplicate,structuredClone(input),{state:'queued',dueAt:now()+SWIPE_UNDO_MS,error:undefined});changed();schedule()}return duplicate.id;}
   const id=globalThis.crypto?.randomUUID?.()||'swipe-'+now()+'-'+Math.random().toString(36).slice(2);
   entries.push({...structuredClone(input),id,dueAt:now()+SWIPE_UNDO_MS,state:'queued'});changed();schedule();return id;
  },
  undo(id:string){sync();const entry=entries.find(e=>e.id===id);if(!entry||entry.state!=='queued'||now()>=entry.dueAt)return false;entries=entries.filter(e=>e.id!==id);changed();schedule();return true},
  retry(id:string){sync();const entry=entries.find(e=>e.id===id);if(!entry||entry.state!=='failed')return false;entry.state='queued';entry.error=undefined;entry.dueAt=now()+SWIPE_UNDO_MS;changed();schedule();return true},
  dismiss(id:string){sync();const entry=entries.find(e=>e.id===id);if(!entry||entry.state!=='failed')return false;entries=entries.filter(e=>e.id!==id);changed();return true},
  clearQueued(){sync();entries=entries.filter(e=>e.state==='sending');changed();schedule()}
 };
}
