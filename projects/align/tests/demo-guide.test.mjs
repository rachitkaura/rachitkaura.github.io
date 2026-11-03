import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import ts from 'typescript';
const out=mkdtempSync(join(tmpdir(),'align-guide-test-'));
try {
 const file=join(out,'guide.cjs');
 writeFileSync(file,ts.transpileModule(readFileSync('app/lib/demo-guide.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
 const {demoSteps,revealDemoTarget}=createRequire(import.meta.url)(file);
 assert.deepEqual(demoSteps.candidate.map(s=>[s.id,s.task]),[['swipe','Swipe'],['fit','Swipe'],['nextstep','Messages'],['proof','Work proof']]);
 assert.deepEqual(demoSteps.employer.map(s=>[s.id,s.task]),[['swipe','Swipe'],['criteria','Hiring'],['rank','Candidate ranking'],['nextstep','Messages']]);
 assert.equal(new Set(Object.values(demoSteps).flat().map(s=>s.id)).size,6);
 // Regression: revealing a step must expand its content, focus without native
 // scrolling, and make exactly one deliberate viewport move, even on repeats.
 const calls=[];
 const target={querySelector:selector=>{assert.equal(selector,'details[data-demo-expand]');return {setAttribute:(key,value)=>calls.push(['expand',key,value])}},focus:options=>calls.push(['focus',options]),scrollIntoView:options=>calls.push(['scroll',options])};
 revealDemoTarget(null);assert.deepEqual(calls,[]);
 revealDemoTarget(target);
 const expected=[['expand','open',''],['focus',{preventScroll:true}],['scroll',{block:'start',behavior:'auto'}]];
 assert.deepEqual(calls,expected);
 revealDemoTarget(target);assert.deepEqual(calls,[...expected,...expected]);
 const noDisclosure=[];
 revealDemoTarget({querySelector:()=>null,focus:options=>noDisclosure.push(['focus',options]),scrollIntoView:options=>noDisclosure.push(['scroll',options])});
 assert.deepEqual(noDisclosure,expected.slice(1));
 console.log('Guided demo regression checks passed: all eight destinations, repeat actions, focus and scroll ordering.');
} finally {rmSync(out,{recursive:true,force:true})}
