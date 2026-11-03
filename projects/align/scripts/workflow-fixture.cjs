// Exercise the real solo calibration API when older suites need a published role.
exports.calibrateSolo=async(db,jobId,userId='owner')=>{
 const {createWorkflows}=require('../app/lib/workflows-server.ts');const workflow=createWorkflows(db);
 const call=async body=>{const r=await workflow(new Request('https://align.test/api/workflows',{method:'POST',headers:{origin:'https://align.test','oai-authenticated-user-id':userId,'oai-authenticated-user-email':'owner@team.test','Content-Type':'application/json'},body:JSON.stringify(body)}));const d=await r.json();if(!r.ok)throw Error(JSON.stringify(d));};
 await call({action:'startCalibration',jobId});
 const k=await db.prepare('SELECT id FROM hiring_calibrations WHERE job_id=? ORDER BY version DESC LIMIT 1').bind(jobId).first();
 const rubric={essential:'Demonstrated delivery of relevant projects.',trainable:'The specific tools can be learned with mentoring.',transferable:'Comparable methods from another industry count.'};
 await call({action:'vote',calibrationId:k.id,...rubric,votes:['a','b','c'].map(id=>({id,decision:'Discuss',reason:'Review the evidence of personal contribution and outcomes.'}))});
 await call({action:'approveCalibration',calibrationId:k.id,...rubric,resolution:'Evidence of a comparable outcome matters more than an identical tool.'});
};
