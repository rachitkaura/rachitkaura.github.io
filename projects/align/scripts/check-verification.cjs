const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript');
const {DatabaseSync}=require('node:sqlite');
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,file);
const {createVerification}=require('../app/lib/verification.ts'),{createMarket}=require('../app/lib/live-server.ts'),{defaultPrivacy}=require('../app/lib/live.ts');
const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');for(const f of fs.readdirSync(path.join(__dirname,'../drizzle')).filter(f=>f.endsWith('.sql')).sort())sql.exec(fs.readFileSync(path.join(__dirname,'../drizzle',f),'utf8'));
const DB={prepare(query){const statement=sql.prepare(query);let args=[];return {bind(...values){assert(values.length<=100);args=values;return this},async first(){return statement.get(...args)||null},async all(){return {results:statement.all(...args)}},async run(){return {success:true,meta:{changes:Number(statement.run(...args).changes)}}}}},async batch(statements){sql.exec('BEGIN');try{const r=[];for(const s of statements)r.push(await s.run());sql.exec('COMMIT');return r}catch(e){sql.exec('ROLLBACK');throw e}}};
const files=new Map();let failDelete=false;const BUCKET={async put(key,body){files.set(key,new Uint8Array(body));return {}},async get(key){return files.has(key)?{body:files.get(key)}:null},async delete(key){if(failDelete)throw Error('Synthetic deletion failure');files.delete(key)}};
const review=createVerification(DB,BUCKET,'admin@align.test'),origin='https://align.test';let dnsToken='';
const market=createMarket(DB,async()=>Response.json({Answer:[{type:16,data:'"'+dnsToken+'"'}]}),{adminEmails:'admin@align.test'});
const identities={admin:'admin@align.test',owner:'owner@team.test',alice:'alice@personal.test',bob:'bob@personal.test'};
function request(who,payload,url='/api/verification',requestOrigin=origin){return new Request(origin+url,{method:payload?'POST':'GET',headers:{...(who?{'oai-authenticated-user-id':who,'oai-authenticated-user-email':identities[who]}:{}),Origin:requestOrigin,...(payload&&!(payload instanceof FormData)?{'Content-Type':'application/json'}:{})},...(payload?{body:payload instanceof FormData?payload:JSON.stringify(payload)}:{})})}
async function call(handler,who,payload,status=200,url,requestOrigin){const r=await handler(request(who,payload,url,requestOrigin));const data=await r.json();assert.equal(r.status,status,JSON.stringify({payload:payload instanceof FormData?'images':payload,error:data}));return data}
const person=name=>({name,title:'Program Lead',location:'Toronto',skills:'Program management',bio:'Test profile',email:'',links:'',availableFrom:'',privacy:{...defaultPrivacy,discoverable:true}});
const image=fs.readFileSync(path.join(__dirname,'fixtures/verification-test.jpg'));
function upload(consent=true){const form=new FormData();form.append('portrait',new File([image],'portrait.jpg',{type:'image/jpeg'}));form.append('document',new File([image],'synthetic-id.jpg',{type:'image/jpeg'}));if(consent)form.append('consent','yes');return form}
const profileRow=()=>sql.prepare('SELECT * FROM live_profiles WHERE user_id=?').get('alice');
async function submit(){await call(review.POST,'alice',upload());return (await call(review.GET,'alice')).request}
async function approve(r){await call(review.POST,'admin',{action:'approveProfile',requestId:r.id,checked:true})}
(async()=>{
  await call(review.GET,null,null,401);await call(review.GET,'owner',null,403,'/api/verification?scope=admin');
  await call(review.POST,'alice',upload(),400);await call(market.POST,'alice',{action:'profile',profile:{...person('Alice'),identityVerifiedAt:'forged',photoUrl:'forged'}});await call(market.POST,'bob',{action:'profile',profile:person('Bob')});
  assert.equal((await call(market.GET,'alice')).profile.identityVerifiedAt,null);
  await call(review.POST,'alice',upload(),403,'/api/verification','https://evil.test');await call(review.POST,'alice',upload(false),400);
  let r=await submit();assert.equal(r.status,'pending');assert.equal(files.size,2);assert.equal((await call(market.GET,'alice')).profile.photoUrl,null);
  for(const bytes of files.values())assert(!Buffer.from(bytes).includes(Buffer.from('SYNTHETIC_EXIF_TEST_ONLY')));
  assert.equal((await review.IMAGE(request('alice',null,r.idUrl))).status,200);assert.equal((await review.IMAGE(request('admin',null,r.idUrl))).status,200);assert.equal((await review.IMAGE(request('owner',null,r.idUrl))).status,404);assert.equal((await review.IMAGE(request('bob',null,r.photoUrl))).status,404);
  await call(review.POST,'owner',{action:'approveProfile',requestId:r.id,checked:true},403);await call(review.POST,'admin',{action:'approveProfile',requestId:r.id,checked:false},400);
  await call(review.POST,'alice',upload(),409);assert.equal(files.size,2);
  await approve(r);assert.equal(files.size,1);assert.equal((await review.IMAGE(request('admin',null,r.idUrl))).status,404);
  let p=(await call(market.GET,'alice')).profile;assert(p.identityVerifiedAt&&p.photoUrl);assert.equal((await review.IMAGE(request('bob',null,p.photoUrl))).status,404);assert.equal((await review.IMAGE(request('alice',null,p.photoUrl))).status,200);
  await call(review.POST,'admin',{action:'approveProfile',requestId:r.id,checked:true},409);
  // Domain proof alone cannot publish; a separate admin review must pass too.
  await call(market.POST,'owner',{action:'company',name:'Team',domain:'team.test'});let c=(await call(market.GET,'owner')).organizations[0];dnsToken=c.verificationToken;
  const job={title:'Program Lead',location:'Toronto',mode:'Remote',salary:120,max:160,skills:['Program management'],about:'Synthetic test role.',travelPercent:0,startBy:'',questions:[]};
  await call(market.POST,'owner',{action:'job',companyId:c.id,job},403);await call(review.POST,'owner',{action:'companySubmit',companyId:c.id,description:'Test business.',consent:true},400);
  await call(market.POST,'owner',{action:'verify',companyId:c.id});await call(market.POST,'owner',{action:'job',companyId:c.id,job},403);
  await call(review.POST,'owner',{action:'companySubmit',companyId:c.id,description:'A test business building software.',reference:'Public test registry',consent:true});
  await call(review.POST,'owner',{action:'approveCompany',companyId:c.id,checked:true},403);await call(review.POST,'admin',{action:'approveCompany',companyId:c.id,checked:false},400);await call(review.POST,'admin',{action:'approveCompany',companyId:c.id,checked:true});
  await call(market.POST,'owner',{action:'job',companyId:c.id,job});const posted=(await call(market.GET)).jobs[0];assert(posted.verifiedAt&&posted.active);
  const employer=(await call(market.GET,'owner'));assert.equal(employer.admin,false);assert(employer.profiles.find(x=>x.name==='Alice').identityVerifiedAt);assert.equal((await review.IMAGE(request('owner',null,p.photoUrl))).status,200);
  // Privacy blocks apply equally to approved profile photos.
  await call(market.POST,'alice',{action:'profile',profile:{...person('Alice'),privacy:{...defaultPrivacy,discoverable:true,hiddenCompanies:[c.id]}}});assert.equal((await review.IMAGE(request('owner',null,p.photoUrl))).status,404);
  await call(market.POST,'alice',{action:'profile',profile:person('Alice')});assert((await call(market.GET,'alice')).profile.identityVerifiedAt);
  await call(market.POST,'alice',{action:'profile',profile:person('Alice New')});assert.equal((await call(market.GET,'alice')).profile.identityVerifiedAt,null);assert.equal((await review.IMAGE(request('owner',null,p.photoUrl))).status,404);
  const oldId=r.id;r=await submit();assert.equal(files.size,2);assert.equal((await call(market.GET,'alice')).profile.photoUrl,null);await call(review.POST,'admin',{action:'approveProfile',requestId:oldId,checked:true},404);
  await call(review.POST,'admin',{action:'rejectProfile',requestId:r.id,reason:''},400);await call(review.POST,'admin',{action:'rejectProfile',requestId:r.id,reason:'Please use a clear portrait.'});assert.equal(files.size,0);
  r=await submit();await call(review.POST,'alice',{action:'withdraw',requestId:r.id});assert.equal(files.size,0);await call(review.POST,'admin',{action:'approveProfile',requestId:r.id,checked:true},409);
  r=await submit();sql.prepare("UPDATE profile_verifications SET expires_at='2000-01-01T00:00:00.000Z' WHERE id=?").run(r.id);assert.equal((await review.IMAGE(request('admin',null,r.idUrl))).status,404);assert.equal((await call(review.GET,'alice')).request.status,'expired');assert.equal(files.size,0);
  r=await submit();failDelete=true;await approve(r);assert.equal(files.size,2);assert.equal((await review.IMAGE(request('admin',null,r.idUrl))).status,404);failDelete=false;await call(review.GET,'admin');assert.equal(files.size,1);
  await call(review.POST,'admin',{action:'revokeProfile',requestId:r.id,reason:'Approval needs a fresh review.'});assert.equal(files.size,0);assert.equal((await call(market.GET,'alice')).profile.identityVerifiedAt,null);
  await call(review.POST,'admin',{action:'revokeCompany',companyId:c.id,reason:'Business details need updating.'});assert.equal((await call(market.GET)).jobs.length,0);await call(market.POST,'owner',{action:'jobStatus',jobId:posted.id,status:'open'},403);await call(market.POST,'owner',{action:'job',companyId:c.id,job:{...job,id:posted.id}},403);
  assert.equal(sql.prepare('SELECT status FROM live_jobs WHERE id=?').get(posted.id).status,'paused_verification');
  assert(sql.prepare("SELECT COUNT(*) count FROM verification_audit WHERE action='id_viewed'").get().count>=2);
  const queue=await call(review.GET,'admin',null,200,'/api/verification?scope=admin');assert(queue.admin);assert.equal(queue.profiles[0].idUrl,null);
  console.log('Passed: admin-only ID review, private image ownership, metadata stripping, consent and upload limits, approval/rejection/revocation, stale-review guards, badge invalidation, ID deletion retries, expiry/withdrawal cleanup, photo privacy, and mandatory company domain + admin approval for posting, editing and reopening jobs.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>sql.close());
