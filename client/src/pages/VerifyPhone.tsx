import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, Shield, ArrowRight, RefreshCw, CheckCircle2 } from "lucide-react";
import oraviniLogoPath from "@assets/FINAL_IMAGE_ORAVINI_1774725144846.png";

const GOLD = "#d4b461";

export default function VerifyPhone() {
  const { user } = useAuth();
  const [, nav] = useLocation();
  const { toast } = useToast();

  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const requestOtp = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/phone/request-otp", { phone }),
    onSuccess: () => {
      setStep("otp");
      setCountdown(60);
      setOtp(["", "", "", "", "", ""]);
      toast({ title: "OTP sent!", description: `A 6-digit code was sent to ${phone}` });
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    },
    onError: (err: any) => {
      toast({ title: "Failed to send OTP", description: err.message, variant: "destructive" });
    },
  });

  const verifyOtp = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/phone/verify-otp", { phone, code: otp.join("") }),
    onSuccess: (data: any) => {
      queryClient.setQueryData(["/api/auth/me"], data);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Phone verified!", description: "Your account is now secured." });
      if (!data.planConfirmed) {
        nav("/select-plan");
      } else {
        nav("/dashboard");
      }
    },
    onError: (err: any) => {
      toast({ title: "Invalid code", description: err.message, variant: "destructive" });
    },
  });

  function handleOtpChange(idx: number, val: string) {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  }

  function handleOtpKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      e.preventDefault();
    }
  }

  const otpComplete = otp.every(d => d !== "");

  return (
    <div
      style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}
    >
      {/* Logo */}
      <img src={oraviniLogoPath} alt="Oravini" style={{ height: 40, marginBottom: 36, objectFit: "contain" }} />

      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20,
          padding: 36,
          boxShadow: `0 0 60px ${GOLD}10`,
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: `${GOLD}18`,
              border: `1.5px solid ${GOLD}44`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            {step === "otp" ? (
              <Shield style={{ color: GOLD, width: 26, height: 26 }} />
            ) : (
              <Phone style={{ color: GOLD, width: 26, height: 26 }} />
            )}
          </div>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: "0 0 8px", letterSpacing: -0.5 }}>
            {step === "phone" ? "Verify your phone" : "Enter the code"}
          </h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            {step === "phone"
              ? "One phone number per account — this keeps your credits safe and stops misuse."
              : `We sent a 6-digit code to ${phone}. Enter it below to verify.`}
          </p>
        </div>

        {step === "phone" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                Phone Number
              </label>
              <Input
                data-testid="input-phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff",
                  fontSize: 15,
                  height: 48,
                  borderRadius: 10,
                  paddingLeft: 14,
                }}
                onKeyDown={e => { if (e.key === "Enter" && phone.trim()) requestOtp.mutate(); }}
              />
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 5 }}>
                Include country code, e.g. +91 for India, +1 for US
              </p>
            </div>
            <Button
              data-testid="button-send-otp"
              onClick={() => requestOtp.mutate()}
              disabled={!phone.trim() || requestOtp.isPending}
              style={{
                background: `linear-gradient(135deg, ${GOLD}, #a8892d)`,
                color: "#000",
                fontWeight: 800,
                fontSize: 14,
                height: 48,
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {requestOtp.isPending ? (
                <RefreshCw style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
              ) : (
                <>Send OTP <ArrowRight style={{ width: 15, height: 15 }} /></>
              )}
            </Button>
          </div>
        )}

        {step === "otp" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* 6-digit boxes */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }} onPaste={handleOtpPaste}>
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => { otpRefs.current[idx] = el; }}
                  data-testid={`input-otp-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(idx, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(idx, e)}
                  style={{
                    width: 48,
                    height: 56,
                    textAlign: "center",
                    fontSize: 22,
                    fontWeight: 800,
                    background: digit ? `${GOLD}18` : "rgba(255,255,255,0.04)",
                    border: digit ? `1.5px solid ${GOLD}88` : "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    color: "#fff",
                    outline: "none",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                />
              ))}
            </div>

            <Button
              data-testid="button-verify-otp"
              onClick={() => verifyOtp.mutate()}
              disabled={!otpComplete || verifyOtp.isPending}
              style={{
                background: otpComplete ? `linear-gradient(135deg, ${GOLD}, #a8892d)` : "rgba(255,255,255,0.06)",
                color: otpComplete ? "#000" : "rgba(255,255,255,0.3)",
                fontWeight: 800,
                fontSize: 14,
                height: 48,
                borderRadius: 10,
                border: "none",
                cursor: otpComplete ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "background 0.2s",
              }}
            >
              {verifyOtp.isPending ? (
                <RefreshCw style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
              ) : (
                <><CheckCircle2 style={{ width: 16, height: 16 }} /> Verify &amp; Continue</>
              )}
            </Button>

            {/* Resend */}
            <div style={{ textAlign: "center" }}>
              {countdown > 0 ? (
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
                  Resend in {countdown}s
                </span>
              ) : (
                <button
                  data-testid="button-resend-otp"
                  onClick={() => requestOtp.mutate()}
                  disabled={requestOtp.isPending}
                  style={{ color: GOLD, fontSize: 13, fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}
                >
                  Resend OTP
                </button>
              )}
              <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 13, margin: "0 8px" }}>·</span>
              <button
                data-testid="button-change-phone"
                onClick={() => setStep("phone")}
                style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, background: "none", border: "none", cursor: "pointer" }}
              >
                Change number
              </button>
            </div>
          </div>
        )}

        {/* Trust badge */}
        <div
          style={{
            marginTop: 24,
            padding: "10px 14px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Shield style={{ color: GOLD, width: 14, height: 14, flexShrink: 0 }} />
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, lineHeight: 1.5, margin: 0 }}>
            Your number is used for security only — never shared or used for marketing.
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
