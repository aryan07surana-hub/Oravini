import {FREE_V2_POLICY,freeV2PeriodKey} from '../shared/creditPeriodsV2';
// Explicit migration proposal, NOT run on import or server startup.
export const FREE_GRANT_V2_SCHEMA=`CREATE TABLE IF NOT EXISTS oravini_free_grants_v2 (
 user_id VARCHAR NOT NULL REFERENCES users(id), period_key VARCHAR(7) NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(user_id,period_key));`;
interface Tx {query(sql:string,values?:unknown[]):Promise<{rows:any[]}>}
interface Pool {connect():Promise<Tx&{release():void}>}
// Future verified account workflow only; no public route. Account IDs are from
// authentication, not browser-posted identifiers. Reset monthly bucket, never add.
export async function grantFreeMonthlyV2(pool:Pool,userId:string,now=new Date()){
 const period=freeV2PeriodKey(now);const db=await pool.connect();
 try{await db.query('BEGIN');
  const r=await db.query('SELECT plan,role FROM users WHERE id=$1 FOR UPDATE',[userId]);
  if(!r.rows[0]||r.rows[0].plan!=='free'||r.rows[0].role==='admin')throw new Error('Not a Free account');
  const claim=await db.query('INSERT INTO oravini_free_grants_v2(user_id,period_key) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING user_id',[userId,period]);
  if(!claim.rows.length){await db.query('COMMIT');return {granted:false,period};}
  await db.query('INSERT INTO credit_balances(user_id,monthly_credits,bonus_credits,last_reset_month) VALUES($1,$2,0,$3) ON CONFLICT(user_id) DO UPDATE SET monthly_credits=EXCLUDED.monthly_credits,last_reset_month=EXCLUDED.last_reset_month',[userId,FREE_V2_POLICY.credits,period]);
  await db.query("INSERT INTO credit_transactions(user_id,amount,type,description) VALUES($1,$2,'period_reset','Free v2 monthly allowance, no rollover')",[userId,FREE_V2_POLICY.credits]);
  await db.query('COMMIT');return {granted:true,period};
 }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
}
