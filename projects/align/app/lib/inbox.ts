type Row=Record<string,any>;
export function conversationName(application:Row){return application.side==='candidate'?application.job.companyName:application.candidate.name}
export function inboxRows(applications:Row[],messages:Record<string,Row[]>,query=''){
 const search=query.trim().toLocaleLowerCase();
 return applications.map(application=>{
  const last=(messages[application.id]||[]).at(-1),name=conversationName(application);
  return {application,name,last,preview:last?`${last.mine?'You: ':''}${last.text}`:'You matched. Start a conversation.',time:last?.time||application.updatedAt};
 }).filter(row=>!search||(row.name+' '+row.application.job.title).toLocaleLowerCase().includes(search))
 .sort((a,b)=>(Date.parse(b.time)||0)-(Date.parse(a.time)||0)||a.application.id.localeCompare(b.application.id));
}
export function clearSentDraft(drafts:Record<string,string>,conversationId:string,submittedDraft:string){
 return drafts[conversationId]===submittedDraft?{...drafts,[conversationId]:''}:drafts;
}
export function messageDay(value:string){const date=new Date(value);return Number.isFinite(date.getTime())?`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`:''}
export function messageDayLabel(value:string,now=new Date()){
 const date=new Date(value);if(!Number.isFinite(date.getTime()))return '';
 if(messageDay(value)===messageDay(now.toISOString()))return 'Today';
 const yesterday=new Date(now);yesterday.setDate(yesterday.getDate()-1);
 if(messageDay(value)===messageDay(yesterday.toISOString()))return 'Yesterday';
 return date.toLocaleDateString(undefined,{month:'short',day:'numeric',...(date.getFullYear()!==now.getFullYear()?{year:'numeric'}:{})});
}
