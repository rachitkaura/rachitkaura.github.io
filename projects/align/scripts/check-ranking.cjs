const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript');
const {DatabaseSync}=require('node:sqlite');
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,file);
const {createMarket}=require('../app/lib/live-server.ts');
const {defaultPrivacy,preferenceFit,defaultPreferences,coachFeedback,calendarFile}=require('../app/lib/live.ts');
const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
for(const file of fs.readdirSync(path.join(__dirname,'../drizzle')).filter(x=>x.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync(path.join(__dirname,'../drizzle',file),'utf8'));
let queryCount=0;
const DB={prepare(sql){const stmt=sqlite.prepare(sql);let args=[];return {bind(...values){assert(values.length<=100,'D1 statement exceeds the parameter limit');queryCount++;args=values;return this},async all(){return {results:stmt.all(...args)}},async first(){return stmt.get(...args)||null},async run(){const result=stmt.run(...args);return {success:true,meta:{changes:Number(result.changes)}}}}},async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const stmt of statements)results.push(await stmt.run());sqlite.exec('COMMIT');return results}catch(e){sqlite.exec('ROLLBACK');throw e}}};
let dnsToken='';const market=createMarket(DB,async url=>{assert(String(url).includes('_align-verify.team.test'));return Response.json({Answer:[{type:16,data:'"'+dnsToken+'"'}]})});
const origin='https://align.test';
function req(user,body,url='/api/live',requestOrigin=origin){const email={owner:'owner@team.test',teammate:'teammate@team.test',intruder:'intruder@evil.test',alice:'alice@personal.test',bob:'bob@personal.test'}[user]||'';return new Request(origin+url,{method:body?'POST':'GET',headers:{...(user?{'oai-authenticated-user-id':user,'oai-authenticated-user-email':email}:{}),origin:requestOrigin,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})})}
async function post(user,body,status=200,otherOrigin){const r=await market.POST(req(user,body,'/api/live',otherOrigin));const d=await r.json();assert.equal(r.status,status,JSON.stringify({body,error:d}));return d}
async function get(user,url){const r=await market.GET(req(user,null,url));assert.equal(r.status,200,JSON.stringify(await r.clone().json()));return r.json()}
const person=(name,privacy={...defaultPrivacy,discoverable:true})=>({name,title:'Program Lead',location:'Toronto',skills:'JavaScript, Program management',bio:'I coordinate useful projects.',email:name.toLowerCase()+'@contact.test',links:'https://example.com',availableFrom:'',privacy});
const next=(days,hours=0)=>new Date(Date.now()+days*86400000+hours*3600000).toISOString();

const {rankCandidate,defaultRanking,rankingPreferences}=require('../app/lib/ranking.ts');
const {createRanking}=require('../app/lib/ranking-server.ts');
(async()=>{
 const pref={...defaultRanking,minYears:5,startBy:'2026-12-01',valuesWanted:['Collaboration']};
 const uncertain=rankCandidate({id:'x',skills:'JavaScript'}, {skills:['JavaScript']},pref);
 assert.equal(uncertain.score,100);assert(uncertain.coverage<100);assert(uncertain.needsReview);
 assert.equal(uncertain.metrics.find(x=>x.key==='experience').score,null);
 assert.throws(()=>rankingPreferences({...pref,skills:-1}));assert.throws(()=>rankingPreferences({...pref,valuesWanted:['Religion']}));
 // Legacy employer weights cannot turn optional preferences into a scored criterion.
 assert.equal(defaultRanking.values,0);
 const legacy=rankingPreferences({...pref,values:100,valuesWanted:['Collaboration','Ownership']});
 assert.equal(legacy.values,0);assert.deepEqual(legacy.valuesWanted,[]);
 const preferenceCandidate={id:'work-style',skills:'JavaScript',experienceYears:4,availableFrom:'2026-11-01'};
 const preferenceRole={skills:['JavaScript','Risk management']};
 const baseline=rankCandidate(preferenceCandidate,preferenceRole,legacy);
 for(const workValues of [[],['Collaboration'],['Ownership','Quality'],require('../app/lib/work-preferences.ts').workValues]){
  const compared=rankCandidate({...preferenceCandidate,workValues},preferenceRole,{...legacy,values:100,valuesWanted:workValues});
  for(const key of ['score','coverage','metrics','missingSkills','skillEvidence','questions','needsReview'])assert.deepEqual(compared[key],baseline[key],`Working preferences changed ${key}`);
 }
 await post('owner',{action:'company',name:'Team',domain:'team.test'});let owner=await get('owner');const company=owner.organizations[0];dnsToken=company.verificationToken;
 await post('owner',{action:'verify',companyId:company.id});sqlite.prepare("UPDATE live_companies SET review_status='approved',reviewed_at=? WHERE id=?").run(new Date().toISOString(),company.id);
 await post('owner',{action:'job',companyId:company.id,job:{title:'Program Lead',location:'Toronto',mode:'Remote',salary:100,max:150,skills:['JavaScript','Risk management'],about:'Manage delivery risks.',criteria:{minYears:5,trainable:[],transferable:''},travelPercent:0,startBy:'',questions:[]}});const job=(await get('owner')).companyJobs[0];await require('./workflow-fixture.cjs').calibrateSolo(DB,job.id);await post('owner',{action:'jobStatus',jobId:job.id,status:'open'});
 await post('alice',{action:'profile',profile:{...person('Alice'),experienceYears:6,experienceSummary:'Managed release risks across software teams.',workValues:['Collaboration']}});
 await post('bob',{action:'profile',profile:{...person('Bob'),privacy:{...defaultPrivacy,discoverable:false}}});
 const ranking=createRanking(DB);
 const call=async(user,extra={},status=200,requestOrigin=origin)=>{const r=await ranking(req(user,{action:'preview',companyId:company.id,jobId:job.id,preferences:pref,...extra},'/api/ranking',requestOrigin));const body=await r.json();assert.equal(r.status,status,JSON.stringify(body));return body};
 await call(null,{},401);await call('intruder',{},403);await call('owner',{},403,'https://evil.test');await call('owner',{jobId:'not-your-role'},403);
 let result=await call('owner');assert.equal(result.rows.length,1);assert.equal(result.rows[0].candidate.name,'Alice');assert.equal(result.rows[0].metrics.find(x=>x.key==='experience').score,100);
 await call('owner',{action:'save'},409);const unchanged=await call('owner',{preferences:{...pref,skills:100,experience:0,availability:0,values:100}});assert.equal(unchanged.rows[0].score,result.rows[0].score,'Recruiter-specific weights cannot override the shared role criteria.');
 await call('owner',{action:'ai'},400);
 const {findSkillEvidence}=require('../app/lib/fit-evidence.ts');
 assert(findSkillEvidence({skills:'JS'},'JavaScript'));
 assert(findSkillEvidence({skills:'',experienceSummary:'Led risk management across releases.'},'Risk management'));
 assert.equal(findSkillEvidence({skills:'',experienceSummary:'No experience in risk management.'},'Risk management'),null);
 assert.equal(findSkillEvidence({skills:'',experienceSummary:'Learning JavaScript in a course.'},'JavaScript'),null);
 assert.equal(findSkillEvidence({skills:'',experienceSummary:'Built TypeScript applications.'},'JavaScript'),null);
 assert.equal(findSkillEvidence({skills:'',experienceSummary:'Implemented JavaScript features.'},'JavaScript',false),null);
 assert(findSkillEvidence({skills:'',experienceSummary:'Implemented JavaScript features.'},'JavaScript'));
 assert.equal(rankCandidate({skills:'JS'},{skills:['JS','JavaScript']},defaultRanking).metrics[0].reason,'1 of 1 required skills supported');
 const evidence=rankCandidate({skills:'',experienceSummary:'Led risk management for launches.'},{skills:['Risk management']},defaultRanking);
 assert.equal(evidence.score,100);assert.equal(evidence.skillEvidence[0].source,'Experience mention');
 const unknown=rankCandidate({skills:''},{skills:['JavaScript']},defaultRanking);assert.equal(unknown.score,null);assert.equal(unknown.coverage,0);
 assert.throws(()=>rankingPreferences({...pref,useExperienceEvidence:'yes'}));
 assert.equal(result.mode,'builtin');
 await post('alice',{action:'profile',profile:{...person('Alice'),privacy:{...defaultPrivacy,discoverable:true,hiddenCompanies:[company.id]}}});assert.equal((await call('owner')).rows.length,0);
 console.log('Ranking checks passed: authentication, authorization, privacy, shared criteria, unscored working preferences, legacy weights, unknown data, skill evidence, negation handling and alias boundaries.');
})().catch(e=>{console.error(e);process.exit(1)});
