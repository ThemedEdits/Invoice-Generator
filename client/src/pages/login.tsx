import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Eye, EyeOff, Loader2, ArrowRight, Mail, Lock, ArrowLeft, MailCheck, RefreshCw } from "lucide-react";

const SHARED_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
  .font-cinzel { font-family: 'Cinzel', serif; }
  .font-dm     { font-family: 'DM Sans', sans-serif; }
  @keyframes fadeUp  { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pulse-ring { 0% { transform: scale(1); opacity: 0.4; } 100% { transform: scale(1.6); opacity: 0; } }
  .animate-fadeUp  { animation: fadeUp 0.5s ease forwards; opacity: 0; }
  .animate-fadeIn  { animation: fadeIn 0.6s ease forwards; opacity: 0; }
  .pulse-ring      { animation: pulse-ring 2s ease-out infinite; }
  .grid-bg {
    background-image:
      linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
    background-size: 40px 40px;
  }
  .glass-card { background: rgba(255,255,255,0.03); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); }
`;

export default function Login() {
  const [email,          setEmail]          = useState("");
  const [password,       setPassword]       = useState("");
  const [showPass,       setShowPass]       = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [focused,        setFocused]        = useState<string | null>(null);
  const [verifyScreen,   setVerifyScreen]   = useState(false);
  const [resending,      setResending]      = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.emailVerified) setLocation("/dashboard");
  }, [user]);

  const startResendCooldown = () => {
    setResendCooldown(60);
    const iv = setInterval(() => {
      setResendCooldown(prev => { if (prev <= 1) { clearInterval(iv); return 0; } return prev - 1; });
    }, 1000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (!cred.user.emailVerified) {
        // Signed in but not verified — show verify screen
        await sendEmailVerification(cred.user);
        setVerifyScreen(true);
        startResendCooldown();
        return;
      }
      setLocation("/dashboard");
    } catch (error: any) {
      const msg =
        error.code === "auth/user-not-found"    ? "No account found with this email." :
        error.code === "auth/wrong-password"     ? "Incorrect password. Please try again." :
        error.code === "auth/invalid-email"      ? "Please enter a valid email address." :
        error.code === "auth/too-many-requests"  ? "Too many attempts. Please wait and try again." :
        error.code === "auth/invalid-credential" ? "Incorrect email or password." :
        error.message;
      toast({ title: "Login Failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!auth.currentUser || resendCooldown > 0) return;
    setResending(true);
    try {
      await sendEmailVerification(auth.currentUser);
      toast({ title: "Email sent!", description: "Check your inbox again." });
      startResendCooldown();
    } catch {
      toast({ title: "Failed to resend", description: "Please wait a moment and try again.", variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  const handleCheckVerified = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        toast({ title: "Email verified! 🎉", description: "Welcome to Invote." });
        setLocation("/dashboard");
      } else {
        toast({ title: "Not verified yet", description: "Please click the link in your inbox first.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ── Verify email screen ────────────────────────────────────────────────────
  if (verifyScreen) {
    return (
      <>
        <style>{SHARED_STYLES}</style>
        <div className="font-dm min-h-screen bg-[#0d0f14] flex items-center justify-center relative overflow-hidden p-6">
          <div className="pointer-events-none fixed inset-0">
            <div className="absolute top-[-15%] right-[20%] w-[500px] h-[500px] rounded-full bg-amber-500/8 blur-[140px]" />
            <div className="absolute bottom-[-15%] left-[10%] w-[400px] h-[400px] rounded-full bg-indigo-600/8 blur-[120px]" />
          </div>
          <div className="pointer-events-none fixed inset-0 grid-bg" />

          <div className="w-full max-w-md relative z-10">
            <div className="flex items-center justify-center gap-3 mb-10">
              <img src="/invio-logo.svg" alt="Invote" className="h-8 w-auto" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <span className="font-cinzel font-semibold text-lg text-white">Invote</span>
            </div>

            <div className="glass-card border border-white/[0.08] rounded-2xl p-10 text-center animate-fadeUp">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="pulse-ring absolute inset-0 rounded-full bg-amber-400/20" />
                <div className="relative w-20 h-20 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
                  <MailCheck className="w-9 h-9 text-amber-400" />
                </div>
              </div>

              <h1 className="font-cinzel text-2xl font-bold text-white mb-2">Verify your email</h1>
              <p className="text-slate-400 text-sm mb-1">A verification link was sent to</p>
              <p className="text-amber-400 font-semibold text-sm mb-6 break-all">{email}</p>

              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mb-6 text-left space-y-2.5">
                {["Open your email inbox", "Click the verification link", "Come back and press the button below"].map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-amber-400 text-[10px] font-bold">{i + 1}</span>
                    </div>
                    <span className="text-xs text-slate-400">{step}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleCheckVerified}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 font-bold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-amber-400/20 hover:-translate-y-px active:translate-y-0 text-sm mb-3"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking…</>
                  : <><MailCheck className="w-4 h-4" /> I've verified my email</>
                }
              </button>

              <button
                onClick={handleResend}
                disabled={resending || resendCooldown > 0}
                className="w-full flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors py-2 rounded-xl hover:bg-white/5"
              >
                {resending
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
                  : resendCooldown > 0
                    ? <><RefreshCw className="w-3.5 h-3.5" /> Resend in {resendCooldown}s</>
                    : <><RefreshCw className="w-3.5 h-3.5" /> Resend verification email</>
                }
              </button>
            </div>

            <p className="mt-5 text-center text-xs text-slate-600">
              <button onClick={() => setVerifyScreen(false)} className="text-amber-400 hover:text-amber-300 transition-colors">
                ← Back to login
              </button>
            </p>
          </div>
        </div>
      </>
    );
  }

  // ── Login form ─────────────────────────────────────────────────────────────
  return (
    <>
      <style>{SHARED_STYLES}</style>
      <div className="font-dm min-h-screen bg-[#0d0f14] flex relative overflow-hidden">

        <div className="pointer-events-none fixed inset-0">
          <div className="absolute top-[-15%] right-[20%]  w-[500px] h-[500px] rounded-full bg-amber-500/8  blur-[140px]" />
          <div className="absolute bottom-[-15%] left-[10%] w-[400px] h-[400px] rounded-full bg-indigo-600/8 blur-[120px]" />
        </div>
        <div className="pointer-events-none fixed inset-0 grid-bg" />

        {/* Left panel */}
        <div className="hidden lg:flex lg:w-[45%] relative flex-col justify-between p-12 border-r border-white/[0.08]">
          <Link href="/"><a className="flex items-center gap-3 group w-fit">
            <img src="/invio-logo.svg" alt="Invote" className="h-8 w-auto" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <span className="font-cinzel font-semibold text-lg text-white group-hover:text-amber-400 transition-colors">Invote</span>
          </a></Link>

          <div>
            <blockquote className="text-2xl font-cinzel text-white leading-snug mb-4">
              "Invoicing that matches<br />the quality of your work."
            </blockquote>
            <p className="text-slate-500 text-sm">Create once. Invoice forever.</p>
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
            <a href="https://themed-edits.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-amber-400 transition-colors">Themed Edits</a>
          </p>
        </div>

        {/* Right: form */}
        <div className="flex-1 flex items-center justify-center p-6 relative z-10">
          <div className="w-full max-w-md">

            <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
              <img src="/invio-logo.svg" alt="Invote" className="h-8 w-auto" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <span className="font-cinzel font-semibold text-lg text-white">Invote</span>
            </div>

            <Link href="/"><a className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors mb-8 group">
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              Back to home
            </a></Link>

            <div className="mb-8 animate-fadeUp" style={{ animationDelay: "0.05s", animationFillMode: "both" }}>
              <h1 className="font-cinzel text-3xl font-bold text-white mb-2">Welcome back</h1>
              <p className="text-slate-400 text-sm">Sign in to your Invote workspace</p>
            </div>

            <div className="glass-card border border-white/[0.08] rounded-2xl p-8 animate-fadeUp" style={{ animationDelay: "0.15s", animationFillMode: "both" }}>
              <form onSubmit={handleLogin} className="space-y-5">

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Address</label>
                  <div className={`relative flex items-center rounded-xl border transition-all duration-200 ${focused === "email" ? "border-amber-400/60 bg-amber-400/5" : "border-white/10 bg-white/[0.04]"}`}>
                    <Mail className={`w-4 h-4 absolute left-3.5 transition-colors ${focused === "email" ? "text-amber-400" : "text-slate-400"}`} />
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} onFocus={() => setFocused("email")} onBlur={() => setFocused(null)} placeholder="you@example.com" className="w-full bg-transparent pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-400 outline-none" />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
                  <div className={`relative flex items-center rounded-xl border transition-all duration-200 ${focused === "password" ? "border-amber-400/60 bg-amber-400/5" : "border-white/10 bg-white/[0.04]"}`}>
                    <Lock className={`w-4 h-4 absolute left-3.5 transition-colors ${focused === "password" ? "text-amber-400" : "text-slate-400"}`} />
                    <input type={showPass ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} onFocus={() => setFocused("password")} onBlur={() => setFocused(null)} placeholder="••••••••" className="w-full bg-transparent pl-10 pr-12 py-3 text-sm text-white placeholder:text-slate-400 outline-none" />
                    <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3.5 text-slate-400 hover:text-slate-300 transition-colors" tabIndex={-1}>
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 font-bold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-amber-400/20 hover:-translate-y-px active:translate-y-0 text-sm mt-2">
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                    : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>
                  }
                </button>
              </form>
            </div>

            <p className="mt-6 text-center text-sm text-slate-500 animate-fadeIn" style={{ animationDelay: "0.35s", animationFillMode: "both" }}>
              Don't have an account?{" "}
              <Link href="/register"><a className="text-amber-400 font-semibold hover:text-amber-300 transition-colors">Create one now</a></Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}