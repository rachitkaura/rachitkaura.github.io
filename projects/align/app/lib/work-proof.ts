type Row=Record<string,any>;
export function defaultShareApplication(applications:Row[],jobId?:string):string {
 const scoped=jobId?applications.find(a=>(a.jobId||a.job?.id)===jobId):undefined;
 return scoped?.id||(applications.length===1?applications[0].id:'');
}
export function findWorkShare(shares:Row[],cardId:string,applicationId:string):Row|undefined {
 if(!applicationId)return undefined;
 return shares.find(s=>(s.cardId||s.card?.id)===cardId&&(s.applicationId||s.application?.id)===applicationId);
}
export function guideWorkCard(cards:Row[],shares:Row[],applicationId:string):Row|undefined {
 return cards.find(c=>!findWorkShare(shares,c.id,applicationId))||cards[0];
}
export const workReviewStatuses=['Reviewed — discuss in interview','Follow-up requested'] as const;
export function workReviewIssue(review:string,question:string):string {
 if(!workReviewStatuses.some(status=>status===review))return 'Choose a review status.';
 if(review==='Follow-up requested'&&question.trim().length<20)return 'Write at least 20 characters for the requested follow-up.';
 return '';
}
