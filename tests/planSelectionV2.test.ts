import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {confirmFreePlan,confirmCurrentPlan} from '../client/src/lib/planSelection';
import {PLAN_PRESENTATION} from '../shared/pricingPresentationV2';
import {TERM_PLANS,PLAN_RIGHTS_V2,LEGACY_PLAN_MAPPING_V2} from '../shared/pricingV2';
import {canUseCompetitorAnalysis} from '../shared/competitorCredits';

test('four plans have distinct factual use cases and no invented service promises',()=>{
 assert.equal(new Set(Object.values(PLAN_PRESENTATION).map(p=>p.difference)).size,4);
 for(const p of TERM_PLANS){assert.ok(PLAN_PRESENTATION[p.id]);const s=JSON.stringify(PLAN_PRESENTATION[p.id]);assert.doesNotMatch(s,/unlimited|priority|support|watermark|email|SMS/i);}
 assert.equal(TERM_PLANS.find(p=>p.id==='pro')!.video!.storage,2*TERM_PLANS.find(p=>p.id==='growth_video')!.video!.storage);
 assert.equal(TERM_PLANS.find(p=>p.id==='pro')!.video!.stream,2*TERM_PLANS.find(p=>p.id==='growth_video')!.video!.stream);
 for(const p of TERM_PLANS){const plan=p.id==='free'?'free':LEGACY_PLAN_MAPPING_V2[p.id].plan;assert.equal(PLAN_RIGHTS_V2[p.id].competitorDeep,canUseCompetitorAnalysis({plan}));}
});

test('Free confirmation checks actual v2 allowance and never writes a plan or credits',async()=>{
 const calls:any[]=[];const result=await confirmFreePlan(async(...args)=>{calls.push(args);return args[0]==='GET'?{billingModel:'v2',state:{state:'free',monthlyAllowance:100}}:{planConfirmed:true};});
 assert.deepEqual(calls,[['GET','/api/billing/v2/me'],['POST','/api/auth/confirm-plan',{}]]);assert.deepEqual(result,{planConfirmed:true});
});

test('legacy, paid and wrong-allowance responses cannot confirm a new Free plan',async()=>{
 for(const current of [null,{billingModel:'legacy'},{billingModel:'v2',state:{state:'free',monthlyAllowance:20}},{billingModel:'v2',state:{state:'paid',monthlyAllowance:700}}]){
  let posts=0;await assert.rejects(confirmFreePlan(async(method)=>{if(method==='POST')posts++;return current;}));assert.equal(posts,0);
 }
});

test('continuing an existing plan confirms only the current server-owned entitlement',async()=>{
 const calls:any[]=[];await confirmCurrentPlan(async(...args)=>{calls.push(args);return {};});assert.deepEqual(calls,[['POST','/api/auth/confirm-plan',{}]]);
});

test('post-onboarding route uses the same pricing and not the obsolete Starter screen',async()=>{
 const app=await readFile('client/src/App.tsx','utf8');const page=await readFile('client/src/pages/SelectPlanV2.tsx','utf8');
 assert.ok(app.includes('import SelectPlan from "@/pages/SelectPlanV2";'));
 assert.ok(page.includes('@/components/video-marketing/TermPricingPreview'));
 assert.doesNotMatch(page,/whop_success|WHOP_STARTER|VITE_PRICING_V2_PREVIEW|\$19/);
 assert.ok(page.includes('confirmFreePlan(apiRequest)'));assert.ok(page.includes('onPaymentVerified='));
});

test('server-ready Free control does not enable paid checkouts',async()=>{
 (globalThis as any).location={search:''};const React=await import('react');(globalThis as any).React=React;
 const {renderToStaticMarkup}=await import('react-dom/server');const {default:Pricing}=await import('../client/src/components/video-marketing/TermPricingPreview');
 const html=renderToStaticMarkup(React.createElement(Pricing,{statusOverride:{checkoutOpen:false,fulfillmentOpen:false,offers:null,freeEnrollmentEnabled:true},onSelectFree:async()=>{}}));
 assert.ok(html.includes('Choose Free · 100 credits/month'));assert.equal((html.match(/class="buy buy-live"/g)||[]).length,1);
 assert.equal((html.match(/Payments temporarily unavailable/g)||[]).length,3);
 assert.ok(html.includes('Deep Competitor Analysis not included'));assert.ok(html.includes('More hosting capacity'));assert.ok(html.includes('More AI, lighter hosting'));
});
