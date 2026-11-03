import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import ts from 'typescript';
const out=mkdtempSync(join(tmpdir(),'align-source-test-'));
try {
 const file=join(out,'career.cjs');
 writeFileSync(file,ts.transpileModule(readFileSync('app/lib/career.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
 const {applicationSourceIssue}=createRequire(import.meta.url)(file);
 const valid={name:'Alex Morgan',skills:'Program management, Risk management',experience:'Led a cross-functional launch and documented the result.'};
 assert.equal(applicationSourceIssue(valid),null);
 assert.equal(applicationSourceIssue({...valid,name:''}).field,'name');
 assert.equal(applicationSourceIssue({...valid,name:'  \n '}).field,'name');
 assert.equal(applicationSourceIssue({...valid,name:'x'.repeat(71)}).field,'name');
 assert.equal(applicationSourceIssue({...valid,skills:''}).field,'skills');
 assert.equal(applicationSourceIssue({...valid,skills:', ; \n ,'}).field,'skills');
 assert.equal(applicationSourceIssue({...valid,skills:'x'.repeat(1001)}).field,'skills');
 assert.equal(applicationSourceIssue({...valid,experience:undefined}).field,'experience');
 assert.equal(applicationSourceIssue({...valid,experience:' \n '}).field,'experience');
 assert.equal(applicationSourceIssue({...valid,experience:'x'.repeat(20001)}).field,'experience');
 assert.equal(applicationSourceIssue({...valid,name:'李雷'}),null);
 assert.equal(applicationSourceIssue({name:'x'.repeat(70),skills:'x'.repeat(1000),experience:'x'.repeat(20000)}),null);
 assert.deepEqual(valid,{name:'Alex Morgan',skills:'Program management, Risk management',experience:'Led a cross-functional launch and documented the result.'});
 console.log('Application source checks passed: 13 required-field, whitespace, boundary, and Unicode cases.');
} finally {rmSync(out,{recursive:true,force:true})}
