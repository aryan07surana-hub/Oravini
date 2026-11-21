import {useLocation} from 'wouter';
import ClientLayout from '@/components/webinar-funnel/WebinarWorkspaceLayout';import WebinarAssistant from '@/components/webinar-funnel/WebinarAssistant';
export default function WebinarAssistantPage(){const [,navigate]=useLocation();return <ClientLayout><div className="max-w-3xl mx-auto px-4 py-8"><WebinarAssistant onApply={draft=>{sessionStorage.setItem("oravini:webinar-ai-draft",JSON.stringify(draft));navigate("/tools/webinars/new");}}/></div></ClientLayout>;}
