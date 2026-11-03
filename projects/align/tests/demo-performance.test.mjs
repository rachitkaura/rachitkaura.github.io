import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,relative} from 'node:path';
import {createRequire} from 'node:module';
import {gzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import ts from 'typescript';

// Measure the actual demo engine and production assets, not the TS compiler.
const root=resolve('.'),out=mkdtempSync(join(tmpdir(),'align-perf-')),compiled=new Set();
function compile(file){
 file=resolve(file);if(compiled.has(file))return;compiled.add(file);
 const code=readFileSync(file,'utf8'),destination=join(out,relative(root,file).replace(/\.tsx?$/,'.js'));
 mkdirSync(dirname(destination),{recursive:true});writeFileSync(destination,ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);
 for(const match of code.matchAll(/from\s+['"]([^'"]+)['"]/g)){if(!match[1].startsWith('.'))continue;let target=resolve(dirname(file),match[1]);try{readFileSync(target+'.ts');target+='.ts'}catch{target+='.tsx'}compile(target)}
}
compile(join(root,'app/lib/demo-store.ts'));
const require=createRequire(import.meta.url),{createDemoStore,createDemoState,DEMO_STORAGE_KEY}=require(join(out,'app/lib/demo-store.js'));
class MemoryStorage{values=new Map();getItem(key){return this.values.get(key)||null}setItem(key,value){this.values.set(key,value)}removeItem(key){this.values.delete(key)}}
const round=Number(process.argv[2]||1),reportPath=process.argv[3],metrics=[],failures=[];
const originalFetch=globalThis.fetch;globalThis.fetch=()=>{throw Error('Performance checks must stay offline')};
async function measure(name,operation,p95Budget,iterations=60){
 for(let i=0;i<8;i++)await operation();
 const samples=[];for(let i=0;i<iterations;i++){const start=performance.now();await operation();samples.push(performance.now()-start)}
 samples.sort((a,b)=>a-b);const p95=samples[Math.ceil(samples.length*.95)-1],median=samples[Math.floor(samples.length/2)];
 metrics.push({name,median_ms:+median.toFixed(3),p95_ms:+p95.toFixed(3),budget_ms:p95Budget,pass:p95<=p95Budget});
 if(p95>p95Budget)failures.push(name+' exceeded its p95 budget');
}
function files(path){return readdirSync(path,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(join(path,entry.name)):[join(path,entry.name)])}
try{
 const storage=new MemoryStorage(),store=createDemoStore(storage);
 await measure('Fresh fixture creation',()=>createDemoState(),50);
 await store.request('/api/live',{method:'POST',body:JSON.stringify({action:'settings',preferences:store.snapshot().settings.preferences})});
 await measure('Saved-session load',()=>createDemoStore(storage),75);
 for(const [name,path] of [['Candidate workspace','/api/live'],['Review workflows','/api/workflows']]){
  await measure(name,async()=>{const response=await store.request(path);assert.equal(response.status,200);await response.json()},50);
 }
 store.setRole('employer');
 await measure('AI hiring workspace',async()=>{const response=await store.request('/api/live?companyId=demo-lumen');assert.equal(response.status,200);await response.json()},50);
 await measure('Rank 24 profiles',async()=>{const response=await store.request('/api/ranking',{method:'POST',body:JSON.stringify({action:'preview',jobId:'demo-role-14'})});const data=await response.json();assert.equal(data.rows.length,24)},75);
 const app=store.snapshot().applications.find(app=>app.candidateId==='demo-alex'&&app.jobId==='demo-role-1');
 const evidenceState=store.snapshot(),evidenceShare=evidenceState.shares.find(s=>s.id==='demo-shared-proof'),evidenceCard=evidenceState.cards.find(c=>c.id===evidenceShare.cardId);
 await measure('Record a scoped evidence check',async()=>{const response=await store.request('/api/workflows',{method:'POST',body:JSON.stringify({action:'evidenceCheck',shareId:evidenceShare.id,cardRevision:evidenceCard.revision||evidenceCard.updatedAt,kind:'artifact',scope:'Reviewed the ownership fields in a fictional dependency register.',source:'Synthetic artifact review for the offline performance benchmark.',limits:'No actual employment, authorship or impact is confirmed.',attested:true})});assert.equal(response.status,200)},50);
 await measure('Persist a chat reply',async()=>{const response=await store.request('/api/live',{method:'POST',body:JSON.stringify({action:'message',applicationId:app.id,text:'Fictional performance check.'})});assert.equal(response.status,200)},50,30);
 const seedBytes=Buffer.byteLength(storage.getItem(DEMO_STORAGE_KEY));
 const clean=createDemoStore(new MemoryStorage()),liveBody=await (await clean.request('/api/live')).text(),payloadBytes=Buffer.byteLength(liveBody);
 const assets=files(join(root,'dist/client')).filter(file=>/\.(js|css)$/.test(file)&&!relative(join(root,'dist/client'),file).startsWith('__qa'));
 const js=assets.filter(file=>file.endsWith('.js')).map(file=>({file:relative(join(root,'dist/client'),file),gzip:gzipSync(readFileSync(file)).length}));
 const css=assets.filter(file=>file.endsWith('.css')).reduce((sum,file)=>sum+gzipSync(readFileSync(file)).length,0);
 const fontBytes=files(join(root,'public/fonts')).filter(file=>file.endsWith('.woff2')).reduce((sum,file)=>sum+readFileSync(file).length,0);
 const javascript=js.reduce((sum,file)=>sum+file.gzip,0),largest=Math.max(...js.map(file=>file.gzip));
 for(const [name,bytes,budget] of [['Saved demo',seedBytes,500000],['Workspace JSON',payloadBytes,250000],['All client JS (gzip)',javascript,350000],['Largest JS chunk (gzip)',largest,200000],['All CSS (gzip)',css,70000],['Local variable fonts',fontBytes,100000]]){
  metrics.push({name,bytes,budget_bytes:budget,pass:bytes<=budget});if(bytes>budget)failures.push(name+' exceeded its size budget');
 }
 const report={round,generatedAt:new Date().toISOString(),engine:'Node '+process.version,fixture:{roles:20,profiles:24},metrics,failures};
 if(reportPath){mkdirSync(dirname(resolve(reportPath)),{recursive:true});writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n')}
 console.log(JSON.stringify(report,null,2));assert.equal(failures.length,0,failures.join('; '));
}finally{globalThis.fetch=originalFetch;rmSync(out,{recursive:true,force:true})}
