import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Lock, Mail, ArrowLeft, ShieldCheck } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import logoImg from "@assets/image_1773135984083.png";

type Mode = "password" | "otp-email" | "otp-code";

export default function Login() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!isLoading && user) {
      navigate(user.role === "admin" ? "/admin" : "/dashboard");
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const login = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/login", { email, password }),
    onSuccess: (u) => {
      queryClient.setQueryData(["/api/auth/me"], u);
      navigate(u.role === "admin" ? "/admin" : "/dashboard");
    },
    onError: (err: any) => {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    },
  });

  const sendOtp = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/otp/send", { email: otpEmail }),
    onSuccess: () => {
      setMode("otp-code");
      setCountdown(60);
      toast({ title: "Code sent!", description: "Check your email inbox." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to send code", description: err.message, variant: "destructive" });
    },
  });

  const verifyOtp = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/otp/verify", { email: otpEmail, code: otpCode }),
    onSuccess: (u) => {
      queryClient.setQueryData(["/api/auth/me"], u);
      navigate(u.role === "admin" ? "/admin" : "/dashboard");
    },
    onError: (err: any) => {
      toast({ title: "Invalid code", description: err.message, variant: "destructive" });
    },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Missing fields", description: "Please enter your email and password", variant: "destructive" });
      return;
    }
    login.mutate();
  };

  if (isLoading) return null;

  const leftPanel = (
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col items-center justify-center" style={{ background: "#1c1c1a" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(212,180,97,0.07) 0%, transparent 70%)" }} />
      <div className="relative z-10 flex flex-col items-center gap-10">
        <img src={logoImg} alt="Brandverse" className="w-80 h-auto select-none" draggable={false} />
        <div className="w-16 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(212,180,97,0.5), transparent)" }} />
        <p className="text-sm tracking-[0.3em] uppercase" style={{ color: "rgba(212,180,97,0.5)" }}>Client Portal</p>
      </div>
      <div className="absolute bottom-12 left-0 right-0 text-center">
        <p className="text-xs tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>Your growth, tracked & amplified</p>
      </div>
    </div>
  );

  const divider = (
    <div className="flex items-center gap-3 my-2">
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
      <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>or</span>
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex">
      {leftPanel}

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12" style={{ background: "#161614" }}>
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-10 lg:hidden">
            <img src={logoImg} alt="Brandverse" className="w-48 h-auto" />
          </div>

          {/* ── Password login ── */}
          {mode === "password" && (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.9)" }}>Welcome back</h2>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Sign in to access your client portal</p>
              </div>

              {/* Google button */}
              <a href="/api/auth/google" data-testid="button-google-login">
                <Button
                  type="button"
                  className="w-full h-11 mb-5 font-medium gap-2 border border-white/10 bg-white/5 hover:bg-white/10 text-white"
                  style={{ color: "rgba(255,255,255,0.85)" }}
                >
                  <SiGoogle className="w-4 h-4" />
                  Continue with Google
                </Button>
              </a>

              {divider}

              <form onSubmit={handlePasswordSubmit} className="space-y-5 mt-2">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                    <Input
                      id="email"
                      type="email"
                      data-testid="input-email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-11 border-white/10 bg-white/5 text-white placeholder:text-white/20 focus:border-[#d4b461]/50 focus:ring-[#d4b461]/20"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      data-testid="input-password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-11 border-white/10 bg-white/5 text-white placeholder:text-white/20 focus:border-[#d4b461]/50 focus:ring-[#d4b461]/20"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  data-testid="button-login"
                  className="w-full h-11 font-semibold border-0"
                  style={{ background: "linear-gradient(135deg, #d4b461, #b8943f)", color: "#1a1a1a" }}
                  disabled={login.isPending}
                >
                  {login.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-black/20 border-t-black/60 rounded-full animate-spin" />
                      Signing in...
                    </span>
                  ) : "Sign in to Portal"}
                </Button>
              </form>

              {divider}

              <button
                type="button"
                data-testid="button-use-otp"
                onClick={() => setMode("otp-email")}
                className="w-full text-sm text-center py-2 transition-colors"
                style={{ color: "rgba(212,180,97,0.7)" }}
                onMouseOver={e => (e.currentTarget.style.color = "#d4b461")}
                onMouseOut={e => (e.currentTarget.style.color = "rgba(212,180,97,0.7)")}
              >
                Sign in with email code instead
              </button>
            </>
          )}

          {/* ── OTP step 1: enter email ── */}
          {mode === "otp-email" && (
            <>
              <button
                type="button"
                onClick={() => setMode("password")}
                className="flex items-center gap-1.5 text-sm mb-8 transition-colors"
                style={{ color: "rgba(255,255,255,0.4)" }}
                onMouseOver={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                onMouseOut={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
              </button>

              <div className="mb-8">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(212,180,97,0.12)", border: "1px solid rgba(212,180,97,0.2)" }}>
                  <ShieldCheck className="w-6 h-6" style={{ color: "#d4b461" }} />
                </div>
                <h2 className="text-2xl font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.9)" }}>Sign in with code</h2>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>We'll send a one-time code to your email</p>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="otp-email" className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                    <Input
                      id="otp-email"
                      type="email"
                      data-testid="input-otp-email"
                      placeholder="you@example.com"
                      value={otpEmail}
                      onChange={(e) => setOtpEmail(e.target.value)}
                      className="pl-10 h-11 border-white/10 bg-white/5 text-white placeholder:text-white/20 focus:border-[#d4b461]/50"
                      autoComplete="email"
                      onKeyDown={(e) => { if (e.key === "Enter" && otpEmail) sendOtp.mutate(); }}
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  data-testid="button-send-otp"
                  className="w-full h-11 font-semibold border-0"
                  style={{ background: "linear-gradient(135deg, #d4b461, #b8943f)", color: "#1a1a1a" }}
                  disabled={sendOtp.isPending || !otpEmail}
                  onClick={() => sendOtp.mutate()}
                >
                  {sendOtp.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-black/20 border-t-black/60 rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : "Send verification code"}
                </Button>
              </div>
            </>
          )}

          {/* ── OTP step 2: enter code ── */}
          {mode === "otp-code" && (
            <>
              <button
                type="button"
                onClick={() => { setMode("otp-email"); setOtpCode(""); }}
                className="flex items-center gap-1.5 text-sm mb-8 transition-colors"
                style={{ color: "rgba(255,255,255,0.4)" }}
                onMouseOver={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                onMouseOut={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Change email
              </button>

              <div className="mb-8">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(212,180,97,0.12)", border: "1px solid rgba(212,180,97,0.2)" }}>
                  <ShieldCheck className="w-6 h-6" style={{ color: "#d4b461" }} />
                </div>
                <h2 className="text-2xl font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.9)" }}>Enter your code</h2>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                  We sent a 6-digit code to <span style={{ color: "rgba(255,255,255,0.7)" }}>{otpEmail}</span>
                </p>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="otp-code" className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>Verification code</Label>
                  <Input
                    id="otp-code"
                    type="text"
                    inputMode="numeric"
                    data-testid="input-otp-code"
                    placeholder="000000"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="h-14 text-center text-2xl tracking-[0.4em] border-white/10 bg-white/5 text-white placeholder:text-white/15 focus:border-[#d4b461]/50"
                    onKeyDown={(e) => { if (e.key === "Enter" && otpCode.length === 6) verifyOtp.mutate(); }}
                    autoFocus
                  />
                </div>

                <Button
                  type="button"
                  data-testid="button-verify-otp"
                  className="w-full h-11 font-semibold border-0"
                  style={{ background: "linear-gradient(135deg, #d4b461, #b8943f)", color: "#1a1a1a" }}
                  disabled={verifyOtp.isPending || otpCode.length !== 6}
                  onClick={() => verifyOtp.mutate()}
                >
                  {verifyOtp.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-black/20 border-t-black/60 rounded-full animate-spin" />
                      Verifying...
                    </span>
                  ) : "Verify & Sign in"}
                </Button>

                <div className="text-center">
                  {countdown > 0 ? (
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Resend code in {countdown}s
                    </p>
                  ) : (
                    <button
                      type="button"
                      data-testid="button-resend-otp"
                      onClick={() => { sendOtp.mutate(); }}
                      disabled={sendOtp.isPending}
                      className="text-sm transition-colors"
                      style={{ color: "rgba(212,180,97,0.7)" }}
                      onMouseOver={e => (e.currentTarget.style.color = "#d4b461")}
                      onMouseOut={e => (e.currentTarget.style.color = "rgba(212,180,97,0.7)")}
                    >
                      Didn't receive it? Resend code
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
