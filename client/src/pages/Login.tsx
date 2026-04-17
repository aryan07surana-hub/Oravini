import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Lock, Mail, ArrowLeft, User } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import oraviniLogoPath from "@assets/FINAL_IMAGE_ORAVINI_1774725144846.png";

const GOLD = "#d4b461";

type Tab = "login" | "register";

function AnimatedBackground() {
  const ref = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -999, y: -999 });
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let raf: number;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);
    const N = 36;
    type P = { x: number; y: number; vx: number; vy: number; r: number; o: number };
    const ps: P[] = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
      r: Math.random() * 1.3 + 0.3, o: Math.random() * 0.22 + 0.05,
    }));
    const onMouse = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    window.addEventListener("mousemove", onMouse);
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const { x: mx, y: my } = mouse.current;
      ps.forEach(p => {
        const dx = p.x - mx, dy = p.y - my, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 90) { p.vx += (dx / d) * 0.016; p.vy += (dy / d) * 0.016; }
        p.vx *= 0.99; p.vy *= 0.99; p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212,180,97,${p.o})`; ctx.fill();
      });
      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const dx = ps[i].x - ps[j].x, dy = ps[i].y - ps[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 100) {
            ctx.beginPath(); ctx.moveTo(ps[i].x, ps[i].y); ctx.lineTo(ps[j].x, ps[j].y);
            ctx.strokeStyle = `rgba(212,180,97,${0.09 * (1 - d / 100)})`; ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); window.removeEventListener("mousemove", onMouse); };
  }, []);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />;
}

export default function Login() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const params = new URLSearchParams(window.location.search);
  const redirectTo = params.get("redirect");
  const tabParam = params.get("tab");

  const [tab, setTab] = useState<Tab>(tabParam === "register" ? "register" : "login");
  const [googleHint, setGoogleHint] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [showRegPw, setShowRegPw] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === "admin") return navigate("/admin");
      if (redirectTo === "audit") return navigate("/audit");
      navigate(!(user as any).surveyCompleted ? "/onboarding" : user.planConfirmed ? "/dashboard" : "/select-plan");
    }
  }, [user, isLoading]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const error = p.get("error");
    const msg = p.get("msg");
    if (error === "google_failed") {
      toast({ title: "Google sign-in failed", description: msg ? decodeURIComponent(msg) : "Could not sign in with Google.", variant: "destructive" });
      window.history.replaceState({}, "", "/login");
    }
  }, []);

  const redirectAfterAuth = (u: any) => {
    queryClient.setQueryData(["/api/auth/me"], u);
    if (u.role === "admin") return navigate("/admin");
    if (redirectTo === "audit") return navigate("/audit");
    navigate(!u.surveyCompleted ? "/onboarding" : u.planConfirmed ? "/dashboard" : "/select-plan");
  };

  const login = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/login", { email, password }),
    onSuccess: redirectAfterAuth,
    onError: (err: any) => {
      if (err.message === "NO_ACCOUNT") {
        setTab("register"); setRegEmail(email);
        toast({ title: "No account found", description: "Create an account below to get started.", variant: "destructive" });
      } else if (err.message === "GOOGLE_ACCOUNT") {
        setGoogleHint(true);
        toast({ title: "This account uses Google sign-in", description: "Click 'Continue with Google' to log in.", variant: "destructive" });
      } else {
        toast({ title: "Login failed", description: err.message, variant: "destructive" });
      }
    },
  });

  const register = useMutation({
    mutationFn: async () => {
      if (!regName.trim()) throw new Error("Full name is required");
      if (!regEmail.trim()) throw new Error("Email is required");
      if (regPassword.length < 6) throw new Error("Password must be at least 6 characters");
      if (regPassword !== regConfirm) throw new Error("Passwords do not match");
      // Read referral code: prefer URL ?ref= param, fallback to cookie
      const urlRef = new URLSearchParams(window.location.search).get("ref");
      const refCookie = document.cookie.split(";").map(c => c.trim()).find(c => c.startsWith("referral_code="));
      const referralCode = urlRef || (refCookie ? decodeURIComponent(refCookie.split("=").slice(1).join("=")) : undefined);
      // If we got the code from URL param only, fire the track API to also set the cookie for Google sign-in path
      if (urlRef && !refCookie) {
        fetch(`/api/referral/track?code=${encodeURIComponent(urlRef)}`).catch(() => {});
      }
      return apiRequest("POST", "/api/auth/register", { name: regName.trim(), email: regEmail.trim(), password: regPassword, ...(referralCode ? { referralCode } : {}) });
    },
    onSuccess: redirectAfterAuth,
    onError: (err: any) => toast({ title: "Registration failed", description: err.message, variant: "destructive" }),
  });

  if (isLoading) return null;

  const googleBtn = (
    <div>
      <a href={`/api/auth/google${redirectTo ? `?redirect=${redirectTo}` : ""}`} data-testid="button-google-login">
        <Button type="button" className="w-full h-11 font-medium gap-2 transition-all duration-300"
          style={{ border: googleHint ? `1.5px solid ${GOLD}` : "1px solid rgba(255,255,255,0.1)", background: googleHint ? "rgba(212,180,97,0.12)" : "rgba(255,255,255,0.05)", color: googleHint ? GOLD : "rgba(255,255,255,0.85)", boxShadow: googleHint ? "0 0 18px rgba(212,180,97,0.25)" : "none" }}>
          <SiGoogle className="w-4 h-4" />
          Continue with Google
        </Button>
      </a>
      {googleHint && <p style={{ fontSize: 12, color: GOLD, textAlign: "center", marginTop: 8, fontWeight: 500 }}>↑ Your account was created with Google</p>}
    </div>
  );

  const divider = (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
      <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>or</span>
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
    </div>
  );

  const leftPanel = (
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col items-center justify-center" style={{ background: "#050505" }}>
      <AnimatedBackground />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(212,180,97,0.08) 0%, transparent 65%)", pointerEvents: "none" }} />
      <button onClick={() => navigate("/")} className="absolute top-6 left-6 z-10 flex items-center gap-1.5 group" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
        <ArrowLeft className="w-3.5 h-3.5 group-hover:text-yellow-400 transition-colors" />
        <span style={{ letterSpacing: "0.04em" }} className="group-hover:text-yellow-400 transition-colors">Back to Oravini</span>
      </button>
      <div className="relative z-10 flex flex-col items-center gap-6 text-center px-12">
        <img src={oraviniLogoPath} alt="Oravini" style={{ width: 110, height: 110, objectFit: "cover", objectPosition: "50% 32%", borderRadius: 16, filter: "drop-shadow(0 0 30px rgba(212,180,97,0.4))" }} />
        <div>
          <div style={{ fontSize: "clamp(36px, 4vw, 52px)", fontWeight: 900, letterSpacing: "0.1em", background: `linear-gradient(135deg, #f0c84b 0%, ${GOLD} 50%, #b8962e 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", textTransform: "uppercase", lineHeight: 1 }}>
            ORAVINI
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", letterSpacing: "0.25em", textTransform: "uppercase", marginTop: 8 }}>
            Powered by Brandverse
          </div>
        </div>
        <div style={{ width: 60, height: 1, background: `linear-gradient(to right, transparent, rgba(212,180,97,0.5), transparent)` }} />
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", lineHeight: 1.7, maxWidth: 320 }}>
          Your AI-powered content growth platform. 9 tools. One dashboard. Infinite leverage.
        </p>
      </div>
      <div className="absolute bottom-10 left-0 right-0 text-center">
        <p style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(255,255,255,0.15)" }}>Your growth, tracked & amplified</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex" style={{ background: "#0a0a0a" }}>
      {leftPanel}

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative" style={{ background: "#0d0d0d" }}>
        <div className="w-full max-w-md">

          {/* Mobile top */}
          <div className="lg:hidden flex flex-col items-center gap-3 mb-8">
            <img src={oraviniLogoPath} alt="Oravini" className="w-16 h-16" style={{ objectFit: "cover", objectPosition: "50% 32%", borderRadius: 10, filter: "drop-shadow(0 0 20px rgba(212,180,97,0.4))" }} />
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "0.1em", background: `linear-gradient(135deg, #f0c84b, ${GOLD})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", textTransform: "uppercase" }}>ORAVINI</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em", textTransform: "uppercase" }}>Powered by Brandverse</div>
          </div>
          <button onClick={() => navigate("/")} className="flex items-center gap-1.5 mb-6 group lg:hidden" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
            <ArrowLeft className="w-3.5 h-3.5 group-hover:text-yellow-400 transition-colors" />
            <span className="group-hover:text-yellow-400 transition-colors" style={{ letterSpacing: "0.04em" }}>Back to Oravini</span>
          </button>

          {/* Tabs */}
          <div className="flex rounded-xl p-1 mb-8" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {(["login", "register"] as Tab[]).map(t => (
              <button key={t} data-testid={`tab-${t}`} onClick={() => { setTab(t); setGoogleHint(false); }}
                className="flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200"
                style={{ background: tab === t ? "rgba(212,180,97,0.12)" : "transparent", color: tab === t ? GOLD : "rgba(255,255,255,0.4)", border: tab === t ? "1px solid rgba(212,180,97,0.25)" : "1px solid transparent" }}>
                {t === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {/* LOGIN */}
          {tab === "login" && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-1" style={{ color: "rgba(255,255,255,0.9)" }}>Welcome back</h2>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Sign in to access your Oravini portal</p>
              </div>
              {googleBtn}
              {divider}
              <form onSubmit={e => { e.preventDefault(); if (!email || !password) { toast({ title: "Missing fields", description: "Please enter your email and password", variant: "destructive" }); return; } login.mutate(); }} className="space-y-4">
                <div className="space-y-2">
                  <Label style={{ color: "rgba(255,255,255,0.55)" }}>Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                    <Input data-testid="input-email" type="email" placeholder="you@example.com" value={email} onChange={e => { setEmail(e.target.value); setGoogleHint(false); }} className="pl-10 h-11 border-white/10 bg-white/5 text-white placeholder:text-white/20" autoComplete="email" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label style={{ color: "rgba(255,255,255,0.55)" }}>Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                    <Input data-testid="input-password" type={showPassword ? "text" : "password"} placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10 h-11 border-white/10 bg-white/5 text-white placeholder:text-white/20" autoComplete="current-password" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" data-testid="button-login" className="w-full h-11 font-semibold border-0" style={{ background: "linear-gradient(135deg, #f0c84b, #d4b461)", color: "#1a1a1a" }} disabled={login.isPending}>
                  {login.isPending ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-black/20 border-t-black/60 rounded-full animate-spin" />Signing in...</span> : "Sign In →"}
                </Button>
              </form>
            </>
          )}

          {/* REGISTER */}
          {tab === "register" && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-1" style={{ color: "rgba(255,255,255,0.9)" }}>Create your account</h2>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Join Oravini and start growing today</p>
              </div>
              {googleBtn}
              {divider}
              <form onSubmit={e => { e.preventDefault(); register.mutate(); }} className="space-y-4">
                <div className="space-y-2">
                  <Label style={{ color: "rgba(255,255,255,0.55)" }}>Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                    <Input data-testid="input-reg-name" type="text" placeholder="Jane Smith" value={regName} onChange={e => setRegName(e.target.value)} className="pl-10 h-11 border-white/10 bg-white/5 text-white placeholder:text-white/20" autoComplete="name" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label style={{ color: "rgba(255,255,255,0.55)" }}>Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                    <Input data-testid="input-reg-email" type="email" placeholder="you@example.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="pl-10 h-11 border-white/10 bg-white/5 text-white placeholder:text-white/20" autoComplete="email" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label style={{ color: "rgba(255,255,255,0.55)" }}>Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                    <Input data-testid="input-reg-password" type={showRegPw ? "text" : "password"} placeholder="At least 6 characters" value={regPassword} onChange={e => setRegPassword(e.target.value)} className="pl-10 pr-10 h-11 border-white/10 bg-white/5 text-white placeholder:text-white/20" autoComplete="new-password" />
                    <button type="button" onClick={() => setShowRegPw(!showRegPw)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {showRegPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label style={{ color: "rgba(255,255,255,0.55)" }}>Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                    <Input data-testid="input-reg-confirm" type="password" placeholder="Repeat your password" value={regConfirm} onChange={e => setRegConfirm(e.target.value)} className="pl-10 h-11 border-white/10 bg-white/5 text-white placeholder:text-white/20" autoComplete="new-password"
                      style={{ borderColor: regConfirm && regConfirm !== regPassword ? "rgba(239,68,68,0.5)" : undefined }} />
                  </div>
                  {regConfirm && regConfirm !== regPassword && <p style={{ fontSize: 11, color: "rgba(239,68,68,0.8)" }}>Passwords do not match</p>}
                </div>
                <Button type="submit" data-testid="button-register" className="w-full h-11 font-semibold border-0 mt-2" style={{ background: "linear-gradient(135deg, #f0c84b, #d4b461)", color: "#1a1a1a" }} disabled={register.isPending}>
                  {register.isPending ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-black/20 border-t-black/60 rounded-full animate-spin" />Creating account...</span> : "Create Account & Start Audit →"}
                </Button>
              </form>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center", marginTop: 14, lineHeight: 1.6 }}>
                After signing up, you'll be taken directly to your free audit.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
