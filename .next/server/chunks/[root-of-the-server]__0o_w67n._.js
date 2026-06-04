module.exports=[93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},24361,(e,t,r)=>{t.exports=e.x("util",()=>require("util"))},18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},88947,(e,t,r)=>{t.exports=e.x("stream",()=>require("stream"))},54799,(e,t,r)=>{t.exports=e.x("crypto",()=>require("crypto"))},9348,e=>{"use strict";var t=e.i(47909),r=e.i(74017),a=e.i(96250),o=e.i(59756),n=e.i(61916),i=e.i(74677),s=e.i(69741),l=e.i(16795),p=e.i(87718),d=e.i(95169),c=e.i(47587),u=e.i(66012),m=e.i(70101),E=e.i(26937),_=e.i(10372),h=e.i(93695);e.i(52474);var y=e.i(220),v=e.i(89171),R=e.i(15270),w=e.i(68105);async function x(e){try{let t=await (0,w.requireAuth)(e);if((0,w.requireRole)(t,["owner","hr","employee"]),null==t.companyId)throw new w.HttpError(403,"No company scope");let r=new URL(e.url),a=r.searchParams.get("employee_id"),o=parseInt(r.searchParams.get("month")||"0",10),n=parseInt(r.searchParams.get("year")||"0",10);if(!o||!n)throw new w.HttpError(400,"Missing month or year");if(a){let e=await R.prisma.$queryRaw`
        SELECT * FROM evaluations
        WHERE company_id   = ${t.companyId}
          AND evaluator_id = ${t.id}
          AND employee_id  = ${a}
          AND period_month = ${o}
          AND period_year  = ${n}
        LIMIT 1
      `;return v.NextResponse.json(e[0]??null)}let i=("owner"===t.role||"hr"===t.role?await R.prisma.$queryRaw`
        SELECT ev.*,
               emp.name AS employee_name,
               u.name   AS evaluator_name
        FROM   evaluations ev
        LEFT JOIN employees emp
               ON emp.employee_id = ev.employee_id
              AND emp.company_id  = ev.company_id
        LEFT JOIN users u ON u.id = ev.evaluator_id
        WHERE  ev.company_id   = ${t.companyId}
          AND  ev.period_month = ${o}
          AND  ev.period_year  = ${n}
        ORDER BY emp.name
      `:await R.prisma.$queryRaw`
        SELECT ev.*,
               emp.name AS employee_name,
               u.name   AS evaluator_name
        FROM   evaluations ev
        LEFT JOIN employees emp
               ON emp.employee_id = ev.employee_id
              AND emp.company_id  = ev.company_id
        LEFT JOIN users u ON u.id = ev.evaluator_id
        WHERE  ev.company_id   = ${t.companyId}
          AND  ev.evaluator_id = ${t.id}
          AND  ev.period_month = ${o}
          AND  ev.period_year  = ${n}
        ORDER BY emp.name
      `).map(e=>Object.fromEntries(Object.entries(e).map(([e,t])=>[e,"bigint"==typeof t?Number(t):t])));return v.NextResponse.json(i)}catch(e){return(0,w.errorResponse)(e)}}async function N(e){try{let t=await (0,w.requireAuth)(e);if((0,w.requireRole)(t,["owner","hr","employee"]),null==t.companyId)throw new w.HttpError(403,"No company scope");let{employee_id:r,period_month:a,period_year:o,score_accuracy:n,score_innovation:i,score_speed:s,score_development:l,score_quality_check:p,score_prioritization:d,score_independence:c,score_deadlines:u,score_teamwork:m,score_communication:E,score_knowledge_sharing:_,score_feedback:h,score_compliance:y,bonus_amount:x,recommendations:N}=await e.json();if(!r||!a||!o)throw new w.HttpError(400,"Missing required fields");let D=e=>{let t=parseInt(e,10);return t>=1&&t<=5?t:3},g=Math.max(0,parseInt(x,10)||0),f=await R.prisma.$queryRaw`
      INSERT INTO evaluations (
        company_id, evaluator_id, employee_id, period_month, period_year,
        score_accuracy, score_innovation, score_speed, score_development,
        score_quality_check, score_prioritization, score_independence,
        score_deadlines, score_teamwork, score_communication,
        score_knowledge_sharing, score_feedback, score_compliance,
        bonus_worthy, bonus_amount, recommendations, updated_at
      ) VALUES (
        ${t.companyId}, ${t.id}, ${r},
        ${a}, ${o},
        ${D(n)}, ${D(i)}, ${D(s)},
        ${D(l)}, ${D(p)}, ${D(d)},
        ${D(c)}, ${D(u)}, ${D(m)},
        ${D(E)}, ${D(_)}, ${D(h)},
        ${D(y)},
        ${g>0}, ${g}, ${N??null}, NOW()
      )
      ON CONFLICT (company_id, evaluator_id, employee_id, period_month, period_year) DO UPDATE SET
        score_accuracy          = EXCLUDED.score_accuracy,
        score_innovation        = EXCLUDED.score_innovation,
        score_speed             = EXCLUDED.score_speed,
        score_development       = EXCLUDED.score_development,
        score_quality_check     = EXCLUDED.score_quality_check,
        score_prioritization    = EXCLUDED.score_prioritization,
        score_independence      = EXCLUDED.score_independence,
        score_deadlines         = EXCLUDED.score_deadlines,
        score_teamwork          = EXCLUDED.score_teamwork,
        score_communication     = EXCLUDED.score_communication,
        score_knowledge_sharing = EXCLUDED.score_knowledge_sharing,
        score_feedback          = EXCLUDED.score_feedback,
        score_compliance        = EXCLUDED.score_compliance,
        bonus_worthy            = EXCLUDED.bonus_worthy,
        bonus_amount            = EXCLUDED.bonus_amount,
        recommendations         = EXCLUDED.recommendations,
        updated_at              = NOW()
      RETURNING *
    `;return v.NextResponse.json(f[0])}catch(e){return(0,w.errorResponse)(e)}}async function D(e){try{let t,r=await (0,w.requireAuth)(e);if((0,w.requireRole)(r,["owner","hr","employee"]),null==r.companyId)throw new w.HttpError(403,"No company scope");let a=parseInt(new URL(e.url).searchParams.get("id")||"0",10);if(!a)throw new w.HttpError(400,"Missing evaluation id");if(t="owner"===r.role||"hr"===r.role?await R.prisma.$queryRaw`
        DELETE FROM evaluations
        WHERE id = ${a} AND company_id = ${r.companyId}
        RETURNING id
      `:await R.prisma.$queryRaw`
        DELETE FROM evaluations
        WHERE id = ${a} AND company_id = ${r.companyId}
          AND evaluator_id = ${r.id}
        RETURNING id
      `,0===t.length)throw new w.HttpError(404,"Evaluation not found");return v.NextResponse.json({success:!0})}catch(e){return(0,w.errorResponse)(e)}}e.s(["DELETE",0,D,"GET",0,x,"POST",0,N,"runtime",0,"nodejs"],64226);var g=e.i(64226);let f=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/evaluations/route",pathname:"/api/evaluations",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/app/api/evaluations/route.ts",nextConfigOutput:"",userland:g,...{}}),{workAsyncStorage:C,workUnitAsyncStorage:A,serverHooks:$}=f;async function T(e,t,a){a.requestMeta&&(0,o.setRequestMeta)(e,a.requestMeta),f.isDev&&(0,o.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let v="/api/evaluations/route";v=v.replace(/\/index$/,"")||"/";let R=await f.prepare(e,t,{srcPage:v,multiZoneDraftMode:!1});if(!R)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:w,deploymentId:x,params:N,nextConfig:D,parsedUrl:g,isDraftMode:C,prerenderManifest:A,routerServerContext:$,isOnDemandRevalidate:T,revalidateOnlyGenerated:O,resolvedPathname:q,clientReferenceManifest:b,serverActionsManifest:I}=R,U=(0,s.normalizeAppPath)(v),L=!!(A.dynamicRoutes[U]||A.routes[q]),k=async()=>((null==$?void 0:$.render404)?await $.render404(e,t,g,!1):t.end("This page could not be found"),null);if(L&&!C){let e=!!A.routes[q],t=A.dynamicRoutes[U];if(t&&!1===t.fallback&&!e){if(D.adapterPath)return await k();throw new h.NoFallbackError}}let S=null;!L||f.isDev||C||(S="/index"===(S=q)?"/":S);let P=!0===f.isDev||!L,H=L&&!P;I&&b&&(0,i.setManifestsSingleton)({page:v,clientReferenceManifest:b,serverActionsManifest:I});let j=e.method||"GET",M=(0,n.getTracer)(),X=M.getActiveScopeSpan(),F=!!(null==$?void 0:$.isWrappedByNextServer),W=!!(0,o.getRequestMeta)(e,"minimalMode"),B=(0,o.getRequestMeta)(e,"incrementalCache")||await f.getIncrementalCache(e,D,A,W);null==B||B.resetRequestCache(),globalThis.__incrementalCache=B;let K={params:N,previewProps:A.preview,renderOpts:{experimental:{authInterrupts:!!D.experimental.authInterrupts},cacheComponents:!!D.cacheComponents,supportsDynamicResponse:P,incrementalCache:B,cacheLifeProfiles:D.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,o)=>f.onRequestError(e,t,a,o,$)},sharedContext:{buildId:w,deploymentId:x}},G=new l.NodeNextRequest(e),z=new l.NodeNextResponse(t),J=p.NextRequestAdapter.fromNodeNextRequest(G,(0,p.signalFromNodeResponse)(t));try{let o,i=async e=>f.handle(J,K).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=M.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==d.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route");if(a){let t=`${j} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t),o&&o!==e&&(o.setAttribute("http.route",a),o.updateName(t))}else e.updateName(`${j} ${v}`)}),s=async o=>{var n,s;let l=async({previousCacheEntry:r})=>{try{if(!W&&T&&O&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let n=await i(o);e.fetchMetrics=K.renderOpts.fetchMetrics;let s=K.renderOpts.pendingWaitUntil;s&&a.waitUntil&&(a.waitUntil(s),s=void 0);let l=K.renderOpts.collectedTags;if(!L)return await (0,u.sendResponse)(G,z,n,K.renderOpts.pendingWaitUntil),null;{let e=await n.blob(),t=(0,m.toNodeOutgoingHttpHeaders)(n.headers);l&&(t[_.NEXT_CACHE_TAGS_HEADER]=l),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==K.renderOpts.collectedRevalidate&&!(K.renderOpts.collectedRevalidate>=_.INFINITE_CACHE)&&K.renderOpts.collectedRevalidate,a=void 0===K.renderOpts.collectedExpire||K.renderOpts.collectedExpire>=_.INFINITE_CACHE?void 0:K.renderOpts.collectedExpire;return{value:{kind:y.CachedRouteKind.APP_ROUTE,status:n.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await f.onRequestError(e,t,{routerKind:"App Router",routePath:v,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:H,isOnDemandRevalidate:T})},!1,$),t}},p=await f.handleResponse({req:e,nextConfig:D,cacheKey:S,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:A,isRoutePPREnabled:!1,isOnDemandRevalidate:T,revalidateOnlyGenerated:O,responseGenerator:l,waitUntil:a.waitUntil,isMinimalMode:W});if(!L)return null;if((null==p||null==(n=p.value)?void 0:n.kind)!==y.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==p||null==(s=p.value)?void 0:s.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});W||t.setHeader("x-nextjs-cache",T?"REVALIDATED":p.isMiss?"MISS":p.isStale?"STALE":"HIT"),C&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let d=(0,m.fromNodeOutgoingHttpHeaders)(p.value.headers);return W&&L||d.delete(_.NEXT_CACHE_TAGS_HEADER),!p.cacheControl||t.getHeader("Cache-Control")||d.get("Cache-Control")||d.set("Cache-Control",(0,E.getCacheControlHeader)(p.cacheControl)),await (0,u.sendResponse)(G,z,new Response(p.value.body,{headers:d,status:p.value.status||200})),null};F&&X?await s(X):(o=M.getActiveScopeSpan(),await M.withPropagatedContext(e.headers,()=>M.trace(d.BaseServerSpan.handleRequest,{spanName:`${j} ${v}`,kind:n.SpanKind.SERVER,attributes:{"http.method":j,"http.target":e.url}},s),void 0,!F))}catch(t){if(t instanceof h.NoFallbackError||await f.onRequestError(e,t,{routerKind:"App Router",routePath:U,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:H,isOnDemandRevalidate:T})},!1,$),L)throw t;return await (0,u.sendResponse)(G,z,new Response(null,{status:500})),null}}e.s(["handler",0,T,"patchFetch",0,function(){return(0,a.patchFetch)({workAsyncStorage:C,workUnitAsyncStorage:A})},"routeModule",0,f,"serverHooks",0,$,"workAsyncStorage",0,C,"workUnitAsyncStorage",0,A],9348)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__0o_w67n._.js.map