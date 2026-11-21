// Calendar-month boundaries anchored to purchase time (UTC), clamped at month end.
// Recompute from the original anchor so Jan31 -> Feb28 -> Mar31, not Mar28.
export function calendarMonthBoundary(anchor:Date,offset:number):Date{
 if(!Number.isInteger(offset)||offset<0||!Number.isFinite(anchor.getTime()))throw new Error('Invalid calendar boundary');
 const d=new Date(anchor);d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+offset);
 const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();
 d.setUTCDate(Math.min(anchor.getUTCDate(),last));return d;
}
export const FREE_V2_POLICY={credits:100,cadence:'monthly',rollover:false,oneGrantPerAccountPerPeriod:true} as const;
export function freeV2PeriodKey(now:Date){if(!Number.isFinite(now.getTime()))throw new Error('Invalid date');return now.toISOString().slice(0,7);}
