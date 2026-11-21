// Review proposal only. No provider IDs, checkout creation or live grants.
export const WORK_WITH_US_DRAFT={price:null,selfServe:false,bookingEnabled:false,existingAccountsChanged:false} as const;
export const TERM_CREDIT_BONUS={1:0,3:150,6:200,12:250} as const;
export const TERM_STEPS=[1,3,6,12] as const;
export type PricingTerm=typeof TERM_STEPS[number];
export const TERM_PLANS=[
 {id:"free",name:"Free",price:0,credits:100,ai:0.25,video:null,webinars:false,terms:[1]},
 {id:"growth",name:"Growth",price:49,credits:400,ai:4,video:null,webinars:false,terms:TERM_STEPS},
 {id:"pro",name:"Pro",price:59,credits:700,ai:6,video:{storage:10,stream:30},webinars:true,terms:TERM_STEPS},
 {id:"growth_video",name:"Growth + Video",price:69,credits:1000,ai:19.70,video:{storage:5,stream:15},webinars:true,terms:TERM_STEPS},
] as const;
export type PricingPlan=typeof TERM_PLANS[number]['id'];
function validateTerm(months:number):asserts months is PricingTerm{if(!(TERM_STEPS as readonly number[]).includes(months))throw new Error("Unsupported prepaid term");}
export function monthlyCredits(id:string,base:number,months:number){validateTerm(months);if(!TERM_PLANS.some(p=>p.id===id))throw new Error("Unknown plan");return base+(id==="free"?0:TERM_CREDIT_BONUS[months]);}
export function termPrice(id:string,price:number,months:number){validateTerm(months);if(!TERM_PLANS.some(p=>p.id===id))throw new Error("Unknown plan");const discount=(id==="pro"||id==="free")?0:({1:0,3:10,6:15,12:25}[months]);const normal=price*months;return {discount,normal,total:Math.round(normal*(1-discount/100)*100)/100,monthly:price*(1-discount/100)};}
// Server reconstructs all values from canonical plan+term, never client amounts.
export function proposedOffer(planId:string,months:number){validateTerm(months);const plan=TERM_PLANS.find(p=>p.id===planId);if(!plan)throw new Error("Unknown plan");if(!(plan.terms as readonly number[]).includes(months))throw new Error("Term not offered");return {planId:plan.id,termMonths:months,currency:"USD" as const,monthlyCredits:monthlyCredits(plan.id,plan.credits,months),price:termPrice(plan.id,plan.price,months),hasVideoMarketing:!!plan.video,checkoutEnabled:false as const,discountFinal:false as const,variantId:null};}
