import {cancelReviewPlace,matchReviewStatements,readReviewBatches} from './review-queue';
import {createMarket} from './live-server';
import {normalizeProjectCard,normalizeEvidenceCheck,evidenceChecksForView} from './project-evidence';
type R=Record<string,any>;
const parse=(s:string)=>JSON.parse(s||'{}');
const reply=(d:any,status=200)=>Response.json(d,{status,headers:{'Cache-Control':'private, no-store'}});
class Fault extends Error{constructor(message:string,public status=400){super(message)}}
const str=(v:any,max=2000,min=1)=>{if(typeof v!=='string'||v.trim().length<min||v.length>max)throw new Fault(`Enter between ${min} and ${max} characters.`);return v.trim()};
const stamp=()=>new Date().toISOString();
export function createWorkflows(db:D1Database,options:{adminEmails?:string}={}){
 const q=(sql:string,...args:any[])=>db.prepare(sql).bind(...args),one=(sql:string,...args:any[])=>q(sql,...args).first<R>(),all=async(sql:string,...args:any[])=>(await q(sql,...args).all<R>()).results;
 const run=(sql:string,...args:any[])=>q(sql,...args).run();
 async function member(uid:string,cid:string,owner=false){const m=await one('SELECT m.*,c.verified_at,c.review_status FROM live_members m JOIN live_companies c ON c.id=m.company_id WHERE m.user_id=? AND m.company_id=?',uid,cid);if(!m||(owner&&m.role!=='owner'))throw new Fault('Company access denied.',403);return m}
 async function role(uid:string,jid:string){const j=await one('SELECT * FROM live_jobs WHERE id=?',jid);if(!j)throw new Fault('Role not found.',404);await member(uid,j.company_id);return j}
 async function profileForCompany(uid:string,cid:string){const p=await one('SELECT * FROM live_profiles WHERE user_id=?',uid),c=await one('SELECT * FROM live_companies WHERE id=?',cid);if(!p||!c)throw new Fault('Create a live profile first.');const privacy=parse(p.privacy);if((privacy.hiddenCompanies||[]).includes(cid)||(privacy.hiddenDomains||[]).includes(c.domain))throw new Fault('This company is blocked in your privacy settings.',403);return p}
 async function allowedApplication(req:Request,aid:string){const res=await createMarket(db,fetch,options).GET(new Request(new URL('/api/live',req.url),{headers:req.headers}));if(!res.ok)throw new Fault('Application access denied.',403);const data:any=await res.json();const a=data.applications.find((x:R)=>x.id===aid);if(!a||['withdrawn','closed'].includes(a.stage))throw new Fault('Active application access required.',403);return a}
 return async(req:Request)=>{try{
  const uid=req.headers.get('oai-authenticated-user-id');if(!uid)throw new Fault('Sign in to use these workflows.',401);
  if(req.method==='GET'){
   const url=new URL(req.url),cid=url.searchParams.get('companyId'),aid=url.searchParams.get('applicationId');if(aid&&aid.length>100)throw new Fault('Choose an application.');if(cid)await member(uid,cid);
   const cards=aid?[]:await all('SELECT * FROM proof_cards WHERE user_id=? ORDER BY updated_at DESC LIMIT 100',uid);
   const live=await createMarket(db,fetch,options).GET(new Request(new URL('/api/live'+(cid?'?companyId='+encodeURIComponent(cid):''),req.url),{headers:req.headers}));const ld:any=await live.json();
   const appMap=new Map<string,R>((ld.applications||[]).filter((a:R)=>a.candidateInterest&&a.employerInterest&&!['closed','withdrawn'].includes(a.stage)&&(cid?a.side==='employer'&&a.companyId===cid:a.side==='candidate')).map((a:R)=>[a.id,a]));
   if(aid&&!appMap.has(aid))throw new Fault('Active matched application access required.',403);
   const shares=cid?await all('SELECT s.*,p.data,p.user_id,p.updated_at AS card_updated_at FROM proof_shares s JOIN proof_cards p ON p.id=s.card_id JOIN live_applications a ON a.id=s.application_id WHERE a.company_id=?'+(aid?' AND s.application_id=?':'')+' ORDER BY s.updated_at DESC LIMIT 500',cid,...(aid?[aid]:[])):await all('SELECT s.*,p.data,p.user_id,p.updated_at AS card_updated_at FROM proof_shares s JOIN proof_cards p ON p.id=s.card_id WHERE p.user_id=?'+(aid?' AND s.application_id=?':'')+' ORDER BY s.updated_at DESC LIMIT 500',uid,...(aid?[aid]:[]));
   const visibleBatches=aid?[]:await readReviewBatches(db,uid,cid||undefined);
   const calibrations=cid&&!aid?await all('SELECT k.*,j.data AS current_data FROM hiring_calibrations k JOIN live_jobs j ON j.id=k.job_id WHERE j.company_id=? ORDER BY k.version DESC LIMIT 100',cid):[];
   const calibrationRows=[];
   for(const k of calibrations){const d=parse(k.data),votes=await all('SELECT user_id,data,created_at FROM calibration_votes WHERE calibration_id=?',k.id),complete=d.reviewers.every((u:string)=>votes.some(v=>v.user_id===u));calibrationRows.push({id:k.id,jobId:k.job_id,version:k.version,status:k.status,stale:k.job_data!==k.current_data,createdAt:k.created_at,approvedAt:k.approved_at,...d,votes:votes.filter(v=>complete||v.user_id===uid).map(v=>({userId:v.user_id,data:parse(v.data)})),submitted:votes.map(v=>v.user_id),complete})}
   return reply({userId:uid,cards:cards.map(c=>({id:c.id,...parse(c.data),updatedAt:c.updated_at})),shares:shares.filter(s=>appMap.has(s.application_id)).map(s=>({id:s.id,cardId:s.card_id,applicationId:s.application_id,card:{...parse(s.data),id:s.card_id,updatedAt:s.card_updated_at},checks:evidenceChecksForView(JSON.parse(s.checks||'[]')),review:s.review,question:s.question,updatedAt:s.updated_at,application:appMap.get(s.application_id)})),batches:visibleBatches,calibrations:calibrationRows});
  }
  if(req.method!=='POST')throw new Fault('Method not allowed.',405);
  if(req.headers.get('origin')!==new URL(req.url).origin)throw new Fault('Same-origin requests required.',403);
  if(Number(req.headers.get('content-length')||0)>30000)throw new Fault('Request too large.',413);
  const raw=await req.text();if(raw.length>30000)throw new Fault('Request too large.',413);const b=parse(raw),time=stamp(),uuid=crypto.randomUUID();
  switch(b.action){
   case 'card':{
    if(!await one('SELECT id FROM live_profiles WHERE user_id=?',uid))throw new Fault('Create a live profile in Preferences first.');
    const data=JSON.stringify({...normalizeProjectCard(b),revision:uuid});
    if(b.id){const c=await one('SELECT * FROM proof_cards WHERE id=? AND user_id=?',str(b.id,100),uid);if(!c)throw new Fault('Card access denied.',403);const cardTime=new Date(Math.max(Date.now(),Date.parse(c.updated_at)+1)).toISOString();await db.batch([q("UPDATE live_profiles SET data=json_remove(data,'$.featuredExample'),updated_at=? WHERE user_id=? AND json_extract(data,'$.featuredExample.cardId')=?",time,uid,c.id),q('UPDATE proof_cards SET data=?,updated_at=? WHERE id=? AND user_id=?',data,cardTime,c.id,uid),q("UPDATE proof_shares SET review='',question='',checks='[]',reviewed_by=NULL,updated_at=? WHERE card_id=?",time,c.id)])}
    else{if((await all('SELECT id FROM proof_cards WHERE user_id=?',uid)).length>=100)throw new Fault('You can keep up to 100 cards.');await run('INSERT INTO proof_cards(id,user_id,data,updated_at) VALUES(?,?,?,?)',uuid,uid,data,time)}break;
   }
   case 'deleteCard':{const c=await one('SELECT id FROM proof_cards WHERE id=? AND user_id=?',str(b.cardId,100),uid);if(!c)throw new Fault('Card access denied.',403);await db.batch([q("UPDATE live_profiles SET data=json_remove(data,'$.featuredExample'),updated_at=? WHERE user_id=? AND json_extract(data,'$.featuredExample.cardId')=?",time,uid,c.id),q('DELETE FROM proof_shares WHERE card_id=?',c.id),q('DELETE FROM proof_cards WHERE id=? AND user_id=?',c.id,uid)]);break}
   case 'share':{
    const c=await one('SELECT * FROM proof_cards WHERE id=? AND user_id=?',str(b.cardId,100),uid);if(!c)throw new Fault('Card access denied.',403);const a=await allowedApplication(req,str(b.applicationId,100));if(a.side!=='candidate')throw new Fault('Only the candidate can share evidence.',403);if(!a.candidateInterest||!a.employerInterest)throw new Fault('A mutual match is required before sharing work examples.',409);await profileForCompany(uid,a.companyId);
    await run('INSERT INTO proof_shares(id,card_id,application_id,updated_at) VALUES(?,?,?,?) ON CONFLICT(card_id,application_id) DO NOTHING',uuid,c.id,a.id,time);break;
   }
   case 'unshare':{const s=await one('SELECT s.id FROM proof_shares s JOIN proof_cards p ON p.id=s.card_id WHERE s.id=? AND p.user_id=?',str(b.shareId,100),uid);if(!s)throw new Fault('Share access denied.',403);await run('DELETE FROM proof_shares WHERE id=?',s.id);break}
   case 'reviewProof':{const s=await one('SELECT * FROM proof_shares WHERE id=?',str(b.shareId,100));if(!s)throw new Fault('Share not found.',404);const a=await allowedApplication(req,s.application_id);if(a.side!=='employer')throw new Fault('Hiring team access required.',403);if(!['Reviewed — discuss in interview','Follow-up requested'].includes(b.review))throw new Fault('Choose a review status.');const question=str(b.question||'',1200,b.review==='Follow-up requested'?20:0);await run('UPDATE proof_shares SET review=?,question=?,reviewed_by=?,updated_at=? WHERE id=?',b.review,question,uid,time,s.id);break}
   case 'evidenceCheck':case 'removeEvidenceCheck':{
    const s=await one('SELECT s.*,p.updated_at AS card_version,p.data AS card_data FROM proof_shares s JOIN proof_cards p ON p.id=s.card_id WHERE s.id=?',str(b.shareId,100));if(!s)throw new Fault('Share not found.',404);
    const a=await allowedApplication(req,s.application_id);if(a.side!=='employer'||!a.candidateInterest||!a.employerInterest)throw new Fault('An active matched hiring team is required.',403);
    const cardRevision=parse(s.card_data).revision||s.card_version;if(b.cardRevision!==cardRevision)throw new Fault('The candidate updated this example. Refresh and review the current version.',409);
    const previous=JSON.parse(s.checks||'[]') as R[];let checks:R[];
    if(b.action==='removeEvidenceCheck'){if(!previous.some(c=>c.kind===b.kind))throw new Fault('This check is no longer current. Refresh this view.',409);checks=previous.filter(c=>c.kind!==b.kind)}
    else{
     const check=normalizeEvidenceCheck(b);if(check.kind==='employment'&&parse(s.card_data).projectType==='simulation')throw new Fault('A simulation cannot establish employment.',400);
     let name=req.headers.get('oai-authenticated-user-full-name')||'Hiring team member';if(req.headers.get('oai-authenticated-user-full-name-encoding')==='percent-encoded-utf-8'){try{name=decodeURIComponent(name)}catch{name='Hiring team member'}}
     const c={...check,reviewerId:uid,checkedAt:time,checkedBy:{name:name.slice(0,120),team:a.job.companyName},cardRevision};checks=[...previous.filter(c=>c.kind!==check.kind),c];
    }
    const result=await run('UPDATE proof_shares SET checks=?,updated_at=? WHERE id=? AND checks=? AND EXISTS(SELECT 1 FROM proof_cards WHERE id=? AND updated_at=? AND data=?)',JSON.stringify(checks),time,s.id,s.checks||'[]',s.card_id,s.card_version,s.card_data);
    if(!result.meta.changes)throw new Fault('This example or its checks changed while saving. Refresh before trying again.',409);break;
   }
   case 'batch':{
    const j=await role(uid,str(b.jobId,100)),m=await member(uid,j.company_id);if(j.status!=='open'||j.expires_at<=time||!m.verified_at||m.review_status!=='approved')throw new Fault('Publish a verified role first.');
    const capacity=Number(b.capacity),deadline=new Date(b.deadline).toISOString();if(!Number.isInteger(capacity)||capacity<1||capacity>100||deadline<=time||Date.parse(deadline)>Date.now()+30*86400000)throw new Fault('Choose 1–100 places and a deadline within 30 days.');
    // The insertion itself checks pending obligations so simultaneous requests cannot open two batches.
    const r=await run("INSERT INTO review_batches(id,job_id,capacity,deadline,created_at) SELECT ?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM review_batches x WHERE x.job_id=? AND (x.deadline>? OR EXISTS(SELECT 1 FROM review_reservations r WHERE r.batch_id=x.id AND r.status IN ('reserved','waitlisted'))))",uuid,j.id,capacity,deadline,time,j.id,time);if(!r.meta.changes)throw new Fault('Complete the previous batch and its waitlist outcomes before opening another.',409);break;
   }
   case 'reserve':{
    const batch=await one('SELECT b.*,j.company_id,j.status AS job_status,j.expires_at,c.verified_at,c.review_status FROM review_batches b JOIN live_jobs j ON j.id=b.job_id JOIN live_companies c ON c.id=j.company_id WHERE b.id=?',str(b.batchId,100));if(!batch||batch.deadline<=time||batch.job_status!=='open'||batch.expires_at<=time||!batch.verified_at||batch.review_status!=='approved')throw new Fault('This review batch is no longer accepting reservations.',409);
    await profileForCompany(uid,batch.company_id);if(await one('SELECT id FROM live_members WHERE company_id=? AND user_id=?',batch.company_id,uid))throw new Fault('You cannot reserve at a company you manage.');
    const r=await run("INSERT INTO review_reservations(id,batch_id,user_id,status,created_at) SELECT ?,?,?,CASE WHEN (SELECT COUNT(*) FROM review_reservations WHERE batch_id=? AND (status='reserved' OR status='reviewed' AND outcome<>'No review place available'))<? THEN 'reserved' ELSE 'waitlisted' END,? WHERE NOT EXISTS(SELECT 1 FROM review_reservations WHERE batch_id=? AND user_id=?)",uuid,batch.id,uid,batch.id,batch.capacity,time,batch.id,uid);if(!r.meta.changes)throw new Fault('You already joined this batch.',409);break;
   }
   case 'cancelReservation':{
    const r=await one('SELECT * FROM review_reservations WHERE id=? AND user_id=?',str(b.reservationId,100),uid);if(!r||!['reserved','waitlisted'].includes(r.status))throw new Fault('Only a pending reservation can be cancelled.');
    await cancelReviewPlace(db,r.id,time);break;
   }
   case 'outcome':{
    const r=await one('SELECT r.*,b.job_id,b.deadline FROM review_reservations r JOIN review_batches b ON b.id=r.batch_id WHERE r.id=?',str(b.reservationId,100));if(!r)throw new Fault('Reservation not found.',404);const j=await role(uid,r.job_id);await profileForCompany(r.user_id,j.company_id);if(!['reserved','waitlisted'].includes(r.status))throw new Fault('This reservation is no longer pending.',409);
    if(!['Advance to conversation','Not progressing','No review place available'].includes(b.outcome))throw new Fault('Choose an outcome.');if(r.status==='waitlisted'&&b.outcome!=='No review place available')throw new Fault('Waitlisted candidates receive a no-place outcome; review reserved profiles first.');if(r.status==='reserved'&&b.outcome==='No review place available')throw new Fault('A reserved place requires a review outcome.');
    const note=str(b.note,2000,20),statements=[q("UPDATE review_reservations SET status='reviewed',outcome=?,note=?,reviewed_at=? WHERE id=? AND status IN ('reserved','waitlisted')",b.outcome,note,time,r.id)];
    if(b.outcome==='Advance to conversation'){
     const p=await profileForCompany(r.user_id,j.company_id),data={answers:{},history:[{stage:'interested',time,by:'Hiring team review'}]};
     statements.push(q("INSERT INTO live_applications(id,candidate_id,candidate_user_id,job_id,company_id,candidate_interest,employer_interest,stage,data,created_at,updated_at) SELECT ?,?,?,?,?,0,1,'interested',?,?,? WHERE EXISTS(SELECT 1 FROM review_reservations WHERE id=? AND status='reviewed' AND reviewed_at=?) ON CONFLICT(candidate_id,job_id) DO UPDATE SET employer_interest=1,updated_at=excluded.updated_at WHERE live_applications.stage NOT IN ('closed','withdrawn')",uuid,p.id,r.user_id,j.id,j.company_id,JSON.stringify(data),time,time,r.id,time),q("UPDATE live_applications SET stage='matched',updated_at=? WHERE job_id=? AND candidate_user_id=? AND candidate_interest=1 AND employer_interest=1 AND stage='interested'",time,j.id,r.user_id),...matchReviewStatements(db,j.id,r.user_id,time));
    }
    await db.batch(statements);
    const mutual=await one("SELECT id FROM live_applications WHERE job_id=? AND candidate_user_id=? AND candidate_interest=1 AND employer_interest=1 AND stage NOT IN ('closed','withdrawn')",j.id,r.user_id);
    if(mutual){const users=[{user_id:r.user_id},...await all('SELECT user_id FROM live_members WHERE company_id=? AND user_id IS NOT NULL',j.company_id)];await db.batch(users.map(u=>q('INSERT OR IGNORE INTO live_notifications(id,user_id,body,created_at) VALUES(?,?,?,?)',mutual.id+':match:'+u.user_id,u.user_id,`Mutual match for ${parse(j.data).title}. Your conversation is ready in Inbox.`,time)))}
    await run('INSERT OR IGNORE INTO live_notifications(id,user_id,body,created_at) VALUES(?,?,?,?)',r.id+':outcome',r.user_id,`${parse(j.data).title}: ${b.outcome}. ${mutual?'Your mutual match is ready in Inbox.':'Read the written outcome in Review status.'}`,time);break;
   }
   case 'startCalibration':{
    const j=await role(uid,str(b.jobId,100));await member(uid,j.company_id,true);const members=await all('SELECT user_id FROM live_members WHERE company_id=? AND user_id IS NOT NULL',j.company_id);
    const solo=members.length===1;if(!solo&&!members.some(m=>m.user_id===b.reviewerId&&m.user_id!==uid))throw new Fault('Choose a second joined teammate for independent review.');
    const reviewers=solo?[uid]:[uid,b.reviewerId];
    const profiles=[{id:'a',label:'Direct experience',summary:`Has worked directly with ${parse(j.data).skills.join(', ')}. Meets the posted work arrangement. Evidence: delivered a comparable project with a measurable result.`},{id:'b',label:'Transferable experience',summary:`Has solved a similar problem in an adjacent industry using transferable methods. Missing one posted tool; can explain the work and demonstrate learning. Meets the posted work arrangement.`},{id:'c',label:'Trainable gap',summary:`Has used the posted tools in a personal project but has limited evidence of owning an outcome. Needs structured onboarding and mentoring. Meets the posted work arrangement.`}];
    const prior=await one('SELECT version FROM hiring_calibrations WHERE job_id=? ORDER BY version DESC LIMIT 1',j.id);if(prior&&await one("SELECT id FROM hiring_calibrations WHERE job_id=? AND status='pending' AND job_data=?",j.id,j.data))throw new Fault('Complete the current calibration first.',409);
    await run("INSERT INTO hiring_calibrations(id,job_id,version,job_data,data,status,created_at) VALUES(?,?,?,?,?,'pending',?)",uuid,j.id,(prior?.version||0)+1,j.data,JSON.stringify({reviewers,solo,profiles}),time);break;
   }
   case 'vote':{
    const k=await one('SELECT * FROM hiring_calibrations WHERE id=?',str(b.calibrationId,100));if(!k)throw new Fault('Calibration not found.',404);const j=await role(uid,k.job_id),d=parse(k.data);if(k.status!=='pending'||k.job_data!==j.data||!d.reviewers.includes(uid))throw new Fault('This calibration cannot accept your review.',409);
    const votes=d.profiles.map((p:R)=>{const v=b.votes?.find((x:R)=>x.id===p.id);if(!v||!['Proceed','Discuss','Pass'].includes(v.decision))throw new Fault('Evaluate all three fictional profiles.');return {id:p.id,decision:v.decision,reason:str(v.reason,800,20)}});
    if(await one('SELECT id FROM calibration_votes WHERE calibration_id=? AND user_id=?',k.id,uid))throw new Fault('Your independent review is already submitted.',409);
    await run('INSERT INTO calibration_votes(id,calibration_id,user_id,data,created_at) VALUES(?,?,?,?,?)',uuid,k.id,uid,JSON.stringify({votes,essential:str(b.essential,1000,10),trainable:str(b.trainable,1000,10),transferable:str(b.transferable,1000,10)}),time);break;
   }
   case 'retireCalibration':{
    const k=await one('SELECT * FROM hiring_calibrations WHERE id=?',str(b.calibrationId,100));if(!k)throw new Fault('Calibration not found.',404);const j=await role(uid,k.job_id);await member(uid,j.company_id,true);await run("UPDATE hiring_calibrations SET status='superseded' WHERE id=? AND status='pending'",k.id);break;
   }
   case 'approveCalibration':{
    const k=await one('SELECT * FROM hiring_calibrations WHERE id=?',str(b.calibrationId,100));if(!k)throw new Fault('Calibration not found.',404);const j=await role(uid,k.job_id);await member(uid,j.company_id,true);const d=parse(k.data),votes=await all('SELECT user_id FROM calibration_votes WHERE calibration_id=?',k.id);if(k.status!=='pending'||k.job_data!==j.data||!d.reviewers.every((u:string)=>votes.some(v=>v.user_id===u)))throw new Fault('All assigned reviewers must finish the current role version first.',409);
    d.rubric={essential:str(b.essential,1500,10),trainable:str(b.trainable,1500,10),transferable:str(b.transferable,1500,10),resolution:str(b.resolution,2000,20)};
    await run("UPDATE hiring_calibrations SET status='approved',data=?,approved_at=? WHERE id=? AND status='pending'",JSON.stringify(d),time,k.id);break;
   }
   default:throw new Fault('Unknown workflow action.');
  }
  return reply({ok:true});
 }catch(e:any){return reply({error:e instanceof SyntaxError?'Invalid request.':e instanceof RangeError?'Choose a valid date.':e.message||'Unable to save this workflow.'},e instanceof Fault?e.status:400)}};
}
