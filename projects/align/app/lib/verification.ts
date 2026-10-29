import {blocked,defaultPrivacy} from './live';
type Row=Record<string,any>;
const parse=(s:string,fallback:any={})=>{try{return JSON.parse(s)}catch{return fallback}};
const time=()=>new Date().toISOString();
const uid=()=>crypto.randomUUID();
const cleanName=(s:string)=>s.trim().toLowerCase();
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
class Fault extends Error{constructor(message:string,public status=400){super(message)}}
function value(v:unknown,max=500,required=true){if(typeof v!=='string'||v.length>max||(required&&!v.trim()))throw new Fault('Please complete the required fields.');return v.trim()}
export function isVerificationAdmin(req:Request,allowlist=''){return Boolean(req.headers.get('oai-authenticated-user-id')&&allowlist.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean).includes((req.headers.get('oai-authenticated-user-email')||'').toLowerCase()))}
export function verificationFields(p:Row){const name=parse(p.data).name;const verified=Boolean(p.identity_verified_at&&p.photo_key&&p.verified_name&&cleanName(p.verified_name)===cleanName(name||''));return {identityVerifiedAt:verified?p.identity_verified_at:null,photoUrl:verified?'/api/verification/image?profileId='+encodeURIComponent(p.id):null};}

// Only JPEG is accepted at the API. The browser converts PNG/WebP/JPEG locally.
// Strip EXIF, IPTC and comments on the server as well, including direct API uploads.
export function stripJpegMetadata(bytes:Uint8Array){
  if(bytes.length<20||bytes[0]!==255||bytes[1]!==216)throw new Fault('Use a valid JPEG photograph.');
  const chunks:Uint8Array[]=[bytes.subarray(0,2)];let at=2,dimensions=false,scan=false;
  while(at<bytes.length){
    const start=at;if(bytes[at++]!==255)throw new Fault('Invalid JPEG image.');while(bytes[at]===255)at++;
    const marker=bytes[at++];
    if(marker===218){chunks.push(bytes.subarray(start));scan=true;break}
    if(marker===217)break;
    if(marker===0||marker===216||at+2>bytes.length)throw new Fault('Invalid JPEG image.');
    const size=(bytes[at]<<8)|bytes[at+1];if(size<2||at+size>bytes.length)throw new Fault('Invalid JPEG image.');
    if([192,193,194].includes(marker)){const height=(bytes[at+3]<<8)|bytes[at+4],width=(bytes[at+5]<<8)|bytes[at+6];if(width<16||height<16||width>8192||height>8192)throw new Fault('Use an image between 16 and 8192 pixels per side.');dimensions=true}
    if(![225,237,254].includes(marker))chunks.push(bytes.subarray(start,at+size));at+=size;
  }
  if(!dimensions||!scan)throw new Fault('Use a complete JPEG photograph.');
  const output=new Uint8Array(chunks.reduce((n,c)=>n+c.length,0));let offset=0;for(const chunk of chunks){output.set(chunk,offset);offset+=chunk.length}return output;
}

export function createVerification(db:D1Database,bucket:R2Bucket,adminEmails=''){
  const q=(sql:string,...args:any[])=>db.prepare(sql).bind(...args);
  const one=(sql:string,...args:any[])=>q(sql,...args).first<Row>();
  const all=async(sql:string,...args:any[])=>(await q(sql,...args).all<Row>()).results||[];
  const run=(sql:string,...args:any[])=>q(sql,...args).run();
  function user(req:Request){const id=req.headers.get('oai-authenticated-user-id');if(!id)throw new Fault('Sign in to manage verification.',401);return {id,email:(req.headers.get('oai-authenticated-user-email')||'').toLowerCase(),admin:isVerificationAdmin(req,adminEmails)}}
  async function audit(subjectType:string,subjectId:string,actorId:string,action:string,reason=''){await run('INSERT INTO verification_audit(id,subject_type,subject_id,actor_id,action,reason,created_at) VALUES(?,?,?,?,?,?,?)',uid(),subjectType,subjectId,actorId,action,reason,time())}
  async function alert(userId:string,body:string){await run('INSERT INTO live_notifications(id,user_id,body,created_at) VALUES(?,?,?,?)',uid(),userId,body,time())}
  async function purge(row:Row,photo=false){
    try{
      if(row.id_key){await run('INSERT OR IGNORE INTO verification_cleanup(key,created_at) VALUES(?,?)',row.id_key,time());await bucket.delete(row.id_key);await run('UPDATE profile_verifications SET id_key=NULL WHERE id=? AND id_key=?',row.id,row.id_key);await run('DELETE FROM verification_cleanup WHERE key=?',row.id_key)}
      if(photo&&row.photo_key){await run('INSERT OR IGNORE INTO verification_cleanup(key,created_at) VALUES(?,?)',row.photo_key,time());await bucket.delete(row.photo_key);await run('UPDATE profile_verifications SET photo_key=NULL WHERE id=? AND photo_key=?',row.id,row.photo_key);await run('DELETE FROM verification_cleanup WHERE key=?',row.photo_key)}
    }catch{console.error('Verification file cleanup needs retry.');}
  }
  async function cleanup(){
    for(const entry of await all('SELECT key FROM verification_cleanup ORDER BY created_at LIMIT 2')){try{await bucket.delete(entry.key);await db.batch([q('UPDATE profile_verifications SET id_key=NULL WHERE id_key=?',entry.key),q("UPDATE profile_verifications SET photo_key=NULL WHERE photo_key=? AND status<>'approved'",entry.key),q('DELETE FROM verification_cleanup WHERE key=?',entry.key)])}catch{console.error('Verification cleanup remains queued.')}}
    const expired=await all("SELECT * FROM profile_verifications WHERE status='pending' AND expires_at<=? LIMIT 2",time());
    for(const row of expired){const result=await run("UPDATE profile_verifications SET status='expired',reason='The review window expired. Please submit a fresh request.' WHERE id=? AND status='pending' AND expires_at<=?",row.id,time());if(result.meta.changes){await purge(row,true);await audit('profile',row.profile_id,'system','expired')}}
    const leftover=await all("SELECT * FROM profile_verifications WHERE status NOT IN ('pending','processing') AND (id_key IS NOT NULL OR (photo_key IS NOT NULL AND status<>'approved')) LIMIT 2");for(const row of leftover)await purge(row,row.status!=='approved');
  }
  const summary=(r:Row)=>({id:r.id,profileId:r.profile_id,name:r.submitted_name,status:r.status,submittedAt:r.submitted_at,expiresAt:r.expires_at,reviewedAt:r.reviewed_at,reason:r.reason,photoUrl:r.status==='pending'?`/api/verification/image?requestId=${encodeURIComponent(r.id)}&kind=photo`:null,idUrl:r.status==='pending'?`/api/verification/image?requestId=${encodeURIComponent(r.id)}&kind=id`:null});
  async function GET(req:Request){try{
    const u=user(req);await cleanup();const scope=new URL(req.url).searchParams.get('scope');
    if(scope==='admin'){
      if(!u.admin)throw new Fault('Verification admin access required.',403);
      const requests=await all("SELECT * FROM profile_verifications ORDER BY CASE WHEN status='pending' THEN 0 ELSE 1 END,submitted_at DESC LIMIT 100");
      const companies=await all("SELECT id,name,domain,verified_at,review_status,review_data,review_requested_at,reviewed_at,review_reason FROM live_companies WHERE review_status<>'unsubmitted' ORDER BY CASE WHEN review_status='pending' THEN 0 ELSE 1 END,review_requested_at DESC LIMIT 100");
      return json({admin:true,profiles:requests.map(summary),companies:companies.map(c=>({id:c.id,name:c.name,domain:c.domain,domainVerifiedAt:c.verified_at,status:c.review_status,details:parse(c.review_data),submittedAt:c.review_requested_at,reviewedAt:c.reviewed_at,reason:c.review_reason}))});
    }
    const own=await one('SELECT * FROM profile_verifications WHERE user_id=?',u.id);
    const profile=await one('SELECT * FROM live_profiles WHERE user_id=?',u.id);
    return json({admin:u.admin,request:own?summary(own):null,profile:profile?{id:profile.id,name:parse(profile.data).name,...verificationFields(profile)}:null});
  }catch(e){return failure(e)}}
  async function upload(req:Request,u:{id:string}){
    if(!adminEmails.trim())throw new Fault('Verification review is not configured yet.',503);
    if(!req.headers.get('content-type')?.startsWith('multipart/form-data'))throw new Fault('Choose your portrait and photo ID.');
    const profile=await one('SELECT * FROM live_profiles WHERE user_id=?',u.id);if(!profile)throw new Fault('Save your live profile before requesting verification.');
    const previous=await one('SELECT * FROM profile_verifications WHERE user_id=?',u.id);
    if(previous&&['pending','processing'].includes(previous.status))throw new Fault('Withdraw your current request before submitting another.',409);
    const max=13000000;if(Number(req.headers.get('content-length'))>max)throw new Fault('Keep each image below 6 MB.',413);
    const reader=req.body?.getReader();if(!reader)throw new Fault('Missing images.');const chunks:Uint8Array[]=[];let total=0;
    for(;;){const {done,value:chunk}=await reader.read();if(done)break;total+=chunk.length;if(total>max){await reader.cancel();throw new Fault('Keep each image below 6 MB.',413)}chunks.push(chunk)}
    const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
    const form=await new Response(bytes,{headers:{'Content-Type':req.headers.get('content-type')!}}).formData();
    if(form.get('consent')!=='yes')throw new Fault('Consent is required before submitting a photo ID.');
    const portrait=form.get('portrait'),document=form.get('document');
    if(!(portrait instanceof File)||!(document instanceof File)||portrait.size>6000000||document.size>6000000||!portrait.size||!document.size)throw new Fault('Choose a portrait and photo-ID image, each below 6 MB.');
    const cleanPortrait=stripJpegMetadata(new Uint8Array(await portrait.arrayBuffer())),cleanDocument=stripJpegMetadata(new Uint8Array(await document.arrayBuffer()));
    const requestId=uid(),photoKey='verification/portraits/'+uid()+'.jpg',idKey='verification/documents/'+uid()+'.jpg';
    try{
      await bucket.put(photoKey,cleanPortrait,{httpMetadata:{contentType:'image/jpeg'}});await bucket.put(idKey,cleanDocument,{httpMetadata:{contentType:'image/jpeg'}});
      const timestamp=time(),expires=new Date(Date.now()+7*86400000).toISOString();
      // Conditional upsert prevents simultaneous requests from replacing an active review.
      const oldKeys=[...new Set([previous?.id_key,previous?.photo_key,profile.photo_key].filter(Boolean))];
      const results=await db.batch([q("INSERT INTO profile_verifications(id,user_id,profile_id,submitted_name,photo_key,id_key,status,submitted_at,expires_at) VALUES(?,?,?,?,?,?,'pending',?,?) ON CONFLICT(user_id) DO UPDATE SET id=excluded.id,profile_id=excluded.profile_id,submitted_name=excluded.submitted_name,photo_key=excluded.photo_key,id_key=excluded.id_key,status='pending',submitted_at=excluded.submitted_at,expires_at=excluded.expires_at,reviewed_at=NULL,reviewed_by=NULL,reason='' WHERE profile_verifications.status NOT IN ('pending','processing')",requestId,u.id,profile.id,parse(profile.data).name,photoKey,idKey,timestamp,expires),q('UPDATE live_profiles SET photo_key=NULL,identity_verified_at=NULL,verified_name=NULL WHERE id=? AND EXISTS(SELECT 1 FROM profile_verifications WHERE id=?)',profile.id,requestId),...oldKeys.map(key=>q('INSERT OR IGNORE INTO verification_cleanup(key,created_at) SELECT ?,? WHERE EXISTS(SELECT 1 FROM profile_verifications WHERE id=?)',key,timestamp,requestId))]);
      if(!results[0].meta.changes)throw new Fault('Another review request is already active.',409);
      await audit('profile',profile.id,u.id,'submitted');
      if(previous)await purge(previous,true);
      if(profile.photo_key&&profile.photo_key!==previous?.photo_key){try{await bucket.delete(profile.photo_key);await run('DELETE FROM verification_cleanup WHERE key=?',profile.photo_key)}catch{console.error('Old portrait cleanup remains queued.')}}
    }catch(e){const saved=await one('SELECT id FROM profile_verifications WHERE id=?',requestId);if(!saved){await bucket.delete(photoKey);await bucket.delete(idKey)}throw e}
    return json({ok:true});
  }
  async function POST(req:Request){try{
    const u=user(req);if(req.headers.get('origin')!==new URL(req.url).origin)throw new Fault('Invalid origin.',403);await cleanup();
    if(req.headers.get('content-type')?.startsWith('multipart/form-data'))return await upload(req,u);
    const raw=await req.text();if(raw.length>12000)throw new Fault('Request too large.',413);const b=parse(raw,null);if(!b)throw new Fault('Invalid request.');
    if(b.action==='withdraw'||b.action==='removePhoto'){
      const row=await one('SELECT * FROM profile_verifications WHERE user_id=?',u.id);
      if(!row)throw new Fault('No verification request found.',404);
      if(row.id!==value(b.requestId,100))throw new Fault('This request has changed. Refresh first.',409);
      if(row.status==='processing')throw new Fault('A review is being completed. Refresh and try again.',409);
      const changed=await run("UPDATE profile_verifications SET status='withdrawn',reason='Removed by the profile owner.' WHERE id=? AND status<>'processing'",row.id);if(!changed.meta.changes)throw new Fault('This request has changed.',409);
      await run('UPDATE live_profiles SET photo_key=NULL,identity_verified_at=NULL,verified_name=NULL WHERE user_id=?',u.id);await purge(row,true);await audit('profile',row.profile_id,u.id,'withdrawn');return json({ok:true});
    }
    if(b.action==='companySubmit'){
      const c=await one('SELECT * FROM live_companies WHERE id=? AND owner_id=?',value(b.companyId,100),u.id);if(!c)throw new Fault('Company owner access required.',403);
      if(!c.verified_at)throw new Fault('Verify your company domain with DNS first.');
      if(['pending','approved'].includes(c.review_status))throw new Fault('This company is already submitted or approved.',409);
      const description=value(b.description,1500),reference=value(b.reference||'',200,false);if(b.consent!==true)throw new Fault('Confirm you represent this company.');
      await run("UPDATE live_companies SET review_status='pending',review_data=?,review_requested_at=?,reviewed_at=NULL,reviewed_by=NULL,review_reason='' WHERE id=?",JSON.stringify({description,reference,website:'https://'+c.domain,contactEmail:u.email}),time(),c.id);
      await audit('company',c.id,u.id,'submitted');return json({ok:true});
    }
    if(!u.admin)throw new Fault('Verification admin access required.',403);
    const reason=value(b.reason||'',500,false);if(!['approveProfile','rejectProfile','revokeProfile','approveCompany','rejectCompany','revokeCompany'].includes(b.action))throw new Fault('Unknown review action.');
    if((b.action.startsWith('reject')||b.action.startsWith('revoke'))&&!reason)throw new Fault('Add a short reason without any ID numbers or sensitive document details.');
    if(b.action.endsWith('Profile')){
      const row=await one('SELECT * FROM profile_verifications WHERE id=?',value(b.requestId,100));if(!row)throw new Fault('Review request not found.',404);
      const revoke=b.action==='revokeProfile';
      if(revoke?row.status!=='approved':row.status!=='pending'||row.expires_at<=time())throw new Fault('This request is no longer available for that decision.',409);
      const p=await one('SELECT * FROM live_profiles WHERE id=?',row.profile_id);if(!p)throw new Fault('Profile not found.',404);
      const approve=b.action==='approveProfile';
      if(approve&&(b.checked!==true||cleanName(parse(p.data).name)!==cleanName(row.submitted_name)))throw new Fault('Confirm the photo and name check. If the profile name changed, request a fresh submission.');
      const locked=await run('UPDATE profile_verifications SET status=\'processing\' WHERE id=? AND status=?',row.id,revoke?'approved':'pending');if(!locked.meta.changes)throw new Fault('Another reviewer has already handled this request.',409);
      const timestamp=time(),status=approve?'approved':revoke?'revoked':'rejected';
      try{await db.batch([q('UPDATE live_profiles SET photo_key=?,identity_verified_at=?,verified_name=? WHERE id=?',approve?row.photo_key:null,approve?timestamp:null,approve?row.submitted_name:null,row.profile_id),q('UPDATE profile_verifications SET status=?,reviewed_at=?,reviewed_by=?,reason=? WHERE id=? AND status=\'processing\'',status,timestamp,u.id,reason,row.id)])}catch(e){await run("UPDATE profile_verifications SET status=? WHERE id=? AND status='processing'",row.status,row.id);throw e}
      await purge(row,!approve);await audit('profile',row.profile_id,u.id,status,reason);await alert(row.user_id,approve?'Your profile photo and ID were approved. Your verified badge is now visible.':`Profile verification ${status}. Open Verification to see the reason.`);return json({ok:true});
    }
    const c=await one('SELECT * FROM live_companies WHERE id=?',value(b.companyId,100));if(!c)throw new Fault('Company not found.',404);
    const approve=b.action==='approveCompany',revoke=b.action==='revokeCompany';
    if(revoke?c.review_status!=='approved':c.review_status!=='pending')throw new Fault('This company review is no longer pending.',409);
    if(approve&&(!c.verified_at||b.checked!==true))throw new Fault('Verify domain control and confirm the company review before approval.');
    const status=approve?'approved':revoke?'revoked':'rejected';const result=await run('UPDATE live_companies SET review_status=?,reviewed_at=?,reviewed_by=?,review_reason=? WHERE id=? AND review_status=?',status,time(),u.id,reason,c.id,revoke?'approved':'pending');if(!result.meta.changes)throw new Fault('Another reviewer has already handled this company.',409);
    if(!approve)await run("UPDATE live_jobs SET status='paused_verification' WHERE company_id=? AND status='open'",c.id);
    await audit('company',c.id,u.id,status,reason);await alert(c.owner_id,approve?'Your company was approved. You can now publish jobs.':`Company verification ${status}. Open Hiring to see the reason.`);return json({ok:true});
  }catch(e){return failure(e)}}
  async function IMAGE(req:Request){try{
    const u=user(req),url=new URL(req.url);let key:string|null=null;
    if(url.searchParams.has('requestId')){
      const row=await one('SELECT * FROM profile_verifications WHERE id=?',value(url.searchParams.get('requestId'),100));
      if(!row||(!u.admin&&row.user_id!==u.id)||row.status!=='pending'||row.expires_at<=time())throw new Fault('Image unavailable.',404);
      key=url.searchParams.get('kind')==='id'?row.id_key:row.photo_key;
      if(url.searchParams.get('kind')==='id')await audit('profile',row.profile_id,u.id,'id_viewed');
    }else{
      const p=await one('SELECT * FROM live_profiles WHERE id=?',value(url.searchParams.get('profileId'),100));if(!p||!verificationFields(p).identityVerifiedAt)throw new Fault('Photo unavailable.',404);
      let allowed=p.user_id===u.id||u.admin;
      if(!allowed){const companies=await all('SELECT c.* FROM live_companies c JOIN live_members m ON m.company_id=c.id WHERE m.user_id=?',u.id);for(const c of companies){const privacy=parse(p.privacy,defaultPrivacy);if(blocked(privacy,c as any))continue;const direct=await one("SELECT id FROM live_applications WHERE candidate_id=? AND company_id=? AND candidate_interest=1 AND stage<>'withdrawn'",p.id,c.id);if(privacy.discoverable||direct){allowed=true;break}}}
      if(!allowed)throw new Fault('Photo unavailable.',404);key=p.photo_key;
    }
    if(!key)throw new Fault('Image unavailable.',404);const object=await bucket.get(key);if(!object)throw new Fault('Image unavailable.',404);
    return new Response(object.body,{headers:{'Content-Type':'image/jpeg','Content-Disposition':'inline; filename="verification-image.jpg"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; sandbox"}});
  }catch(e){return failure(e)}}
  function failure(e:unknown){if(e instanceof Fault)return json({error:e.message},e.status);console.error('Verification request failed.');return json({error:'Unable to complete verification. Please refresh and try again.'},500)}
  return {GET,POST,IMAGE,cleanup};
}
