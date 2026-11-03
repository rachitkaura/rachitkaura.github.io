import type {Metadata,Viewport} from 'next';
import './globals.css';
import './live.css';
import './demo.css';
import './ux.css';
import './responsive.css';
import './focus.css';
import './swipe-feedback.css';
import './inbox.css';
import './demo-layout.css';
import './swipe-screen.css';
import './materials.css';
import './evidence.css';
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',interactiveWidget:'resizes-content'};
export const metadata:Metadata={title:'Align — Your next move, mutual.',description:'Less applying. More connecting. Discover a better way to find your next role.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><head><link rel="preload" href="/fonts/dm-sans-latin-variable.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/><link rel="preload" href="/fonts/manrope-latin-variable.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/><script dangerouslySetInnerHTML={{__html:"try{var t=localStorage.getItem('align-theme');document.documentElement.dataset.theme=(t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches))?'dark':'light'}catch(e){document.documentElement.dataset.theme=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}"}}/></head><body>{children}</body></html>}
