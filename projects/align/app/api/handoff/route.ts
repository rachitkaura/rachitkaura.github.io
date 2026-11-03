import {env} from 'cloudflare:workers';
import {createHandoff} from '../../lib/handoff-server';
export async function GET(req:Request){return createHandoff(env.DB!,{adminEmails:env.ALIGN_ADMIN_EMAILS})(req)}
