type Row=Record<string,any>;
export const emptyWorkEvidence=()=>({count:0,checks:0,firstTitle:''});
export function workEvidenceSummary(shares:Row[],cards:Row[]){
 const selected=shares.filter(s=>cards.some(c=>c.id===s.cardId));
 return {count:selected.length,checks:selected.reduce((n,s)=>n+(s.checks?.length||0),0),firstTitle:cards.find(c=>c.id===selected[0]?.cardId)?.title||''};
}
export function workChangeConfirmed(shares:Row[],payload:Row){
 const share=shares.find(s=>s.id===payload.shareId);
 if(payload.action==='unshare')return !share;
 if(!share)return false;
 if(payload.action==='reviewProof')return share.review===payload.review&&(share.question||'').trim()===(payload.question||'').trim();
 const check=(share.checks||[]).find((c:Row)=>c.kind===payload.kind);
 if(payload.action==='removeEvidenceCheck')return !check;
 return payload.action==='evidenceCheck'&&check&&check.scope===payload.scope.trim()&&check.source===payload.source.trim()&&check.limits===payload.limits.trim();
}
