import test from "node:test";
import assert from "node:assert/strict";
import {TERM_PLANS,termPrice,WORK_WITH_US_DRAFT,TERM_STEPS,monthlyCredits} from "../client/src/components/video-marketing/TermPricingPreview";
for(const plan of TERM_PLANS){for(const term of [1,3,6,12]){test(`${plan.id} ${term} month total`,()=>{const price=termPrice(plan.id,plan.price,term);const pct=(plan.id==="pro"||plan.id==="free")?0:({1:0,3:10,6:15,12:25}[term]||0);assert.equal(price.discount,pct);assert.equal(price.total,Math.round(plan.price*term*(1-pct/100)*100)/100);assert.equal(price.normal,plan.price*term);assert.ok(Math.abs(price.total/term-price.monthly)<.001);});}}
test("Free has no paid term options",()=>{for(const p of TERM_PLANS.filter(p=>p.id==="free"))assert.deepEqual(p.terms,[1]);});
test("webinar and video cards preserve latest caps",()=>{const pro=TERM_PLANS.find(p=>p.id==="pro")!;const video=TERM_PLANS.find(p=>p.id==="growth_video")!;assert.equal(pro.webinars,true);assert.equal(video.webinars,true);assert.deepEqual(pro.video,{storage:10,stream:30});assert.deepEqual(video.video,{storage:5,stream:15});assert.equal(pro.price,59);});

test("Work with us stays custom and non-self-serve without changing existing grants",()=>{assert.equal(WORK_WITH_US_DRAFT.price,null);assert.equal(WORK_WITH_US_DRAFT.selfServe,false);assert.equal(WORK_WITH_US_DRAFT.bookingEnabled,false);assert.equal(WORK_WITH_US_DRAFT.existingAccountsChanged,false);});

test("slider positions offer exactly 1, 3, 6 and 12 months",()=>{assert.deepEqual(TERM_STEPS,[1,3,6,12]);for(const p of TERM_PLANS)assert.equal((p.terms as readonly number[]).includes(2),false);});

test("two-month pricing is rejected rather than quoted",()=>{for(const p of TERM_PLANS)assert.throws(()=>termPrice(p.id,p.price,2),/Unsupported prepaid term/);});

test("GrowthVideo offers all four terms with six and twelve month draft savings",()=>{const p=TERM_PLANS.find(p=>p.id==="growth_video")!;assert.deepEqual(p.terms,[1,3,6,12]);assert.equal(termPrice(p.id,p.price,6).total,351.9);assert.equal(termPrice(p.id,p.price,12).total,621);});

test("Free proposes100credits and small draft cost guard",()=>{const p=TERM_PLANS.find(p=>p.id==="free")!;assert.equal(p.price,0);assert.equal(p.credits,100);assert.equal(p.ai,0.25);assert.equal(p.webinars,false);assert.equal(p.video,null);});

test("paid draft credits match latest owner decision",()=>{assert.deepEqual(Object.fromEntries(TERM_PLANS.map(p=>[p.id,p.credits])),{free:100,growth:400,pro:700,growth_video:1000});});

test("GrowthVideo optional AI cap is nineteen dollars seventy cents",()=>{assert.equal(TERM_PLANS.find(p=>p.id==="growth_video")!.ai,19.7);});

test("term bonus credits are monthly and independent of price discounts",()=>{for(const [id,base,expected] of [["growth",400,[400,550,600,650]],["pro",700,[700,850,900,950]],["growth_video",1000,[1000,1150,1200,1250]]] as const){assert.deepEqual(TERM_STEPS.map(t=>monthlyCredits(id,base,t)),expected);}assert.equal(monthlyCredits("free",100,12),100);assert.throws(()=>monthlyCredits("growth",400,2),/Unsupported/);});

test("pricing stays a labelled draft with checkout disabled unless the server catalog is final",async()=>{
 const {displayOffer,termLabel}=await import("../client/src/components/video-marketing/TermPricingPreview");
 for(const st of [null,{checkoutOpen:false,fulfillmentOpen:false,offers:null},{checkoutOpen:false,fulfillmentOpen:true,offers:[{planId:"growth",termMonths:3,amountCents:1,discountPercent:99,monthlyAllowance:9}]}]){
  const o=displayOffer(st as any,"growth",49,3);assert.equal(o.final,false);assert.equal(o.discount,10);assert.equal(o.total,132.3);assert.equal(o.credits,null);
 }
 const fin=displayOffer({checkoutOpen:true,fulfillmentOpen:true,offers:[{planId:"growth",termMonths:12,amountCents:47040,discountPercent:20,monthlyAllowance:650}]},"growth",49,12);
 assert.deepEqual([fin.final,fin.total,fin.monthly,fin.discount,fin.credits],[true,470.4,39.2,20,650]);
 assert.equal(termLabel(1),"1 calendar month");assert.equal(termLabel(6),"6 calendar months");
});

test("draft render: calendar-month terms, total prepaid, effective monthly, bonus allowance, no auto-renewal, no live checkout",async()=>{
 (globalThis as any).location={search:""};
 const React=await import("react");(globalThis as any).React=React;const {renderToStaticMarkup}=await import("react-dom/server");
 const {default:Pricing}=await import("../client/src/components/video-marketing/TermPricingPreview");
 const html=renderToStaticMarkup(React.createElement(Pricing));
 for(const s of ["PREVIEW · CHECKOUT OFF","calendar month","no auto-renewal","/ month effective","400 app credits","Checkout not available yet","Discount placeholders, not final"])assert.ok(html.includes(s),s);
 assert.ok(!html.includes(`class="buy buy-live"`),"no live checkout button");assert.ok(!html.includes("Prepay 1 calendar month"));
});

test("internal AI-cost/margin notes stay in the labelled review preview only",async()=>{
 const {readFile}=await import("node:fs/promises");
 const path=await import("node:path");
 const src=await readFile(path.join(process.cwd(),"client/src/components/video-marketing/TermPricingPreview.tsx"),"utf8");
 const open='{!final&&<p className="cost">';
 const close='</p>}{final&&plan.id!=="free"&&available?';
 assert.ok(src.includes(open),"cost paragraph is guarded by preview mode");
 const openAt=src.indexOf(open),closeAt=src.indexOf(close);
 assert.ok(closeAt>openAt,"guard closes immediately before the live-price buy conditional");
 assert.ok(!src.replace(open,"").includes('<p className="cost">'),"no unguarded cost paragraph remains");
});
