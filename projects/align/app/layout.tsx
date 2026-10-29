import type {Metadata} from 'next';
import './globals.css';
import './live.css';
export const metadata:Metadata={title:'Align — Your next move, mutual.',description:'Less applying. More connecting. Discover a better way to find your next role.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:"try{var t=localStorage.getItem('align-theme');document.documentElement.dataset.theme=(t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches))?'dark':'light'}catch(e){document.documentElement.dataset.theme=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}"}}/></head><body>{children}</body></html>}
