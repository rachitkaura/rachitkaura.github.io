import {createMarket} from './live-server';
import {SWIPE_UNDO_MS} from './interest-outbox';
type Row=Record<string,any>;
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
const view=(r:Row)=>({id:r.id,actorId:r.user_id,companyId:r.company_id,label:r.label,payload:JSON.parse(r.payload),dueAt:r.due_at,state:r.state,error:r.error||undefined});

export function createSwipeServer(db:D1Database,options:{adminEmails?:string;clock?:()=>number;sleep?:(ms:number)=>Promise<void>}={}){
 const clock=options.clock||Date.now,sleep=options.sleep||(ms=>new Promise(resolve=>setTimeout(resolve,ms)));
 const q=(sql:string,...args:any[])=>db.prepare(sql).bind(...args);
 async function process(id?:string){
  // A lease makes concurrent background invocations safe; accepted actions survive browser shutdown.
  await q("UPDATE pending_swipes SET state='queued' WHERE state='sending' AND updated_at<?",clock()-60000).run();
  const rows=(await q("SELECT * FROM pending_swipes WHERE state='queued' AND due_at<=?"+(id?' AND id=?':'')+' ORDER BY due_at LIMIT 10',clock(),...(id?[id]:[])).all<Row>()).results||[];
  for(const r of rows){
   const claim=await q("UPDATE pending_swipes SET state='sending',updated_at=? WHERE id=? AND state='queued' AND due_at<=?",clock(),r.id,clock()).run();if(!claim.meta.changes)continue;
   try{
    const actor=JSON.parse(r.actor),headers=new Headers({...actor,origin:r.origin,'Content-Type':'application/json'});
    const response=await createMarket(db,fetch,{adminEmails:options.adminEmails}).POST(new Request(r.origin+'/api/live',{method:'POST',headers,body:r.payload}));
    const result=await response.json() as Row;
    await q('UPDATE pending_swipes SET state=?,error=?,updated_at=? WHERE id=?',response.ok?'sent':'failed',response.ok?'':String(result.error||'Could not send this swipe.').slice(0,500),clock(),r.id).run();
   }catch{await q("UPDATE pending_swipes SET state='failed',error=?,updated_at=? WHERE id=?",'Could not confirm this swipe. Check Applications before retrying.',clock(),r.id).run()}
  }
 }
 async function afterUndo(id:string){const r=await q('SELECT due_at FROM pending_swipes WHERE id=?',id).first<Row>();if(!r)return;await sleep(Math.max(0,r.due_at-clock()));await process(id)}
 async function handle(req:Request,waitUntil:(task:Promise<unknown>)=>void){
  const uid=req.headers.get('oai-authenticated-user-id');if(!uid)return json({error:'Sign in to send or undo a swipe.'},401);
  if(req.method==='GET'){
   await process();
   const rows=(await q("SELECT * FROM pending_swipes WHERE user_id=? AND (state IN ('queued','sending','failed') OR updated_at>?) ORDER BY created_at DESC LIMIT 100",uid,clock()-86400000).all<Row>()).results||[];
   return json({entries:rows.map(view),actorId:uid,serverNow:clock()});
  }
  if(req.method!=='POST')return json({error:'Method not allowed.'},405);
  if(req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Same-origin requests required.'},403);
  if(Number(req.headers.get('content-length')||0)>20000)return json({error:'Swipe is too large.'},413);
  const raw=await req.text();if(raw.length>20000)return json({error:'Swipe is too large.'},413);
  let b:Row;try{b=JSON.parse(raw)}catch{return json({error:'Invalid swipe.'},400)}
  if(b.action==='undo'||b.action==='dismiss'){
   if(typeof b.id!=='string')return json({error:'Choose a swipe.'},400);
   if(b.action==='dismiss'&&!await q('SELECT id FROM pending_swipes WHERE id=? AND user_id=?',b.id,uid).first())return json({ok:true});
   const r=await q(b.action==='undo'?"UPDATE pending_swipes SET state='cancelled',updated_at=? WHERE id=? AND user_id=? AND state='queued' AND due_at>?":"DELETE FROM pending_swipes WHERE updated_at<=? AND id=? AND user_id=? AND state='failed'",b.action==='undo'?clock():clock(),b.id,uid,...(b.action==='undo'?[clock()]:[])).run();
   return r.meta.changes?json({ok:true}):json({error:b.action==='undo'?'The undo window ended. Check Applications for the current status.':'This swipe cannot be dismissed.'},409);
  }
  if(b.action!=='queue'||b.actorId!==uid||typeof b.id!=='string'||b.id.length>100||typeof b.label!=='string'||b.label.length>250)return json({error:'Invalid swipe or account changed.'},400);
  const p=b.payload;if(p?.action!=='interest'||!['candidate','employer'].includes(p.side)||typeof p.jobId!=='string'||p.jobId.length>100||(p.side==='employer'&&typeof p.candidateId!=='string'))return json({error:'Choose a role and candidate.'},400);
  const prior=await q('SELECT * FROM pending_swipes WHERE id=?',b.id).first<Row>();
  if(prior){if(prior.user_id!==uid)return json({error:'Swipe access denied.'},403);if(prior.state!=='failed')return json({entry:view(prior),serverNow:clock()})}
  const live=await createMarket(db,fetch,{adminEmails:options.adminEmails}).GET(new Request(new URL('/api/live'+(b.companyId?'?companyId='+encodeURIComponent(b.companyId):''),req.url),{headers:req.headers}));
  const data=await live.json() as Row;if(!live.ok)return live;
  const job=(p.side==='candidate'?data.jobs||[]:data.companyJobs||[]).find((j:Row)=>j.id===p.jobId&&j.active);if(!job||p.side==='candidate'&&!data.profile)return json({error:'Refresh the open role and your profile before swiping.'},409);
  const count=await q("SELECT COUNT(*) n FROM pending_swipes WHERE user_id=? AND state IN ('queued','sending')",uid).first<Row>();if((count?.n||0)>=50)return json({error:'Let your pending swipes finish before adding more.'},429);
  const actor=Object.fromEntries(['oai-authenticated-user-id','oai-authenticated-user-email','oai-authenticated-user-full-name','oai-authenticated-user-full-name-encoding'].map(k=>[k,req.headers.get(k)||'']));
  const time=clock(),due=time+SWIPE_UNDO_MS;
  await q("INSERT INTO pending_swipes(id,user_id,actor,origin,payload,label,company_id,due_at,state,error,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,'queued','',?,?) ON CONFLICT(id) DO UPDATE SET state='queued',error='',payload=excluded.payload,due_at=excluded.due_at,updated_at=excluded.updated_at WHERE pending_swipes.user_id=excluded.user_id AND pending_swipes.state='failed'",b.id,uid,JSON.stringify(actor),new URL(req.url).origin,JSON.stringify(p),b.label,job.companyId,due,time,time).run();
  waitUntil(afterUndo(b.id));
  return json({entry:view((await q('SELECT * FROM pending_swipes WHERE id=?',b.id).first<Row>())!),serverNow:clock()},202);
 }
 return {handle,process,afterUndo};
}
