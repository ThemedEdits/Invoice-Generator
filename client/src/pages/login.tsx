import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Eye, EyeOff, Loader2, ArrowRight, Mail, Lock, ArrowLeft } from "lucide-react";

export default function Login() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [focused,  setFocused]  = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

useEffect(() => {
  if (user) setLocation("/dashboard");
}, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      // Map Firebase error codes to friendly messages
      const msg =
        error.code === "auth/user-not-found"    ? "No account found with this email." :
        error.code === "auth/wrong-password"     ? "Incorrect password. Please try again." :
        error.code === "auth/invalid-email"      ? "Please enter a valid email address." :
        error.code === "auth/too-many-requests"  ? "Too many attempts. Please wait and try again." :
        error.message;
      toast({ title: "Login Failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        .font-cinzel { font-family: 'Cinzel', serif; }
        .font-dm     { font-family: 'DM Sans', sans-serif; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeUp { animation: fadeUp 0.5s ease forwards; opacity: 0; }
        .animate-fadeIn { animation: fadeIn 0.6s ease forwards; opacity: 0; }
        .grid-bg {
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .field-wrap { position: relative; }
        .field-wrap input:focus + .field-border,
        .field-wrap input:not(:placeholder-shown) + .field-border {
          transform: scaleX(1);
        }
        .glass-card {
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }
      `}</style>

      <div className="font-dm min-h-screen bg-[#0d0f14] flex relative overflow-hidden">

        {/* ── Background effects ─────────────────────────────────────────── */}
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute top-[-15%] right-[20%]  w-[500px] h-[500px] rounded-full bg-amber-500/8  blur-[140px]" />
          <div className="absolute bottom-[-15%] left-[10%] w-[400px] h-[400px] rounded-full bg-indigo-600/8 blur-[120px]" />
        </div>
        <div className="pointer-events-none fixed inset-0 grid-bg" />

        {/* ── Left decorative panel (md+) ────────────────────────────────── */}
        <div className="hidden lg:flex lg:w-[45%] relative flex-col justify-between p-12 border-r border-white/[0.19]">
          <Link href="/">
            <a className="flex items-center gap-3 group w-fit">
              <img src="/invio-logo.svg" alt="Invote" className="h-8 w-auto" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <span className="font-cinzel font-semibold text-lg text-white group-hover:text-amber-400 transition-colors">Invote</span>
            </a>
          </Link>

          <div>
            <blockquote className="text-2xl font-cinzel text-white leading-snug mb-4">
              "Invoicing that matches<br />the quality of your work."
            </blockquote>
            <p className="text-slate-500 text-sm">Create once. Invoice forever.</p>

            {/* Mini feature list */}
            <div className="mt-10 space-y-3">
              {[
                "Beautiful, brandable PDF invoices",
                "Auto-calculated tax & totals",
                "Smart customer auto-fill",
                "Real-time dashboard analytics",
              ].map(f => (
                <div key={f} className="flex items-center gap-2.5 text-sm text-slate-400">
                  <div className="w-5 h-5 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-amber-400 text-[10px]">✓</span>
                  </div>
                  {f}
                </div>
              ))}
            </div>
          </div>

          <p className="text-slate-300 text-xs">
            By{" "}
            <a href="https://themed-edits.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-amber-400 transition-colors">
              Themed Edits
            </a>
          </p>
        </div>

        {/* ── Right: form ───────────────────────────────────────────────── */}
        <div className="flex-1 flex items-center justify-center p-6 relative z-10">
          <div className="w-full max-w-md">

            {/* Mobile logo */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
              <img src="/invio-logo.svg" alt="Invote" className="h-8 w-auto" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <span className="font-cinzel font-semibold text-lg text-white">Invote</span>
            </div>

            {/* Back to landing */}
            <Link href="/">
              <a className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors mb-8 group">
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                Back to home
              </a>
            </Link>

            {/* Header */}
            <div
              className="mb-8 animate-fadeUp"
              style={{ animationDelay: "0.05s", animationFillMode: "both" }}
            >
              <h1 className="font-cinzel text-3xl font-bold text-white mb-2">Welcome back</h1>
              <p className="text-slate-400 text-sm">Sign in to your Invote workspace</p>
            </div>

            {/* Card */}
            <div
              className="glass-card border border-white/[0.08] rounded-2xl p-8 animate-fadeUp"
              style={{ animationDelay: "0.15s", animationFillMode: "both" }}
            >
              <form onSubmit={handleLogin} className="space-y-5">

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Address</label>
                  <div className={`relative flex items-center rounded-xl border transition-all duration-200 ${focused === "email" ? "border-amber-400/60 bg-amber-400/5" : "border-white/10 bg-white/[0.03]/[0.04]"}`}>
                    <Mail className={`w-4 h-4 absolute left-3.5 transition-colors ${focused === "email" ? "text-amber-400" : "text-slate-400"}`} />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onFocus={() => setFocused("email")}
                      onBlur={() => setFocused(null)}
                      placeholder="you@example.com"
                      className="w-full bg-transparent pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-400 outline-none"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
                  <div className={`relative flex items-center rounded-xl border transition-all duration-200 ${focused === "password" ? "border-amber-400/60 bg-amber-400/5" : "border-white/10 bg-white/[0.03]/[0.04]"}`}>
                    <Lock className={`w-4 h-4 absolute left-3.5 transition-colors ${focused === "password" ? "text-amber-400" : "text-slate-400"}`} />
                    <input
                      type={showPass ? "text" : "password"}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onFocus={() => setFocused("password")}
                      onBlur={() => setFocused(null)}
                      placeholder="••••••••"
                      className="w-full bg-transparent pl-10 pr-12 py-3 text-sm text-white placeholder:text-slate-400 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      className="absolute right-3.5 text-slate-400 hover:text-slate-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-amber-400/20 hover:-translate-y-px active:translate-y-0 text-sm mt-2"
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                    : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>
                  }
                </button>
              </form>
            </div>

            {/* Register link */}
            <p
              className="mt-6 text-center text-sm text-slate-500 animate-fadeIn"
              style={{ animationDelay: "0.35s", animationFillMode: "both" }}
            >
              Don't have an account?{" "}
              <Link href="/register">
                <a className="text-amber-400 font-semibold hover:text-amber-300 transition-colors">
                  Create one now
                </a>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}