import type { Express, Request, Response } from "express";
// Onboarding confirmation is not a billing operation. Paid entitlements and
// credits can only change through a separate verified payment/admin workflow.
export class PlanConfirmationError extends Error {
  constructor(public code:"invalid-plan-confirmation"|"payment-verification-required",public status:400|409){super(code);}
}
export function planConfirmationUpdate(current:{plan?:string|null;hasVideoMarketing?:boolean|null},input:unknown):{planConfirmed:true} {
  if(!input||typeof input!=="object"||Array.isArray(input))throw new PlanConfirmationError("invalid-plan-confirmation",400);
  const request=input as Record<string,unknown>;
  if(request.plan!==undefined){
    if(typeof request.plan!=="string"||!["free","starter","growth","pro","elite"].includes(request.plan))throw new PlanConfirmationError("invalid-plan-confirmation",400);
    if(request.plan!==(current.plan||"free"))throw new PlanConfirmationError("payment-verification-required",409);
  }
  if(request.hasVideoMarketing!==undefined){
    if(typeof request.hasVideoMarketing!=="boolean")throw new PlanConfirmationError("invalid-plan-confirmation",400);
    const existing=current.plan==="pro"||current.plan==="elite"||current.hasVideoMarketing===true;
    if(request.hasVideoMarketing!==existing)throw new PlanConfirmationError("payment-verification-required",409);
  }
  return {planConfirmed:true};
}

export interface PlanConfirmationStore {
  getUser(id:string):Promise<any>;
  updateUser(id:string,patch:{planConfirmed:true}):Promise<unknown>;
}
export function registerPlanConfirmationGuard(app:Pick<Express,"post">,store:PlanConfirmationStore) {
  // This terminal handler deliberately shadows the legacy onboarding route.
  // No next() on success: the legacy handler must never refill credits.
  app.post("/api/auth/confirm-plan",async(req:Request,res:Response)=>{
    if(!req.isAuthenticated())return res.status(401).json({message:"Unauthorized"});
    const userId=(req.user as any)?.id;
    if(typeof userId!=="string"||!userId)return res.status(401).json({message:"Unauthorized"});
    try {
      const current=await store.getUser(userId);
      if(!current)return res.status(404).json({message:"User not found"});
      await store.updateUser(userId,planConfirmationUpdate(current,req.body));
      const updated=await store.getUser(userId);
      if(!updated)return res.status(404).json({message:"User not found"});
      const {password:_,...safe}=updated;
      return res.json(safe);
    }catch(error){
      if(error instanceof PlanConfirmationError)return res.status(error.status).json({message:error.code});
      console.error("[confirm-plan] confirmation failed");
      return res.status(500).json({message:"Plan confirmation failed"});
    }
  });
}
