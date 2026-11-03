'use client';
import {Fragment,useEffect,useRef,useState,type KeyboardEvent} from 'react';
import {ArrowDown,ArrowLeft,Bell,CalendarDays,ChevronRight,Clock,Info,LoaderCircle,LockKeyhole,MessageCircle,Paperclip,Search,Send,X} from 'lucide-react';
import {availableMaterials} from '../lib/profile-materials';
import {clearSentDraft,conversationName,inboxRows,messageDay,messageDayLabel} from '../lib/inbox';
import {focusWithoutScrolling,historyScrollTarget,lockPageScroll,pageScrollTop,scrollPageTo} from '../lib/scroll';
type R=Record<string,any>;
type Props={visible:boolean;applications:R[];messages:Record<string,R[]>;selectedId:string;onSelect:(id:string)=>void;busy:boolean;statusError?:string;onSend:(id:string,text:string)=>Promise<boolean>;onSchedule:(application:R)=>void;onNextStep:(application:R)=>void;onDetails:(application:R)=>void;unread:number;updatesOpen:boolean;onUpdates:()=>void;onSwipe:()=>void};
const clock=(value:string)=>new Date(value).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
function initials(name:string){return name.split(/\s+/).map(part=>part[0]).join('').slice(0,2).toUpperCase()}

export function Inbox({visible,applications,messages,selectedId,onSelect,busy,statusError,onSend,onSchedule,onNextStep,onDetails,unread,updatesOpen,onUpdates,onSwipe}:Props){
 const [query,setQuery]=useState(''),[drafts,setDrafts]=useState<Record<string,string>>({}),[sending,setSending]=useState<string[]>([]),[failed,setFailed]=useState<Record<string,boolean>>({}),[mobile,setMobile]=useState(false),[newMessages,setNewMessages]=useState(false);
 const root=useRef<HTMLDivElement>(null),history=useRef<HTMLDivElement>(null),heading=useRef<HTMLHeadingElement>(null),textarea=useRef<HTMLTextAreaElement>(null),list=useRef<HTMLDivElement>(null),opener=useRef<HTMLButtonElement|null>(null),listPosition=useRef({page:0,list:0}),sendingIds=useRef(new Set<string>());
 const positions=useRef<Record<string,{top:number;atBottom:boolean}>>({}),lastSurface=useRef<HTMLElement|null>(null),lastMessage=useRef<Record<string,string>>({});
 const rows=inboxRows(applications,messages,query),conversation=applications.find(application=>application.id===selectedId)||(!mobile?inboxRows(applications,messages)[0]?.application:undefined);
 const id=conversation?.id||'',name=conversation?conversationName(conversation):'',threadMessages=messages[id]||[],draft=drafts[id]||'',step=conversation?.data?.nextStep,overdue=Boolean(step&&Date.parse(step.dueAt)<Date.now());
 useEffect(()=>{const media=window.matchMedia('(max-width:600px)'),update=()=>setMobile(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update)},[]);
 useEffect(()=>{if(selectedId&&!applications.some(application=>application.id===selectedId))onSelect('')},[selectedId,applications.map(application=>application.id).join('|')]);
 useEffect(()=>{
  if(!visible||!mobile||!selectedId||!conversation)return;
  const release=lockPageScroll();focusWithoutScrolling(heading.current);return release;
 },[visible,mobile,selectedId,conversation?.id]);
 useEffect(()=>{if(!visible||mobile)return;function resize(){if(root.current)root.current.style.setProperty('--inbox-height',Math.max(360,Math.min(800,window.innerHeight-root.current.getBoundingClientRect().top-24))+'px')}resize();window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize)},[visible,mobile,updatesOpen]);
 useEffect(()=>{
  const element=history.current;if(!visible||!element||!id)return;
  const surfaceChanged=element!==lastSurface.current,last=threadMessages.at(-1);
  lastSurface.current=element;
  const incoming=Boolean(last&&!last.mine&&lastMessage.current[id]&&lastMessage.current[id]!==last.id);
  lastMessage.current[id]=last?.id||'';
  const frame=requestAnimationFrame(()=>{
   if(!element.isConnected)return;
   const saved=positions.current[id];
   if(surfaceChanged&&saved&&!saved.atBottom){element.scrollTop=saved.top;setNewMessages(false)}
   else if(surfaceChanged||!saved||saved.atBottom||last?.mine){element.scrollTop=element.scrollHeight;setNewMessages(false)}
   else if(incoming){element.scrollTop=saved.top;setNewMessages(true)}
  });
  return()=>cancelAnimationFrame(frame);
 },[visible,id,threadMessages.length,threadMessages.at(-1)?.id]);
 useEffect(()=>{
  const element=history.current;if(!visible||!element||!id)return;
  const observer=new ResizeObserver(()=>{if(positions.current[id]?.atBottom!==false)element.scrollTop=element.scrollHeight});observer.observe(element);return()=>observer.disconnect();
 },[visible,id]);
 useEffect(()=>{const field=textarea.current;if(!field)return;if(window.CSS?.supports('field-sizing','content')){field.style.height='auto';return}const resize=()=>{field.style.height='auto';field.style.height=Math.min(field.scrollHeight+field.offsetHeight-field.clientHeight,144)+'px'};resize();window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize)},[visible,id,draft]);
 function select(application:R,button:HTMLButtonElement){opener.current=button;listPosition.current={page:pageScrollTop(),list:list.current?.scrollTop||0};onSelect(application.id);setNewMessages(false)}
 function back(){onSelect('');requestAnimationFrame(()=>requestAnimationFrame(()=>{scrollPageTo(listPosition.current.page);if(list.current)list.current.scrollTop=listPosition.current.list;focusWithoutScrolling(opener.current||list.current?.querySelector<HTMLElement>('button'))}))}
 function bottom(){const element=history.current;if(element){element.scrollTop=element.scrollHeight;positions.current[id]={top:element.scrollTop,atBottom:true};setNewMessages(false)}}
 function historyKey(event:KeyboardEvent<HTMLDivElement>){if(event.target!==event.currentTarget||event.ctrlKey||event.metaKey||event.altKey)return;const element=event.currentTarget,max=element.scrollHeight-element.clientHeight,target=historyScrollTarget(event.key,element.scrollTop,element.clientHeight,max);if(target!==null){event.preventDefault();positions.current[id]={top:target,atBottom:max-target<60};element.scrollTop=target;if(max-target<60)setNewMessages(false)}}
 async function send(){
  const submitted=drafts[id]||'',conversationId=id;if(!submitted.trim()||busy||sendingIds.current.has(conversationId))return;
  sendingIds.current.add(conversationId);setSending(Array.from(sendingIds.current));setFailed(current=>({...current,[conversationId]:false}));
  try{if(await onSend(conversationId,submitted.trim()))setDrafts(current=>clearSentDraft(current,conversationId,submitted));else setFailed(current=>({...current,[conversationId]:true}))}
  catch{setFailed(current=>({...current,[conversationId]:true}))}
  finally{sendingIds.current.delete(conversationId);setSending(Array.from(sendingIds.current))}
 }
 if(!visible)return null;
 return <div className={'ux-inbox'+(conversation&&selectedId?' has-selection':'')+(!applications.length?' is-empty':'')} ref={root}>
  <aside className="ux-inbox-list" aria-label="Conversations">
   <div className="ux-inbox-list-tools"><div><h2>Conversations <span>{applications.length}</span></h2><button className="text-link" onClick={onUpdates} aria-expanded={updatesOpen}><Bell size={15}/>Updates{unread>0&&<span className="ux-count">{unread}</span>}</button></div>{applications.length>0&&<label className="ux-inbox-search"><Search size={16} aria-hidden="true"/><span className="sr-only">Search conversations</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search conversations"/></label>}</div>
   <div className="ux-inbox-rows" ref={list}>{rows.map(row=><button className={'ux-inbox-row'+(conversation?.id===row.application.id?' is-selected':'')} key={row.application.id} aria-current={selectedId===row.application.id?'true':undefined} onClick={event=>select(row.application,event.currentTarget)}><span className="ux-inbox-avatar" aria-hidden="true">{initials(row.name)}</span><span className="ux-inbox-row-content"><span className="ux-inbox-row-top"><b>{row.name}</b><time dateTime={row.time}>{messageDayLabel(row.time)}</time></span><span className="ux-inbox-role">{row.application.job.title}</span><span className="ux-inbox-preview">{row.preview}</span></span><ChevronRight size={15} aria-hidden="true"/></button>)}{!rows.length&&<div className="ux-inbox-empty"><MessageCircle size={25}/><h3>{query?'No conversations found':'Your conversations start here'}</h3><p>{query?'Try a company, person or role name.':'A mutual match opens a private conversation with the candidate and hiring team.'}</p>{query?<button className="text-link" onClick={()=>setQuery('')}>Clear search</button>:<button className="outline-btn" onClick={onSwipe}>Back to swiping</button>}</div>}</div>
   {rows.length>0&&<p className="ux-inbox-privacy"><LockKeyhole size={13}/>Conversations open after a mutual match.</p>}
  </aside>
  {conversation?<section key={id} className={'ux-inbox-thread'+(selectedId?' is-open':'')} aria-label={'Conversation with '+name}>
   <header className="ux-inbox-thread-header"><button className="icon-btn ux-inbox-back" aria-label="Back to conversations" onClick={back}><ArrowLeft size={20}/></button><span className="ux-inbox-avatar" aria-hidden="true">{initials(name)}</span><div><h2 ref={heading} tabIndex={-1}>{name}</h2><p title={conversation.job.title}>{conversation.job.title}</p></div><button className="icon-btn" aria-label="View application details" title="View application details" onClick={()=>onDetails(conversation)}><Info size={19}/></button></header>
   <div className="ux-inbox-context"><button className={'ux-inbox-next-step'+(overdue?' is-overdue':'')} data-demo-target="nextstep" onClick={()=>onNextStep(conversation)}><Clock size={15}/><span><b>{overdue?'Next step overdue':'Next step'}</b><small>{step?`${step.owner===conversation.side?'You':step.owner==='candidate'?'Candidate':'Hiring team'} · ${new Date(step.dueAt).toLocaleDateString(undefined,{month:'short',day:'numeric'})}`:'Agree what happens next'}</small></span><ChevronRight size={14}/></button><button className="ux-inbox-interview" onClick={()=>onSchedule(conversation)}><CalendarDays size={16}/>Interview</button>{availableMaterials(conversation.data?.swipeMaterials).length>0&&<button className="ux-inbox-materials" onClick={()=>onDetails(conversation)}><Paperclip size={16}/>Materials <span>{availableMaterials(conversation.data.swipeMaterials).length}</span></button>}</div>
   {statusError&&!failed[id]&&<p className="ux-inbox-send-error" role="alert">{statusError}</p>}
   <div className="ux-inbox-history-wrap"><div key={id} ref={history} className="live-chat-body ux-inbox-history" role="region" aria-label="Conversation history" tabIndex={0} onKeyDown={historyKey} onScroll={event=>{const element=event.currentTarget,atBottom=element.scrollHeight-element.clientHeight-element.scrollTop<60;positions.current[id]={top:element.scrollTop,atBottom};if(atBottom)setNewMessages(false)}}>{!threadMessages.length&&<div className="ux-inbox-first-message"><MessageCircle size={23}/><b>You matched with {name}.</b><p>Say hello and discuss the role when you’re ready.</p></div>}{threadMessages.map((message,index)=><Fragment key={message.id}>{(!index||messageDay(message.time)!==messageDay(threadMessages[index-1].time))&&<div className="ux-inbox-date">{messageDayLabel(message.time)}</div>}<article className={'live-bubble ux-inbox-bubble'+(message.mine?' mine':'')}><p>{message.text}</p><footer><span>{message.mine?'You':message.sender}</span><time dateTime={message.time}>{clock(message.time)}</time></footer></article></Fragment>)}</div>{newMessages&&<button className="ux-inbox-new-messages" onClick={bottom}>New messages<ArrowDown size={14}/></button>}</div>
   <form className="live-chat-form ux-inbox-composer" onSubmit={event=>{event.preventDefault();void send()}}>{failed[id]&&<p className="ux-inbox-send-error" role="alert"><span>Not confirmed. Check chat first.<span className="sr-only">Your draft is retained. Check delivery before retrying.</span></span><button type="button" className="icon-btn" aria-label="Dismiss delivery notice" onClick={()=>setFailed(current=>({...current,[id]:false}))}><X size={16}/></button></p>}<label className="sr-only" htmlFor="inbox-message">Message {name}</label><div><textarea id="inbox-message" ref={textarea} aria-label="Message" value={draft} onChange={event=>{setDrafts(current=>({...current,[id]:event.target.value}));setFailed(current=>({...current,[id]:false}))}} rows={1} maxLength={3000} placeholder={`Message ${name}…`} onKeyDown={event=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();void send()}}}/><button className="primary-btn" aria-label="Send message" disabled={busy||sending.includes(id)||!draft.trim()}>{sending.includes(id)?<LoaderCircle size={19} className="spinning"/>:<Send size={19}/>}</button></div><small><LockKeyhole size={11}/>Candidate and hiring team only{draft.length>2700&&<span>{draft.length}/3000</span>}</small></form>
  </section>:<section className="ux-inbox-pick"><MessageCircle size={30}/><h2>Choose a conversation</h2><p>Your messages, next step and interview plans stay together here.</p></section>}
 </div>;
}
