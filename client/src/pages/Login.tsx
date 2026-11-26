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
import { SiGoogle, SiFacebook } from "react-icons/si";
const oraviniLogoPath = "/oravini-logo.png";

const GOLD = "#d4b461";

type Tab = "login" | "register" | "forgot";

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
  const [fbHint, setFbHint] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [showRegPw, setShowRegPw] = useState(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotNewPw, setForgotNewPw] = useState("");
  const [forgotConfirmPw, setForgotConfirmPw] = useState("");
  const [forgotStep, setForgotStep] = useState<"email" | "code" | "done">("email");
  const [showForgotPw, setShowForgotPw] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      if (user.email === "oravini@gmail.com") return navigate("/portal");
      if (user.role === "admin") return navigate("/admin");
      if (redirectTo === "audit") return navigate("/audit");
      if (redirectTo && redirectTo.startsWith("/")) return navigate(redirectTo);
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
    } else if (error === "facebook_failed") {
      toast({ title: "Facebook sign-in failed", description: msg ? decodeURIComponent(msg) : "Could not sign in with Facebook.", variant: "destructive" });
      window.history.replaceState({}, "", "/login");
    }
  }, []);

  const redirectAfterAuth = (u: any) => {
    queryClient.setQueryData(["/api/auth/me"], u);
    if (u.email === "oravini@gmail.com") return navigate("/portal");
    if (u.role === "admin") return navigate("/admin");
    if (redirectTo === "audit") return navigate("/audit");
    if (redirectTo && redirectTo.startsWith("/")) return navigate(redirectTo);
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
      } else if (err.message === "FACEBOOK_ACCOUNT") {
        setFbHint(true);
        toast({ title: "This account uses Facebook sign-in", description: "Click 'Continue with Facebook' to log in.", variant: "destructive" });
      } else {
        toast({ title: "Login failed", description: err.message, variant: "destructive" });
      }
    },
  });

  const register = useMutation({
    mutationFn: async () => {
      if (!regName.trim()) throw new Error("Full name is required");
      if (!regEmail.trim()) throw new Error("Email is required");
      if (regPassword.length < 8) throw new Error("Password must be at least 8 characters");
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

  const sendResetCode = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/forgot-password", { email: forgotEmail.trim() }),
    onSuccess: () => {
      setForgotStep("code");
      toast({ title: "Code sent!", description: "Check your email for the 6-digit reset code." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const resetPassword = useMutation({
    mutationFn: async () => {
      if (!forgotCode || forgotCode.length !== 6) throw new Error("Enter the 6-digit code from your email");
      if (!forgotNewPw) throw new Error("Enter a new password");
      if (forgotNewPw !== forgotConfirmPw) throw new Error("Passwords do not match");
      return apiRequest("POST", "/api/auth/reset-password", { email: forgotEmail.trim(), code: forgotCode.trim(), newPassword: forgotNewPw });
    },
    onSuccess: () => {
      setForgotStep("done");
      toast({ title: "Password reset!", description: "You can now sign in with your new password." });
    },
    onError: (err: any) => toast({ title: "Reset failed", description: err.message, variant: "destructive" }),
  });

  if (isLoading) return null;

  // Build Google auth URL carrying ref code so it survives the OAuth redirect
  const googleAuthUrl = (() => {
    const urlRef = new URLSearchParams(window.location.search).get("ref");
    const refCookie = document.cookie.split(";").map(c => c.trim()).find(c => c.startsWith("referral_code="));
    const refCode = urlRef || (refCookie ? decodeURIComponent(refCookie.split("=").slice(1).join("=")) : null);
    const params = new URLSearchParams();
    if (redirectTo) params.set("redirect", redirectTo);
    if (refCode) params.set("ref", refCode);
    const qs = params.toString();
    return `/api/auth/google${qs ? `?${qs}` : ""}`;
  })();
