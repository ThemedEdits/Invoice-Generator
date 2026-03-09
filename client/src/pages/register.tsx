import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, ArrowRight, Mail, Lock, Check, X, ArrowLeft } from "lucide-react";

// ─── Password strength ─────────────────────────────────────────────────────────
interface StrengthRule {
  label: string;
  test:  (p: string) => boolean;
}
const RULES: StrengthRule[] = [
  { label: "At least 8 characters",   test: p => p.length >= 8 },
  { label: "One uppercase letter",     test: p => /[A-Z]/.test(p) },
  { label: "One number",               test: p => /[0-9]/.test(p) },
  { label: "One special character",    test: p => /[^A-Za-z0-9]/.test(p) },
];

function getStrength(password: string): { score: number; label: string; color: string; barColor: string } {
  const score = RULES.filter(r => r.test(password)).length;
  if (password.length === 0) return { score: 0, label: "",          color: "text-slate-400", barColor: "bg-slate-700" };
  if (score <= 1)            return { score: 1, label: "Weak",      color: "text-red-400",   barColor: "bg-red-500"   };
  if (score === 2)           return { score: 2, label: "Fair",      color: "text-amber-400", barColor: "bg-amber-400" };
  if (score === 3)           return { score: 3, label: "Good",      color: "text-lime-400",  barColor: "bg-lime-500"  };
  return                            { score: 4, label: "Strong",    color: "text-emerald-400", barColor: "bg-emerald-500" };
}

export default function Register() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [focused,  setFocused]  = useState<string | null>(null);
  const [agreed,   setAgreed]   = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const strength     = useMemo(() => getStrength(password), [password]);
  const passMatch    = confirm.length > 0 && password === confirm;
  const passMismatch = confirm.length > 0 && password !== confirm;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (strength.score < 2) {
      toast({ title: "Password too weak", description: "Please use a stronger password.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setLocation("/dashboard");
      toast({ title: "Welcome to Invote! 🎉", description: "Your account is ready." });
    } catch (error: any) {
      const msg =
        error.code === "auth/email-already-in-use" ? "An account with this email already exists." :
        error.code === "auth/invalid-email"         ? "Please enter a valid email address." :
        error.code === "auth/weak-password"         ? "Please use a stronger password." :
        error.message;
      toast({ title: "Registration Failed", description: msg, variant: "destructive" });
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
        @keyframes barGrow { from { width: 0; } to { width: 100%; } }
        .animate-fadeUp { animation: fadeUp 0.5s ease forwards; opacity: 0; }
        .animate-fadeIn { animation: fadeIn 0.6s ease forwards; opacity: 0; }
        .grid-bg {
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .glass-card {
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }
        .strength-bar { transition: width 0.4s cubic-bezier(0.4,0,0.2,1), background-color 0.4s ease; }
      `}</style>

      <div className="font-dm min-h-screen bg-[#0d0f14] flex relative overflow-hidden">

        {/* Background */}
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute top-[-15%] left-[20%]  w-[500px] h-[500px] rounded-full bg-amber-500/8  blur-[140px]" />
          <div className="absolute bottom-[-15%] right-[10%] w-[400px] h-[400px] rounded-full bg-indigo-600/8 blur-[120px]" />
        </div>
        <div className="pointer-events-none fixed inset-0 grid-bg" />

        {/* ── Left panel (md+) ──────────────────────────────────────────── */}
        <div className="hidden lg:flex lg:w-[42%] relative flex-col justify-between p-12 border-r border-white/[0.19]">
          <Link href="/">
            <a className="flex items-center gap-3 group w-fit">
              <img src="/invio-logo.svg" alt="Invote" className="h-8 w-auto" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <span className="font-cinzel font-semibold text-lg text-white group-hover:text-amber-400 transition-colors">Invote</span>
            </a>
          </Link>

          <div>
            <h2 className="font-cinzel text-2xl font-bold text-white leading-snug mb-6">
              Start your journey<br />
              <span className="text-amber-400">to effortless invoicing.</span>
            </h2>

            {/* Progress steps */}
            <div className="space-y-4">
              {[
                { step: "01", title: "Create your account",   desc: "Free forever. No credit card."          },
                { step: "02", title: "Upload a template",      desc: "Use your own invoice design."           },
                { step: "03", title: "Generate & send",        desc: "Beautiful PDFs ready in seconds."       },
              ].map((s, i) => (
                <div key={s.step} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center flex-shrink-0">
                    <span className="font-cinzel text-xs font-bold text-amber-400">{s.step}</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{s.title}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{s.desc}</p>
                  </div>
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

        {/* ── Right: form ──────────────────────────────────────────────── */}
        <div className="flex-1 flex items-center justify-center p-6 relative z-10">
          <div className="w-full max-w-md">

            {/* Mobile logo */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
              <img src="/invio-logo.svg" alt="Invote" className="h-8 w-auto" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <span className="font-cinzel font-semibold text-lg text-white">Invote</span>
            </div>

            {/* Back */}
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
              <h1 className="font-cinzel text-3xl font-bold text-white mb-2">Create account</h1>
              <p className="text-slate-400 text-sm">Join thousands of creators on Invote</p>
            </div>

            {/* Card */}
            <div
              className="glass-card border border-white/[0.08] rounded-2xl p-8 animate-fadeUp"
              style={{ animationDelay: "0.15s", animationFillMode: "both" }}
            >
              <form onSubmit={handleRegister} className="space-y-4">

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
                      placeholder="Create a strong password"
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

                  {/* Strength meter */}
                  {password.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {/* Bar */}
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} className="flex-1 h-1 rounded-full bg-white/[0.03]/[0.08] overflow-hidden">
                            <div
                              className={`h-full rounded-full strength-bar ${i <= strength.score ? strength.barColor : "bg-transparent"}`}
                              style={{ width: i <= strength.score ? "100%" : "0%" }}
                            />
                          </div>
                        ))}
                      </div>
                      {/* Label */}
                      <div className="flex items-center justify-between">
                        <p className={`text-xs font-semibold ${strength.color}`}>{strength.label}</p>
                        <p className="text-xs text-slate-400">{strength.score}/4 rules met</p>
                      </div>
                      {/* Rules checklist */}
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1">
                        {RULES.map(rule => {
                          const ok = rule.test(password);
                          return (
                            <div key={rule.label} className="flex items-center gap-1.5">
                              {ok
                                ? <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                                : <X     className="w-3 h-3 text-slate-300 flex-shrink-0" />
                              }
                              <span className={`text-[10px] ${ok ? "text-emerald-400" : "text-slate-400"}`}>
                                {rule.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Confirm Password</label>
                  <div className={`relative flex items-center rounded-xl border transition-all duration-200 ${
                    passMismatch ? "border-red-500/50 bg-red-500/5" :
                    passMatch    ? "border-emerald-500/50 bg-emerald-500/5" :
                    focused === "confirm" ? "border-amber-400/60 bg-amber-400/5" : "border-white/10 bg-white/[0.03]/[0.04]"
                  }`}>
                    <Lock className={`w-4 h-4 absolute left-3.5 transition-colors ${
                      passMismatch ? "text-red-400" : passMatch ? "text-emerald-400" :
                      focused === "confirm" ? "text-amber-400" : "text-slate-400"
                    }`} />
                    <input
                      type={showConf ? "text" : "password"}
                      required
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      onFocus={() => setFocused("confirm")}
                      onBlur={() => setFocused(null)}
                      placeholder="Re-enter your password"
                      className="w-full bg-transparent pl-10 pr-12 py-3 text-sm text-white placeholder:text-slate-400 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConf(v => !v)}
                      className="absolute right-3.5 text-slate-400 hover:text-slate-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showConf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passMismatch && <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><X className="w-3 h-3" /> Passwords don't match</p>}
                  {passMatch    && <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1"><Check className="w-3 h-3" /> Passwords match</p>}
                </div>

                {/* Terms */}
                <div className="flex items-start gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setAgreed(v => !v)}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-150 ${agreed ? "bg-amber-400 border-amber-400" : "border-white/20 bg-white/[0.03]/[0.04] hover:border-amber-400/40"}`}
                  >
                    {agreed && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    I agree to the{" "}
                    <a href="#" className="text-amber-400 hover:text-amber-300 transition-colors">Terms of Service</a>
                    {" "}and{" "}
                    <a href="#" className="text-amber-400 hover:text-amber-300 transition-colors">Privacy Policy</a>
                  </p>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || !agreed || passMismatch}
                  className="w-full flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-amber-400/20 hover:-translate-y-px active:translate-y-0 text-sm mt-1"
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
                    : <><span>Create Account</span><ArrowRight className="w-4 h-4" /></>
                  }
                </button>
              </form>
            </div>

            {/* Login link */}
            <p
              className="mt-6 text-center text-sm text-slate-500 animate-fadeIn"
              style={{ animationDelay: "0.35s", animationFillMode: "both" }}
            >
              Already have an account?{" "}
              <Link href="/login">
                <a className="text-amber-400 font-semibold hover:text-amber-300 transition-colors">
                  Sign in
                </a>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}