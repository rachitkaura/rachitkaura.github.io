import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import ts from 'typescript';

const out=mkdtempSync(join(tmpdir(),'align-feedback-test-'));
try{
 for(const name of ['swipe-feedback','interest-outbox'])writeFileSync(join(out,name+'.js'),ts.transpileModule(readFileSync(`app/lib/${name}.ts`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
 const {swipeFeedback}=createRequire(import.meta.url)(join(out,'swipe-feedback.js'));
 const entry=(id,dueAt,state='queued',error)=>({id,dueAt,state,error,label:id,actorId:'owner',payload:{action:'interest',side:'candidate',jobId:id}});
 const older=entry('older',10000),latest=entry('latest',15000),failed=entry('failed',20000,'failed','Unable to send.');
 for(const entries of [[older,latest,failed],[failed,latest,older]]){
  const before=structuredClone(entries),feedback=swipeFeedback(entries,6000);
  assert.equal(feedback.latest.id,'latest','Collapsed Undo must select the latest active swipe, independent of live/demo record order.');
  assert.equal(feedback.pendingCount,2);assert.equal(feedback.attentionCount,1);assert.equal(feedback.remaining,9);assert.equal(feedback.canUndo,true);assert.equal(feedback.progress,90);
  assert.deepEqual(entries,before,'Presentation must not mutate queue records or deadlines.');
 }
 assert.equal(swipeFeedback([older],9999).canUndo,true);
 assert.equal(swipeFeedback([older],10000).canUndo,false,'Undo ends at the exact ten-second deadline.');
 assert.equal(swipeFeedback([older],10000).remaining,0);
 assert.equal(swipeFeedback([older],10000).status,'Sending…');
 assert.equal(swipeFeedback([latest,older],10000).remaining,5,'Another swipe retains its independent window.');
 assert.equal(swipeFeedback([entry('saving',15000,'saving')],6000).canUndo,false);
 assert.equal(swipeFeedback([entry('sending',15000,'sending')],6000).canUndo,false);
 assert.equal(swipeFeedback([failed],6000).status,'Needs attention');
 assert.equal(swipeFeedback([failed],6000).pendingCount,0);
 assert.equal(swipeFeedback([failed],6000).canUndo,false);
 assert.equal(swipeFeedback([entry('uncertain-undo',15000,'queued','Undo could not be confirmed.')],6000).attentionCount,1);
 assert.equal(swipeFeedback([],6000).latest,undefined);
 console.log('Swipe feedback checks passed: latest-swipe selection, independent deadlines, exact undo boundary, saving/sending states, visible failures, and immutable records.');
}finally{rmSync(out,{recursive:true,force:true})}
