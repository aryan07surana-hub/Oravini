import {useEffect,useState} from 'react';
import {useLocation} from 'wouter';
import {useAuth} from '@/hooks/use-auth';
import {apiRequest,queryClient} from '@/lib/queryClient';
import {confirmCurrentPlan,confirmFreePlan} from '@/lib/planSelection';
import Pricing from '@/components/video-marketing/TermPricingPreview';

export default function SelectPlanV2(){
 const {user,isLoading}=useAuth();
 const [,navigate]=useLocation();
 const [working,setWorking]=useState(false);
 const [error,setError]=useState<string|null>(null);
 useEffect(()=>{if(!isLoading&&!user)navigate('/login');},[isLoading,user,navigate]);
 async function finish(updated?:any){
  setWorking(true);setError(null);
  try{const account=updated??await confirmCurrentPlan(apiRequest);queryClient.setQueryData(['/api/auth/me'],account);navigate('/dashboard');}
  finally{setWorking(false);}
 }
 if(isLoading||!user)return <div style={{padding:40,color:'#fff',background:'#080808',minHeight:'100vh'}} role="status">Loading your account...</div>;
 const existing=user.planConfirmed||user.role==='admin'||['starter','growth','pro','elite'].includes(user.plan);
 return <div className="plan-selection" style={{minHeight:'100vh',background:'#080808',color:'#fff',fontFamily:'Inter,Arial,sans-serif'}}>
  <header style={{maxWidth:1248,margin:'0 auto',padding:'20px 24px',display:'flex',justifyContent:'space-between',gap:16,flexWrap:'wrap',alignItems:'center',borderBottom:'1px solid #ffffff14'}}>
   <a href="/oravini" style={{color:'#d4b461',textDecoration:'none',fontSize:13}}>← Back to Oravini</a>
   <span style={{fontSize:11,letterSpacing:'.12em',color:'#ffffff99'}}>CHOOSE YOUR PLAN</span>
  </header>
  <div style={{maxWidth:950,margin:'28px auto 0',padding:'0 24px',textAlign:'center',fontSize:13,lineHeight:1.8,color:'#ffffffb3'}}>
   {user.surveyCompleted&&<p>Your answers are saved.</p>}
   <p>Choose the AI credits and hosting allowance that fit your work. Prices and prepaid terms are the same as on the main pricing page.</p>
   {existing&&<button type="button" disabled={working} onClick={()=>{void finish().catch(()=>setError('We could not open your dashboard. Please try again.'));}} style={{marginTop:12,padding:'12px 18px',borderRadius:10,border:'1px solid #d4b46166',background:'#d4b46114',color:'#f0cd79',cursor:working?'wait':'pointer'}}> {working?'Opening dashboard...':'Continue with my current plan →'}</button>}
   {error&&<p role="alert">{error}</p>}
  </div>
  <Pricing onSelectFree={async()=>{const updated=await confirmFreePlan(apiRequest);await finish(updated);}} onPaymentVerified={async()=>{await finish();}}/>
 </div>;
}
