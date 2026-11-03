import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import ts from 'typescript';
const out=mkdtempSync(join(tmpdir(),'align-nav-test-'));
try {
 const file=join(out,'navigation.cjs');
 writeFileSync(file,ts.transpileModule(readFileSync('app/lib/workspace-navigation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
 const nav=createRequire(import.meta.url)(file);
 let count=0;
 for(const mode of ['candidate','employer']) {
  for(const task of mode==='candidate'?nav.candidateTasks:nav.employerTasks) {
   const route={mode,task,job:'job a/&?'};
   const href=nav.routeHref('/demo',route);
   assert.ok(href.startsWith('/demo?'));
   assert.deepEqual(nav.routeFromSearch(href.slice(href.indexOf('?'))),route);
   count++;
  }
 }
 assert.deepEqual(nav.routeFromSearch(''),{mode:'candidate',task:'Swipe',job:undefined});
 assert.equal(nav.routeFromSearch('?workspace=candidate&section=hiring-criteria').task,'Swipe');
 assert.equal(nav.routeFromSearch('?workspace=employer&section=profile').task,'Swipe');
 assert.equal(nav.routeFromSearch('?workspace=employer&section=pipeline').task,'Tracker');
 assert.equal(nav.routeFromSearch('?workspace=unknown&section=inbox').mode,'candidate');
 assert.equal(nav.routeFromSearch('?job='+('x'.repeat(500))).job.length,120);
 assert.equal(nav.primaryItems('candidate').length,4);
 assert.equal(nav.primaryItems('employer').length,4);
 assert.equal(nav.primaryItems('candidate')[0][1],'Swipe');
 assert.equal(nav.primaryItems('employer')[0][1],'Swipe');
 assert.deepEqual(nav.contextItems('candidate','Swipe'),[]);
 assert.equal(nav.validTask('candidate','Roles'),false);
 assert.equal(nav.validTask('candidate','Discover'),false);
 assert.equal(nav.validTask('employer','Discover'),false);
 assert.equal(nav.routeFromSearch('?workspace=candidate&section=discovery').task,'Swipe');
 assert.equal(nav.routeFromSearch('?workspace=candidate&section=jobs').task,'Swipe');
 assert.equal(nav.routeFromSearch('?workspace=candidate&section=jobs&job=old-job').task,'Swipe');
 assert.equal(nav.routeHref('/demo',{mode:'candidate',task:'Roles'}),'/demo?workspace=candidate&section=swipe');
 assert.equal(nav.routeFromSearch('?workspace=employer&section=jobs').task,'Hiring');
 assert.ok(nav.contextItems('employer','Swipe').some(([,task])=>task==='Candidate ranking'));
 assert.equal(nav.canonicalTask('candidate','Documents'),'Tracker');
 assert.deepEqual(nav.contextItems('employer','Candidate ranking').map(x=>x[1]),['Swipe','Candidate ranking']);assert.equal(nav.canonicalTask('employer','Shortlist'),'Candidate ranking');assert.equal(nav.taskView('Profiles'),'Live hiring');
 console.log(`Workspace navigation passed: ${count} route round trips and 22 boundary/context checks.`);
} finally {rmSync(out,{recursive:true,force:true})}
