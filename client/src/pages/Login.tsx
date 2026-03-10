import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import logoImg from "@assets/image_1773135984083.png";

export default function Login() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      navigate(user.role === "admin" ? "/admin" : "/dashboard");
    }
  }, [user, isLoading, navigate]);

  const login = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/login", { email, password }),
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/auth/me"], user);
      navigate(user.role === "admin" ? "/admin" : "/dashboard");
    },
    onError: (err: any) => {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Missing fields", description: "Please enter your email and password", variant: "destructive" });
      return;
    }
    login.mutate();
  };

  if (isLoading) return null;

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex">
      {/* Left panel - brand */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col items-center justify-center" style={{ background: "#1c1c1a" }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(212,180,97,0.07) 0%, transparent 70%)" }} />

        {/* Logo image centered */}
        <div className="relative z-10 flex flex-col items-center gap-10">
          <img
            src={logoImg}
            alt="Brandversee"
            className="w-80 h-auto select-none"
            draggable={false}
          />
          <div className="w-16 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(212,180,97,0.5), transparent)" }} />
          <p className="text-sm tracking-[0.3em] uppercase" style={{ color: "rgba(212,180,97,0.5)" }}>
            Client Portal
          </p>
        </div>

        {/* Bottom tagline */}
        <div className="absolute bottom-12 left-0 right-0 text-center">
          <p className="text-xs tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>
            Your growth, tracked & amplified
          </p>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12" style={{ background: "#161614" }}>
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex justify-center mb-10 lg:hidden">
            <img src={logoImg} alt="Brandversee" className="w-48 h-auto" />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.9)" }}>Welcome back</h2>
            <p style={{ color: "rgba(255,255,255,0.4)" }} className="text-sm">Sign in to access your client portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
              className="w-full h-11 font-semibold mt-2 border-0"
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
        </div>
      </div>
    </div>
  );
}
