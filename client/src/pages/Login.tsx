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
import { Zap, Eye, EyeOff, Lock, Mail } from "lucide-react";

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
    <div className="min-h-screen bg-background flex">
      {/* Left panel - decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-foreground relative overflow-hidden flex-col items-start justify-end p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-transparent" />
        <div className="absolute top-8 left-8 flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <span className="text-white font-bold text-lg">Brandverse</span>
        </div>

        {/* Decorative circles */}
        <div className="absolute top-20 right-20 w-64 h-64 rounded-full border border-white/10" />
        <div className="absolute top-32 right-32 w-40 h-40 rounded-full border border-white/10" />
        <div className="absolute bottom-32 right-8 w-80 h-80 rounded-full border border-primary/20" />

        <div className="relative z-10 mb-8">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-6">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-white/80 text-xs font-medium">Client Portal</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Your growth,<br />
            <span className="text-primary">tracked & amplified.</span>
          </h1>
          <p className="text-white/60 text-lg leading-relaxed max-w-md">
            Access your personalized dashboard, documents, progress tracker, and direct communication with your coach — all in one place.
          </p>
        </div>

        {/* Stats */}
        <div className="relative z-10 flex gap-8">
          {[["100%", "Personalized"], ["Real-time", "Chat"], ["Secure", "Documents"]].map(([val, label]) => (
            <div key={label}>
              <p className="text-white font-bold text-xl">{val}</p>
              <p className="text-white/50 text-xs">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">Brandverse</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-1.5">Welcome back</h2>
            <p className="text-muted-foreground">Sign in to access your client portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  data-testid="input-email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  data-testid="input-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              data-testid="button-login"
              className="w-full h-11 font-semibold"
              disabled={login.isPending}
            >
              {login.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : "Sign in to Portal"}
            </Button>
          </form>

          <div className="mt-8 p-4 bg-muted/50 rounded-xl border border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-2.5">Demo credentials</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Admin:</span>
                <span className="font-mono text-foreground">admin@brandverse.com / Brandverse@2024</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Client:</span>
                <span className="font-mono text-foreground">sarah.johnson@gmail.com / client123</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
