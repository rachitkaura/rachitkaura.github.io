'use client';
import {useEffect,useRef,type ReactNode} from 'react';
import {X} from 'lucide-react';
import {focusWithoutScrolling,lockPageScroll} from '../lib/scroll';

export function FocusDialog({label,closeLabel='Close details',onClose,children}:{label:string;closeLabel?:string;onClose:()=>void;children:ReactNode}){
 const dialog=useRef<HTMLDialogElement>(null),close=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  const element=dialog.current;if(!element)return;
  const previous=document.activeElement as HTMLElement,release=lockPageScroll();
  element.showModal();focusWithoutScrolling(close.current);
  return()=>{element.close();release();if(!document.querySelector('dialog[open]'))focusWithoutScrolling(previous?.isConnected&&previous.getClientRects().length?previous:document.querySelector<HTMLElement>('.ux-account-menu>summary'))};
 },[]);
 return <dialog ref={dialog} className="ux-focus-dialog" aria-label={label} onCancel={event=>{event.preventDefault();onClose()}}><button ref={close} className="icon-btn ux-focus-dialog-close" aria-label={closeLabel} onClick={onClose}><X size={20}/></button>{children}</dialog>;
}
