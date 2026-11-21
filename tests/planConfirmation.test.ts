import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {planConfirmationUpdate,PlanConfirmationError} from "../server/planConfirmation";
for(const plan of ["starter","growth","pro","elite"]){test(`free cannot self-assign ${plan}`,()=>assert.throws(()=>planConfirmationUpdate({plan:"free"},{plan}),error=>error instanceof PlanConfirmationError&&error.status===409));}
test("free onboarding confirms without entitlement mutation",()=>assert.deepEqual(planConfirmationUpdate({plan:"free"},{plan:"free"}),{planConfirmed:true}));
test("existing paid plan retained without credit refresh",()=>assert.deepEqual(planConfirmationUpdate({plan:"pro"},{plan:"pro",hasVideoMarketing:true}),{planConfirmed:true}));
test("existing Elite retains onboarding without request override",()=>assert.deepEqual(planConfirmationUpdate({plan:"elite"},{}),{planConfirmed:true}));
test("Growth video add-on cannot be self-assigned",()=>assert.throws(()=>planConfirmationUpdate({plan:"growth",hasVideoMarketing:false},{hasVideoMarketing:true}),/payment-verification/));
test("existing add-on retained",()=>assert.deepEqual(planConfirmationUpdate({plan:"growth",hasVideoMarketing:true},{hasVideoMarketing:true}),{planConfirmed:true}));
test("downgrade cannot bypass billing cancellation workflow",()=>assert.throws(()=>planConfirmationUpdate({plan:"pro"},{plan:"free"}),/payment-verification/));
test("unknown and malformed plan values rejected",()=>{for(const plan of ["admin",{},true,1,null])assert.throws(()=>planConfirmationUpdate({plan:"free"},{plan}),/invalid/);});
test("no posted credits or role reach update",()=>assert.deepEqual(planConfirmationUpdate({plan:"free"},{plan:"free",credits:99999,role:"admin",hasVideoMarketingAddon:true}),{planConfirmed:true}));
test("malformed body rejected",()=>{for(const input of [null,[],"pro",1])assert.throws(()=>planConfirmationUpdate({plan:"free"},input),/invalid/);});
test("repeated confirmation cannot generate credit changes",()=>{for(let i=0;i<100;i++)assert.deepEqual(planConfirmationUpdate({plan:"pro"},{plan:"pro"}),{planConfirmed:true});});
test("terminal guard is registered before legacy route",()=>{const source=fs.readFileSync(new URL("../server/index.ts",import.meta.url),"utf8");assert.ok(source.indexOf("registerPlanConfirmationGuard(app, storage)")<source.indexOf("await registerRoutes(httpServer, app)"));const guard=fs.readFileSync(new URL("../server/planConfirmation.ts",import.meta.url),"utf8");assert.doesNotMatch(guard,/activatePlanCredits|processReferralConversion|enrollUserInSequence/);});

test("terminal handler does not fall through to legacy billing route",async()=>{
 const {default:express}=await import("express");
 const {registerPlanConfirmationGuard}=await import("../server/planConfirmation");
 const app=express();app.use(express.json());
 app.use((req,_res,next)=>{(req as any).isAuthenticated=()=>true;(req as any).user={id:"synthetic-user"};next();});
 const updates:unknown[]=[];
 registerPlanConfirmationGuard(app,{getUser:async()=>({id:"synthetic-user",plan:"pro",password:"synthetic-password",monthlyCredits:12}),updateUser:async(_id,patch)=>{updates.push(patch);}});
 let legacyCalls=0;app.post("/api/auth/confirm-plan",(_req,res)=>{legacyCalls++;res.json({bad:true});});
 const server=app.listen(0,"127.0.0.1");await new Promise<void>(resolve=>server.once("listening",resolve));
 try{const address=server.address() as any;const response=await fetch(`http://127.0.0.1:${address.port}/api/auth/confirm-plan`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({plan:"pro"})});assert.equal(response.status,200);const data=await response.json();assert.equal(data.monthlyCredits,12);assert.equal(data.password,undefined);assert.equal(legacyCalls,0);assert.deepEqual(updates,[{planConfirmed:true}]);}finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
});
