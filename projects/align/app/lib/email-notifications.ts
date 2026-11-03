import {isOneSidedInterestNotice} from './swipe';
type R=Record<string,any>;
export type EmailConfig={ALIGN_EMAIL_API_KEY?:string;ALIGN_EMAIL_FROM?:string;ALIGN_PUBLIC_ORIGIN?:string};
export const notificationKinds=['matches','messages','interviews','deadlines'] as const;
export function notificationKind(body:string){if(/deadline|outcome|next step|update due/i.test(body))return 'deadlines';if(/interview|booked/i.test(body))return 'interviews';if(/message/i.test(body))return 'messages';if(/mutual match|you matched/i.test(body))return 'matches';return null}
export function emailReady(env:EmailConfig){return Boolean(env.ALIGN_EMAIL_API_KEY&&env.ALIGN_EMAIL_FROM&&env.ALIGN_PUBLIC_ORIGIN)}
export function createEmailPreferences(db:D1Database,env:EmailConfig){return async(req:Request)=>{
 const uid=req.headers.get('oai-authenticated-user-id'),email=req.headers.get('oai-authenticated-user-email')||'';
 const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
 if(!uid)return json({error:'Sign in to manage your notifications.'},401);
 const row=await db.prepare('SELECT * FROM email_preferences WHERE user_id=?').bind(uid).first<R>();
 if(req.method==='GET')return json({configured:emailReady(env),email,enabled:Boolean(row?.enabled&&row.email===email),events:row?JSON.parse(row.events):[...notificationKinds],setup:emailReady(env)?'ready':'sender_required'});
 if(req.method!=='POST')return json({error:'Method not allowed.'},405);
 if(req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Same-origin requests required.'},403);
 const raw=await req.text();if(raw.length>2000)return json({error:'Request too large.'},413);
 let b:R;try{b=JSON.parse(raw)}catch{return json({error:'Invalid preferences.'},400)}
 if(typeof b.enabled!=='boolean'||!Array.isArray(b.events)||b.events.some((x:any)=>!notificationKinds.includes(x)))return json({error:'Choose valid notification types.'},400);
 if(b.enabled&&(!emailReady(env)||!email))return json({error:'Email notifications need a configured sender before you can enable them.'},503);
 const time=new Date().toISOString(),enabledAt=row?.enabled&&row.email===email?row.enabled_at:time;
 await db.prepare('INSERT INTO email_preferences(user_id,email,enabled,events,enabled_at,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,enabled=excluded.enabled,events=excluded.events,enabled_at=excluded.enabled_at,updated_at=excluded.updated_at').bind(uid,email,b.enabled?1:0,JSON.stringify([...new Set(b.events)]),enabledAt,time).run();
 return json({ok:true});
};}

export async function processEmailNotifications(db:D1Database,env:EmailConfig,send:typeof fetch=fetch){
 if(!emailReady(env))return;
 const now=Date.now(),time=new Date(now).toISOString();
 // Generate bounded, idempotent reminders. The original review deadline is never rewritten.
 const reminders=(await db.prepare("SELECT r.id,r.user_id,b.deadline FROM review_reservations r JOIN review_batches b ON b.id=r.batch_id WHERE r.status='reserved' AND b.deadline>? AND b.deadline<=? LIMIT 30").bind(time,new Date(now+86400000).toISOString()).all<R>()).results||[];
 for(const r of reminders)await db.prepare('INSERT OR IGNORE INTO live_notifications(id,user_id,body,created_at) VALUES(?,?,?,?)').bind('review-deadline:'+r.id,r.user_id,'A written review outcome is due within 24 hours. Check its original deadline in Applications.',time).run();
 const steps=(await db.prepare("SELECT a.id,a.candidate_user_id,a.company_id,json_extract(a.data,'$.nextStep') step FROM live_applications a WHERE a.candidate_interest=1 AND a.employer_interest=1 AND a.stage NOT IN ('closed','withdrawn') AND json_extract(a.data,'$.nextStep.dueAt')>? AND json_extract(a.data,'$.nextStep.dueAt')<=? LIMIT 30").bind(time,new Date(now+86400000).toISOString()).all<R>()).results||[];
 for(const a of steps){const step=JSON.parse(a.step);const targets=step.owner==='candidate'?[{user_id:a.candidate_user_id}]:(await db.prepare('SELECT user_id FROM live_members WHERE company_id=? AND user_id IS NOT NULL').bind(a.company_id).all<R>()).results||[];for(const u of targets)await db.prepare('INSERT OR IGNORE INTO live_notifications(id,user_id,body,created_at) VALUES(?,?,?,?)').bind('step:'+a.id+':'+step.updatedAt+':'+u.user_id,u.user_id,'Your next step is due within 24 hours. Open Align to see what needs your attention.',time).run()}
 await db.prepare("UPDATE email_deliveries SET state='queued' WHERE state='sending' AND updated_at<?").bind(now-60000).run();
 // Two bounded provider calls fit the Worker's post-response lifetime, even on timeout.
 const rows=(await db.prepare("SELECT n.*,p.email,p.events FROM live_notifications n JOIN email_preferences p ON p.user_id=n.user_id AND p.enabled=1 LEFT JOIN email_deliveries d ON d.id=n.id WHERE n.created_at>=p.enabled_at AND n.created_at>? AND (d.id IS NULL OR d.state='queued' AND d.attempts<5 AND d.next_attempt<=?) ORDER BY n.created_at LIMIT 30").bind(new Date(now-86400000).toISOString(),now).all<R>()).results||[];
 let attempted=0;
 for(const r of rows){
  const kind=notificationKind(r.body);
  if(!kind||isOneSidedInterestNotice(r.body)||!JSON.parse(r.events).includes(kind)){
   await db.prepare("INSERT OR IGNORE INTO email_deliveries(id,user_id,state,attempts,next_attempt,updated_at) VALUES(?,?,'cancelled',0,?,?)").bind(r.id,r.user_id,now,now).run();
   continue;
  }
  if(attempted>=2)break;
  await db.prepare("INSERT OR IGNORE INTO email_deliveries(id,user_id,state,attempts,next_attempt,updated_at) VALUES(?,?,'queued',0,?,?)").bind(r.id,r.user_id,now,now).run();
  const claimed=await db.prepare("UPDATE email_deliveries SET state='sending',attempts=attempts+1,updated_at=? WHERE id=? AND state='queued' AND next_attempt<=?").bind(now,r.id,now).run();if(!claimed.meta.changes)continue;
  // Recheck consent after claiming; the recipient is bound to their authenticated account.
  const consent=await db.prepare('SELECT * FROM email_preferences WHERE user_id=? AND enabled=1 AND email=?').bind(r.user_id,r.email).first<R>();
  if(!consent||!JSON.parse(consent.events).includes(kind)){await db.prepare("UPDATE email_deliveries SET state='cancelled' WHERE id=?").bind(r.id).run();continue}
  attempted++;
  try{
   const origin=new URL(env.ALIGN_PUBLIC_ORIGIN!).origin;
   const response=await send('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.ALIGN_EMAIL_API_KEY,'Content-Type':'application/json','Idempotency-Key':'align/'+r.id},body:JSON.stringify({from:env.ALIGN_EMAIL_FROM,to:[r.email],subject:({matches:'A hiring update in Align',messages:'You have a message in Align',interviews:'Your Align interview has an update',deadlines:'An Align update needs your attention'})[kind],text:`You have a ${kind==='deadlines'?'deadline':'hiring'} update in Align.\n\nOpen your workspace: ${origin}/\n\nManage or turn off these emails in your Align account under Notifications. Candidate details and private messages are never included in these emails.`}),signal:AbortSignal.timeout(8000)});
   if(!response.ok)throw Error('Provider did not accept notification');
   await db.prepare("UPDATE email_deliveries SET state='sent',updated_at=? WHERE id=?").bind(Date.now(),r.id).run();
  }catch{await db.prepare("UPDATE email_deliveries SET state='queued',next_attempt=?,updated_at=? WHERE id=?").bind(now+300000,Date.now(),r.id).run()}
 }
}
