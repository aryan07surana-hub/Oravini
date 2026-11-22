type Request=(method:string,url:string,data?:unknown)=>Promise<any>;
// The server owns entitlements and credits. Confirmation changes only planConfirmed.
export async function confirmFreePlan(request:Request){
 const current=await request('GET','/api/billing/v2/me');
 if(current?.billingModel!=='v2'||current?.state?.state!=='free'||current?.state?.monthlyAllowance!==100){
  throw new Error('The 100-credit Free plan is not ready for this account.');
 }
 return request('POST','/api/auth/confirm-plan',{});
}
export function confirmCurrentPlan(request:Request){
 return request('POST','/api/auth/confirm-plan',{});
}
