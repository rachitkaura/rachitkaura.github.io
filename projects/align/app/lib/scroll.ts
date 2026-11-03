// A single lock owner prevents one dialog from unlocking a page underneath another.
let locks=0;
let saved:{x:number;y:number;body:Record<string,string>;html:Record<string,string>}|null=null;
const bodyKeys=['position','top','left','right','width','overflow','paddingRight'] as const;
const htmlKeys=['overflow','overscrollBehavior','scrollBehavior'] as const;
export function pageScrollTop(){return saved?.y??window.scrollY}
export function scrollPageTo(top:number){
 if(saved){saved.y=top;document.body.style.top=-top+'px';return}
 window.scrollTo({top,behavior:'auto'});
}
export function focusWithoutScrolling(target:HTMLElement|null|undefined){if(target?.isConnected)target.focus({preventScroll:true})}
export function lockPageScroll(){
 if(!locks++){
  const body=document.body,html=document.documentElement,before=html.clientWidth;
  saved={x:window.scrollX,y:window.scrollY,body:Object.fromEntries(bodyKeys.map(k=>[k,body.style[k]])),html:Object.fromEntries(htmlKeys.map(k=>[k,html.style[k]]))};
  Object.assign(body.style,{position:'fixed',top:-saved.y+'px',left:'0',right:'0',width:'100%',overflow:'hidden'});
  Object.assign(html.style,{overflow:'hidden',overscrollBehavior:'none',scrollBehavior:'auto'});
  const expansion=html.clientWidth-before;if(expansion>0)body.style.paddingRight=(parseFloat(getComputedStyle(body).paddingRight)||0)+expansion+'px';
 }
 let released=false;
 return ()=>{if(released)return;released=true;if(--locks||!saved)return;const restore=saved;saved=null;
  for(const k of bodyKeys)document.body.style[k]=restore.body[k];
  // Restore position before re-enabling the page's optional smooth scrolling.
  document.documentElement.style.overflow=restore.html.overflow;document.documentElement.style.overscrollBehavior=restore.html.overscrollBehavior;
  window.scrollTo({left:restore.x,top:restore.y,behavior:'auto'});document.documentElement.style.scrollBehavior=restore.html.scrollBehavior;
 };
}
export function historyScrollTarget(key:string,top:number,height:number,max:number){
 if(key==='Home')return 0;if(key==='End')return Math.max(0,max);
 const steps:Record<string,number>={ArrowUp:-40,ArrowDown:40,PageUp:-height*.85,PageDown:height*.85};
 return key in steps?Math.max(0,Math.min(max,top+steps[key])):null;
}
