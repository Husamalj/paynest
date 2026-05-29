module.exports=[93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},24361,(e,t,r)=>{t.exports=e.x("util",()=>require("util"))},18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},88947,(e,t,r)=>{t.exports=e.x("stream",()=>require("stream"))},54799,(e,t,r)=>{t.exports=e.x("crypto",()=>require("crypto"))},9348,e=>{"use strict";var t=e.i(47909),r=e.i(74017),a=e.i(96250),o=e.i(59756),n=e.i(61916),i=e.i(74677),s=e.i(69741),l=e.i(16795),p=e.i(87718),d=e.i(95169),c=e.i(47587),u=e.i(66012),m=e.i(70101),_=e.i(26937),E=e.i(10372),h=e.i(93695);e.i(52474);var v=e.i(220),y=e.i(89171),R=e.i(15270),w=e.i(68105);async function x(e){try{let t=await (0,w.requireAuth)(e);if((0,w.requireRole)(t,["owner","hr","employee"]),null==t.companyId)throw new w.HttpError(403,"No company scope");let r=new URL(e.url),a=r.searchParams.get("employee_id"),o=parseInt(r.searchParams.get("month")||"0",10),n=parseInt(r.searchParams.get("year")||"0",10);if(!o||!n)throw new w.HttpError(400,"Missing month or year");if(a){let e=await R.prisma.$queryRaw`
        SELECT * FROM evaluations
        WHERE company_id   = ${t.companyId}
          AND evaluator_id = ${t.id}
          AND employee_id  = ${a}
          AND period_month = ${o}
          AND period_year  = ${n}
        LIMIT 1
      `;return y.NextResponse.json(e[0]??null)}let i=("owner"===t.role||"hr"===t.role?await R.prisma.$queryRaw`
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
      `).map(e=>Object.fromEntries(Object.entries(e).map(([e,t])=>[e,"bigint"==typeof t?Number(t):t])));return y.NextResponse.json(i)}catch(e){return(0,w.errorResponse)(e)}}async function g(e){try{let t=await (0,w.requireAuth)(e);if((0,w.requireRole)(t,["owner","hr","employee"]),null==t.companyId)throw new w.HttpError(403,"No company scope");let{employee_id:r,period_month:a,period_year:o,score_accuracy:n,score_innovation:i,score_speed:s,score_development:l,score_quality_check:p,score_prioritization:d,score_independence:c,score_deadlines:u,score_teamwork:m,score_communication:_,score_knowledge_sharing:E,score_feedback:h,score_compliance:v,bonus_amount:x,recommendations:g}=await e.json();if(!r||!a||!o)throw new w.HttpError(400,"Missing required fields");let D=e=>{let t=parseInt(e,10);return t>=1&&t<=5?t:3},C=Math.max(0,parseInt(x,10)||0),N=await R.prisma.$queryRaw`
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
        ${D(_)}, ${D(E)}, ${D(h)},
        ${D(v)},
        ${C>0}, ${C}, ${g??null}, NOW()
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
    `;return y.NextResponse.json(N[0])}catch(e){return(0,w.errorResponse)(e)}}e.s(["GET",0,x,"POST",0,g,"runtime",0,"nodejs"],64226);var D=e.i(64226);let C=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/evaluations/route",pathname:"/api/evaluations",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/app/api/evaluations/route.ts",nextConfigOutput:"",userland:D,...{}}),{workAsyncStorage:N,workUnitAsyncStorage:f,serverHooks:A}=C;async function $(e,t,a){a.requestMeta&&(0,o.setRequestMeta)(e,a.requestMeta),C.isDev&&(0,o.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let y="/api/evaluations/route";y=y.replace(/\/index$/,"")||"/";let R=await C.prepare(e,t,{srcPage:y,multiZoneDraftMode:!1});if(!R)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:w,deploymentId:x,params:g,nextConfig:D,parsedUrl:N,isDraftMode:f,prerenderManifest:A,routerServerContext:$,isOnDemandRevalidate:O,revalidateOnlyGenerated:b,resolvedPathname:T,clientReferenceManifest:q,serverActionsManifest:I}=R,U=(0,s.normalizeAppPath)(y),k=!!(A.dynamicRoutes[U]||A.routes[T]),S=async()=>((null==$?void 0:$.render404)?await $.render404(e,t,N,!1):t.end("This page could not be found"),null);if(k&&!f){let e=!!A.routes[T],t=A.dynamicRoutes[U];if(t&&!1===t.fallback&&!e){if(D.adapterPath)return await S();throw new h.NoFallbackError}}let L=null;!k||C.isDev||f||(L="/index"===(L=T)?"/":L);let P=!0===C.isDev||!k,j=k&&!P;I&&q&&(0,i.setManifestsSingleton)({page:y,clientReferenceManifest:q,serverActionsManifest:I});let H=e.method||"GET",M=(0,n.getTracer)(),X=M.getActiveScopeSpan(),F=!!(null==$?void 0:$.isWrappedByNextServer),B=!!(0,o.getRequestMeta)(e,"minimalMode"),K=(0,o.getRequestMeta)(e,"incrementalCache")||await C.getIncrementalCache(e,D,A,B);null==K||K.resetRequestCache(),globalThis.__incrementalCache=K;let W={params:g,previewProps:A.preview,renderOpts:{experimental:{authInterrupts:!!D.experimental.authInterrupts},cacheComponents:!!D.cacheComponents,supportsDynamicResponse:P,incrementalCache:K,cacheLifeProfiles:D.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,o)=>C.onRequestError(e,t,a,o,$)},sharedContext:{buildId:w,deploymentId:x}},G=new l.NodeNextRequest(e),z=new l.NodeNextResponse(t),J=p.NextRequestAdapter.fromNodeNextRequest(G,(0,p.signalFromNodeResponse)(t));try{let o,i=async e=>C.handle(J,W).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=M.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==d.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route");if(a){let t=`${H} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t),o&&o!==e&&(o.setAttribute("http.route",a),o.updateName(t))}else e.updateName(`${H} ${y}`)}),s=async o=>{var n,s;let l=async({previousCacheEntry:r})=>{try{if(!B&&O&&b&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let n=await i(o);e.fetchMetrics=W.renderOpts.fetchMetrics;let s=W.renderOpts.pendingWaitUntil;s&&a.waitUntil&&(a.waitUntil(s),s=void 0);let l=W.renderOpts.collectedTags;if(!k)return await (0,u.sendResponse)(G,z,n,W.renderOpts.pendingWaitUntil),null;{let e=await n.blob(),t=(0,m.toNodeOutgoingHttpHeaders)(n.headers);l&&(t[E.NEXT_CACHE_TAGS_HEADER]=l),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==W.renderOpts.collectedRevalidate&&!(W.renderOpts.collectedRevalidate>=E.INFINITE_CACHE)&&W.renderOpts.collectedRevalidate,a=void 0===W.renderOpts.collectedExpire||W.renderOpts.collectedExpire>=E.INFINITE_CACHE?void 0:W.renderOpts.collectedExpire;return{value:{kind:v.CachedRouteKind.APP_ROUTE,status:n.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await C.onRequestError(e,t,{routerKind:"App Router",routePath:y,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:j,isOnDemandRevalidate:O})},!1,$),t}},p=await C.handleResponse({req:e,nextConfig:D,cacheKey:L,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:A,isRoutePPREnabled:!1,isOnDemandRevalidate:O,revalidateOnlyGenerated:b,responseGenerator:l,waitUntil:a.waitUntil,isMinimalMode:B});if(!k)return null;if((null==p||null==(n=p.value)?void 0:n.kind)!==v.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==p||null==(s=p.value)?void 0:s.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});B||t.setHeader("x-nextjs-cache",O?"REVALIDATED":p.isMiss?"MISS":p.isStale?"STALE":"HIT"),f&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let d=(0,m.fromNodeOutgoingHttpHeaders)(p.value.headers);return B&&k||d.delete(E.NEXT_CACHE_TAGS_HEADER),!p.cacheControl||t.getHeader("Cache-Control")||d.get("Cache-Control")||d.set("Cache-Control",(0,_.getCacheControlHeader)(p.cacheControl)),await (0,u.sendResponse)(G,z,new Response(p.value.body,{headers:d,status:p.value.status||200})),null};F&&X?await s(X):(o=M.getActiveScopeSpan(),await M.withPropagatedContext(e.headers,()=>M.trace(d.BaseServerSpan.handleRequest,{spanName:`${H} ${y}`,kind:n.SpanKind.SERVER,attributes:{"http.method":H,"http.target":e.url}},s),void 0,!F))}catch(t){if(t instanceof h.NoFallbackError||await C.onRequestError(e,t,{routerKind:"App Router",routePath:U,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:j,isOnDemandRevalidate:O})},!1,$),k)throw t;return await (0,u.sendResponse)(G,z,new Response(null,{status:500})),null}}e.s(["handler",0,$,"patchFetch",0,function(){return(0,a.patchFetch)({workAsyncStorage:N,workUnitAsyncStorage:f})},"routeModule",0,C,"serverHooks",0,A,"workAsyncStorage",0,N,"workUnitAsyncStorage",0,f],9348)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__0o_w67n._.js.map