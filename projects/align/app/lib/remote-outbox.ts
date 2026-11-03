import type {PendingInterest,QueueInterest} from './interest-outbox';
type Remote=PendingInterest&{serverDueAt?:number};
export function createRemoteOutbox(options:{request:typeof fetch;onChange:(entries:PendingInterest[])=>void;onSent:(entry:PendingInterest)=>void}){
 let entries:Remote[]=[],timer:ReturnType<typeof setTimeout>|undefined,stopped=true,reading=false;
 const receipts=new Set<string>();
 const changed=()=>options.onChange(structuredClone(entries));
 async function read(){if(stopped||reading)return;reading=true;try{const r=await options.request('/api/swipes',{cache:'no-store'});if(r.status===401){entries=[];changed();return}if(!r.ok)return;const data=await r.json() as any;
  const local=entries.filter(e=>(!data.actorId||e.actorId===data.actorId)&&(e.state==='saving'||e.state==='failed'&&!e.serverDueAt));
  const remote:Remote[]=[];
  for(const row of data.entries||[]){if(row.state==='sent'){if(entries.some(e=>e.id===row.id)&&!receipts.has(row.id)){receipts.add(row.id);options.onSent(row)}continue}if(row.state==='cancelled')continue;remote.push({...row,serverDueAt:row.dueAt,dueAt:Date.now()+Math.max(0,row.dueAt-data.serverNow)})}
  // A lost POST response must reconcile to a sent/cancelled receipt, not resurrect a local failure.
  const knownIds=new Set((data.entries||[]).map((r:any)=>r.id));
  entries=[...remote,...local.filter(e=>!knownIds.has(e.id))];changed();
 }catch{}finally{reading=false;clearTimeout(timer);if(!stopped)timer=setTimeout(read,entries.length?800:5000)}}
 async function queue(entry:Remote){try{const r=await options.request('/api/swipes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'queue',...entry})});const d=await r.json() as any;if(!r.ok)throw Error(d.error||'Could not save this swipe.');entries=entries.map(e=>e.id===entry.id?{...d.entry,serverDueAt:d.entry.dueAt,dueAt:Date.now()+Math.max(0,d.entry.dueAt-d.serverNow)}:e);changed();void read()}catch(e:any){entries=entries.map(x=>x.id===entry.id?{...x,state:'failed',error:e.message||'Swipe was not saved. Retry when connected.'}:x);changed()}}
 return {snapshot:()=>structuredClone(entries),sync:()=>void read(),start(){stopped=false;void read()},stop(){stopped=true;clearTimeout(timer)},
  enqueue(input:QueueInterest){if(entries.some(e=>e.actorId===input.actorId&&e.payload.side===input.payload.side&&e.payload.jobId===input.payload.jobId&&e.payload.candidateId===input.payload.candidateId&&e.state!=='failed'))return false;const e:Remote={...input,id:crypto.randomUUID(),dueAt:Date.now()+10000,state:'saving'};entries.push(e);changed();void queue(e);return e.id},
  async undo(id:string){const e=entries.find(e=>e.id===id);if(!e||e.state!=='queued')return false;try{const r=await options.request('/api/swipes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'undo',id})});if(!r.ok){void read();return false}entries=entries.filter(e=>e.id!==id);changed();return true}catch{e.error='Undo could not be confirmed. Reconnect and check Applications.';changed();return false}},
  retry(id:string){const e=entries.find(e=>e.id===id);if(!e||e.state!=='failed')return false;e.state='saving';e.error=undefined;changed();void queue(e);return true},
  async dismiss(id:string){const e=entries.find(e=>e.id===id);if(!e||e.state!=='failed')return false;try{const r=await options.request('/api/swipes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'dismiss',id})});if(r.ok){entries=entries.filter(e=>e.id!==id);changed();return true}void read();return false}catch{e.error='Could not confirm dismissal. Reconnect and try again.';changed();return false}},clearQueued(){/* Live swipes require an individually confirmed Undo. */}
 };
}
