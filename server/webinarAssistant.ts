import type {Express} from 'express';
import {webinarAssistantInput,webinarAssistantDraft,WEBINAR_ASSISTANT_SYSTEM} from '../shared/webinarAssistant';
export function createWebinarAssistantHandler(deps:{enabled:()=>boolean;generate:(system:string,user:string)=>Promise<string>}){
 return async(req:any,res:any)=>{
  if(!deps.enabled())return res.status(503).json({code:'WEBINAR_AI_PREVIEW_ONLY',message:'Webinar assistant is preview-only pending generation cost and app-credit approval. No credits charged.'});
  const input=webinarAssistantInput.safeParse(req.body);
  if(!input.success)return res.status(400).json({message:'Describe the webinar in8to2000characters.'});
  try {const raw=await deps.generate(WEBINAR_ASSISTANT_SYSTEM,JSON.stringify(input.data));const parsed=webinarAssistantDraft.safeParse(JSON.parse(raw));if(!parsed.success)return res.status(502).json({message:'AI returned invalid draft content. Nothing was saved.'});return res.json({draft:parsed.data,saved:false,published:false});}
  catch{return res.status(502).json({message:'Draft generation failed. Nothing was saved or published.'});}
 };
}
export function registerWebinarAssistant(app:Express,requireAuth:any){
 app.post('/api/webinar-assistant/improve',requireAuth,(_req,res)=>res.status(503).json({code:'WEBINAR_AI_PREVIEW_ONLY',message:'AI copy improvements are preview-only pending cost approval. No credits charged.'}));
 app.post('/api/webinar-assistant/draft',requireAuth,createWebinarAssistantHandler({
  // Deliberately closed until owner approves the new request's credit/cost policy.
  enabled:()=>false,
  generate:async(system,user)=>{const {aiChatJson}=await import('./aiService');return aiChatJson(system,user,{maxTokens:1200,temperature:0.5,feature:'webinar-assistant'});},
 }));
}
