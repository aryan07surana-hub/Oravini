// Client-facing Project Tracker — Tier 5 (Elite) only
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import ClientPartnershipTracker from "@/components/ClientPartnershipTracker";
import { Layers, Lock, ArrowRight } from "lucide-react";

const GOLD = "#d4b461";

function Tier5Gate() {
  const [, navigate] = useLocation();
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ maxWidth: 440, textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(212,180,97,0.1)', border: '1px solid rgba(212,180,97,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Lock size={24} color={GOLD} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 10px' }}>
          Tier 5 Exclusive
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: '0 0 28px' }}>
          The Client Partnership Tracker is available exclusively for Tier 5 (Elite) members. 
          This is your done-for-you onboarding system — from audience to revenue.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={() => navigate('/brandverse')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 24px', borderRadius: 10,
              background: GOLD, color: '#000', fontWeight: 700, fontSize: 14,
              border: 'none', cursor: 'pointer',
            }}
          >
            Learn About Tier 5 <ArrowRight size={14} />
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '12px 24px', borderRadius: 10,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)', fontWeight: 500, fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientProjectTracker() {
  const { user } = useAuth();

  // Only elite (Tier 5) users and admins can access
  const isAdmin = (user as any)?.role === "admin";
  const isElite = user?.plan === "elite";

  if (!isAdmin && !isElite) {
    return <Tier5Gate />;
  }

  return <ClientPartnershipTracker />;
}
