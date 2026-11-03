import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";
import {createSwipeServer} from '../app/lib/swipe-server';
import {createEmailPreferences,processEmailNotifications} from '../app/lib/email-notifications';

const worker = {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    const path=new URL(request.url).pathname;
    if(env.DB&&path==='/api/swipes')return createSwipeServer(env.DB,{adminEmails:env.ALIGN_ADMIN_EMAILS}).handle(request,p=>ctx.waitUntil(p.then(()=>processEmailNotifications(env.DB!,env))));
    if(env.DB&&path==='/api/notification-settings')return createEmailPreferences(env.DB,env)(request);
    if(env.DB&&(path.startsWith('/api/')||path==='/'||path==='/demo'))ctx.waitUntil(createSwipeServer(env.DB,{adminEmails:env.ALIGN_ADMIN_EMAILS}).process().then(()=>processEmailNotifications(env.DB!,env)).catch(()=>{}));
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    return runWithConnectorBinding(binding, async () => {
      const response=await handler.fetch(request, env, ctx);
      if(env.DB&&request.method==='POST')ctx.waitUntil(processEmailNotifications(env.DB,env).catch(()=>{}));
      return response;
    });
  },
  scheduled(_event:ScheduledController,env:Cloudflare.Env,ctx:ExecutionContext){if(env.DB)ctx.waitUntil(createSwipeServer(env.DB,{adminEmails:env.ALIGN_ADMIN_EMAILS}).process().then(()=>processEmailNotifications(env.DB!,env)))},
};

export default worker;
