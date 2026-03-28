import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Lock, Mail, ArrowLeft, ShieldCheck, User } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import logoImg from "@assets/image_1773135984083.png";

type Tab = "login" | "register";
type OtpMode = "otp-email" | "otp-code";

export default function Login() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("login");
  const [otpMode, setOtpMode] = useState<OtpMode | null>(null);
  const [googleHint, setGoogleHint] = useState(false);

  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Register fields
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [showRegPw, setShowRegPw] = useState(false);

  // OTP
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === "admin") return navigate("/admin");
      navigate(user.planConfirmed ? "/dashboard" : "/");
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const msg = params.get("msg");
    if (error === "google_failed") {
      toast({
        title: "Google sign-in failed",
        description: msg ? decodeURIComponent(msg) : "Could not sign in with Google. Make sure your account is allowed.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/login");
    }
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const redirectAfterAuth = (u: any) => {
    queryClient.setQueryData(["/api/auth/me"], u);
    if (u.role === "admin") return navigate("/admin");
    navigate(u.planConfirmed ? "/dashboard" : "/");
  };

  const login = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/login", { email, password }),
    onSuccess: redirectAfterAuth,
    onError: (err: any) => {
      if (err.message === "NO_ACCOUNT") {
        setTab("register");
        setRegEmail(email);
        toast({
          title: "No account found",
          description: "We couldn't find an account with that email. Please create one below.",
          variant: "destructive",
        });
      } else if (err.message === "GOOGLE_ACCOUNT") {
        setGoogleHint(true);
        toast({
          title: "This account uses Google sign-in",
          description: "You registered with Google — please click 'Continue with Google' to log in.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Login failed", description: err.message, variant: "destructive" });
      }
    },
  });

  const register = useMutation({
    mutationFn: () => {
      if (!regName.trim()) throw new Error("Full name is required");
      if (!regEmail.trim()) throw new Error("Email is required");
      if (regPassword.length < 6) throw new Error("Password must be at least 6 characters");
      if (regPassword !== regConfirm) throw new Error("Passwords do not match");
      return apiRequest("POST", "/api/auth/register", { name: regName.trim(), email: regEmail.trim(), password: regPassword });
    },
    onSuccess: redirectAfterAuth,
    onError: (err: any) => toast({ title: "Registration failed", description: err.message, variant: "destructive" }),
  });

  const sendOtp = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/otp/send", { email: otpEmail }),
    onSuccess: () => { setOtpMode("otp-code"); setCountdown(60); toast({ title: "Code sent!", description: "Check your email inbox." }); },
    onError: (err: any) => toast({ title: "Failed to send code", description: err.message, variant: "destructive" }),
  });

  const verifyOtp = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/otp/verify", { email: otpEmail, code: otpCode }),
    onSuccess: redirectAfterAuth,
    onError: (err: any) => toast({ title: "Invalid code", description: err.message, variant: "destructive" }),
  });

  if (isLoading) return null;

  const leftPanel = (
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col items-center justify-center" style={{ background: "#1c1c1a" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(212,180,97,0.07) 0%, transparent 70%)" }} />
      <button onClick={() => navigate("/")} className="absolute top-6 left-6 flex items-center gap-1.5 z-10 group" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", fontSize: 13 }}>
        <ArrowLeft className="w-3.5 h-3.5 group-hover:text-yellow-400 transition-colors" />
        <span style={{ letterSpacing: "0.04em" }} className="group-hover:text-yellow-400 transition-colors">Back to Oravini</span>
      </button>
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
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
      <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>or</span>
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
    </div>
  );

  const googleBtn = (
    <div>
      <a href="/api/auth/google" data-testid="button-google-login">
        <Button
          type="button"
          className="w-full h-11 font-medium gap-2 text-white transition-all duration-300"
          style={{
            border: googleHint ? "1.5px solid #d4b461" : "1px solid rgba(255,255,255,0.1)",
            background: googleHint ? "rgba(212,180,97,0.12)" : "rgba(255,255,255,0.05)",
            color: googleHint ? "#d4b461" : "rgba(255,255,255,0.85)",
            boxShadow: googleHint ? "0 0 18px rgba(212,180,97,0.25)" : "none",
          }}
        >
          <SiGoogle className="w-4 h-4" />
          Continue with Google
        </Button>
      </a>
      {googleHint && (
        <p style={{ fontSize: 12, color: "#d4b461", textAlign: "center", marginTop: 8, fontWeight: 500 }}>
          ↑ Your account was created with Google — sign in above
        </p>
      )}
    </div>
  );

  // OTP screens
  if (otpMode === "otp-email") {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex">
        {leftPanel}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12" style={{ background: "#161614" }}>
          <div className="w-full max-w-md">
            <button type="button" onClick={() => setOtpMode(null)} className="flex items-center gap-1.5 text-sm mb-8 transition-colors" style={{ color: "rgba(255,255,255,0.4)" }}>
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
                <Label style={{ color: "rgba(255,255,255,0.6)" }}>Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                  <Input data-testid="input-otp-email" type="email" placeholder="you@example.com" value={otpEmail} onChange={e => setOtpEmail(e.target.value)} className="pl-10 h-11 border-white/10 bg-white/5 text-white placeholder:text-white/20" onKeyDown={e => { if (e.key === "Enter" && otpEmail) sendOtp.mutate(); }} />
                </div>
              </div>
              <Button data-testid="button-send-otp" className="w-full h-11 font-semibold border-0" style={{ background: "linear-gradient(135deg, #d4b461, #b8943f)", color: "#1a1a1a" }} disabled={sendOtp.isPending || !otpEmail} onClick={() => sendOtp.mutate()}>
                {sendOtp.isPending ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-black/20 border-t-black/60 rounded-full animate-spin" />Sending...</span> : "Send verification code"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (otpMode === "otp-code") {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex">
        {leftPanel}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12" style={{ background: "#161614" }}>
          <div className="w-full max-w-md">
            <button type="button" onClick={() => { setOtpMode("otp-email"); setOtpCode(""); }} className="flex items-center gap-1.5 text-sm mb-8 transition-colors" style={{ color: "rgba(255,255,255,0.4)" }}>
              <ArrowLeft className="w-3.5 h-3.5" /> Change email
            </button>
            <div className="mb-8">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(212,180,97,0.12)", border: "1px solid rgba(212,180,97,0.2)" }}>
                <ShieldCheck className="w-6 h-6" style={{ color: "#d4b461" }} />
              </div>
              <h2 className="text-2xl font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.9)" }}>Enter your code</h2>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Sent to <span style={{ color: "rgba(255,255,255,0.7)" }}>{otpEmail}</span></p>
            </div>
            <div className="space-y-5">
              <Input data-testid="input-otp-code" type="text" inputMode="numeric" placeholder="000000" maxLength={6} value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))} className="h-14 text-center text-2xl tracking-[0.4em] border-white/10 bg-white/5 text-white placeholder:text-white/15" onKeyDown={e => { if (e.key === "Enter" && otpCode.length === 6) verifyOtp.mutate(); }} autoFocus />
              <Button data-testid="button-verify-otp" className="w-full h-11 font-semibold border-0" style={{ background: "linear-gradient(135deg, #d4b461, #b8943f)", color: "#1a1a1a" }} disabled={verifyOtp.isPending || otpCode.length !== 6} onClick={() => verifyOtp.mutate()}>
                {verifyOtp.isPending ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-black/20 border-t-black/60 rounded-full animate-spin" />Verifying...</span> : "Verify & Sign in"}
              </Button>
              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Resend in {countdown}s</p>
                ) : (
                  <button type="button" data-testid="button-resend-otp" onClick={() => sendOtp.mutate()} disabled={sendOtp.isPending} className="text-sm transition-colors" style={{ color: "rgba(212,180,97,0.7)" }}>
                    Didn't receive it? Resend code
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex">
      {leftPanel}

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12" style={{ background: "#161614" }}>
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-10 lg:hidden">
            <img src={logoImg} alt="Brandverse" className="w-48 h-auto" />
          </div>
          <button onClick={() => navigate("/")} className="flex items-center gap-1.5 mb-6 group lg:hidden" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
            <ArrowLeft className="w-3.5 h-3.5 group-hover:text-yellow-400 transition-colors" />
            <span className="group-hover:text-yellow-400 transition-colors" style={{ letterSpacing: "0.04em" }}>Back to Oravini</span>
          </button>

          {/* Tabs */}
          <div className="flex rounded-xl p-1 mb-8" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <button
              data-testid="tab-login"
              onClick={() => { setTab("login"); setGoogleHint(false); }}
              className="flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200"
              style={{
                background: tab === "login" ? "rgba(212,180,97,0.12)" : "transparent",
                color: tab === "login" ? "#d4b461" : "rgba(255,255,255,0.4)",
                border: tab === "login" ? "1px solid rgba(212,180,97,0.25)" : "1px solid transparent",
              }}
            >
              Sign In
            </button>
            <button
              data-testid="tab-register"
              onClick={() => setTab("register")}
              className="flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200"
              style={{
                background: tab === "register" ? "rgba(212,180,97,0.12)" : "transparent",
                color: tab === "register" ? "#d4b461" : "rgba(255,255,255,0.4)",
                border: tab === "register" ? "1px solid rgba(212,180,97,0.25)" : "1px solid transparent",
              }}
            >
              Create Account
            </button>
          </div>

          {/* ── LOGIN TAB ── */}
          {tab === "login" && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-1" style={{ color: "rgba(255,255,255,0.9)" }}>Welcome back</h2>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Sign in to access your client portal</p>
              </div>

              {googleBtn}
              {divider}

              <form onSubmit={e => { e.preventDefault(); if (!email || !password) { toast({ title: "Missing fields", description: "Please enter your email and password", variant: "destructive" }); return; } login.mutate(); }} className="space-y-4">
                <div className="space-y-2">
                  <Label style={{ color: "rgba(255,255,255,0.6)" }}>Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                    <Input id="email" type="email" data-testid="input-email" placeholder="you@example.com" value={email} onChange={e => { setEmail(e.target.value); setGoogleHint(false); }} className="pl-10 h-11 border-white/10 bg-white/5 text-white placeholder:text-white/20 focus:border-[#d4b461]/50" autoComplete="email" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label style={{ color: "rgba(255,255,255,0.6)" }}>Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                    <Input id="password" type={showPassword ? "text" : "password"} data-testid="input-password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10 h-11 border-white/10 bg-white/5 text-white placeholder:text-white/20 focus:border-[#d4b461]/50" autoComplete="current-password" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" data-testid="button-login" className="w-full h-11 font-semibold border-0" style={{ background: "linear-gradient(135deg, #d4b461, #b8943f)", color: "#1a1a1a" }} disabled={login.isPending}>
                  {login.isPending ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-black/20 border-t-black/60 rounded-full animate-spin" />Signing in...</span> : "Sign in to Portal"}
                </Button>
              </form>

              {divider}

              <button type="button" data-testid="button-use-otp" onClick={() => { setOtpMode("otp-email"); setOtpEmail(email); }} className="w-full text-sm text-center py-2 transition-colors" style={{ color: "rgba(212,180,97,0.7)" }}>
                Sign in with email code instead
              </button>
            </>
          )}

          {/* ── REGISTER TAB ── */}
          {tab === "register" && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-1" style={{ color: "rgba(255,255,255,0.9)" }}>Create your account</h2>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Join Brandverse and choose your plan</p>
              </div>

              {googleBtn}
              {divider}

              <form onSubmit={e => { e.preventDefault(); register.mutate(); }} className="space-y-4">
                <div className="space-y-2">
                  <Label style={{ color: "rgba(255,255,255,0.6)" }}>Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                    <Input data-testid="input-reg-name" type="text" placeholder="Jane Smith" value={regName} onChange={e => setRegName(e.target.value)} className="pl-10 h-11 border-white/10 bg-white/5 text-white placeholder:text-white/20 focus:border-[#d4b461]/50" autoComplete="name" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label style={{ color: "rgba(255,255,255,0.6)" }}>Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                    <Input data-testid="input-reg-email" type="email" placeholder="you@example.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="pl-10 h-11 border-white/10 bg-white/5 text-white placeholder:text-white/20 focus:border-[#d4b461]/50" autoComplete="email" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label style={{ color: "rgba(255,255,255,0.6)" }}>Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                    <Input data-testid="input-reg-password" type={showRegPw ? "text" : "password"} placeholder="At least 6 characters" value={regPassword} onChange={e => setRegPassword(e.target.value)} className="pl-10 pr-10 h-11 border-white/10 bg-white/5 text-white placeholder:text-white/20 focus:border-[#d4b461]/50" autoComplete="new-password" />
                    <button type="button" onClick={() => setShowRegPw(!showRegPw)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {showRegPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label style={{ color: "rgba(255,255,255,0.6)" }}>Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                    <Input data-testid="input-reg-confirm" type="password" placeholder="Repeat your password" value={regConfirm} onChange={e => setRegConfirm(e.target.value)} className="pl-10 h-11 border-white/10 bg-white/5 text-white placeholder:text-white/20 focus:border-[#d4b461]/50" autoComplete="new-password"
                      style={{ borderColor: regConfirm && regConfirm !== regPassword ? "rgba(239,68,68,0.5)" : undefined }} />
                  </div>
                  {regConfirm && regConfirm !== regPassword && <p className="text-xs" style={{ color: "rgba(239,68,68,0.8)" }}>Passwords do not match</p>}
                </div>
                <Button type="submit" data-testid="button-register" className="w-full h-11 font-semibold border-0 mt-2" style={{ background: "linear-gradient(135deg, #d4b461, #b8943f)", color: "#1a1a1a" }} disabled={register.isPending}>
                  {register.isPending ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-black/20 border-t-black/60 rounded-full animate-spin" />Creating account...</span> : "Create Account"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
