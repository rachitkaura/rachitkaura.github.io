'use client';
import {useEffect} from 'react';
// Use the visible viewport so browser chrome and on-screen keyboards do not hide controls.
export function useViewportBehavior(){
 useEffect(()=>{
  const root=document.documentElement,viewport=window.visualViewport;
  let frame=0,stableHeight=viewport?.height||window.innerHeight;
  function update(){
   const height=viewport?.height||window.innerHeight,top=viewport?.offsetTop||0,scale=viewport?.scale||1;
   const active=document.activeElement,editing=active instanceof HTMLTextAreaElement||active instanceof HTMLInputElement&&!['checkbox','radio','range','button','submit','file','color'].includes(active.type)||active instanceof HTMLElement&&active.isContentEditable;
   if(!editing&&scale===1)stableHeight=height;
   const keyboard=Boolean(editing&&scale===1&&stableHeight-height>Math.min(140,stableHeight*.2));
   root.style.setProperty('--ux-viewport-height',height+'px');root.style.setProperty('--ux-viewport-top',top+'px');root.dataset.keyboardOpen=keyboard?'true':'false';
   if(keyboard&&active instanceof HTMLElement){const rect=active.getBoundingClientRect();if(rect.top<top+56||rect.bottom>top+height-20)active.scrollIntoView({block:'nearest',behavior:'auto'})}
  }
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(update)};
  update();window.addEventListener('resize',schedule);document.addEventListener('focusin',schedule);document.addEventListener('focusout',schedule);viewport?.addEventListener('resize',schedule);viewport?.addEventListener('scroll',schedule);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',schedule);document.removeEventListener('focusin',schedule);document.removeEventListener('focusout',schedule);viewport?.removeEventListener('resize',schedule);viewport?.removeEventListener('scroll',schedule);root.style.removeProperty('--ux-viewport-height');root.style.removeProperty('--ux-viewport-top');delete root.dataset.keyboardOpen};
 },[]);
}
