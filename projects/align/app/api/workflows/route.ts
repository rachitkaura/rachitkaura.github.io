import {env} from 'cloudflare:workers';
import {createWorkflows} from '../../lib/workflows-server';
export async function GET(req:Request){return createWorkflows(env.DB!,{adminEmails:env.ALIGN_ADMIN_EMAILS})(req)}
export async function POST(req:Request){return createWorkflows(env.DB!,{adminEmails:env.ALIGN_ADMIN_EMAILS})(req)}
