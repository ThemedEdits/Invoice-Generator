import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { applyActionCode } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { CheckCircle2, XCircle, Loader2, ArrowRight, MailCheck } from "lucide-react";
import { Link } from "wouter";

type Status = "loading" | "success" | "error" | "invalid";

const SHARED_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
  .font-cinzel { font-family: 'Cinzel', serif; }
  .font-dm     { font-family: 'DM Sans', sans-serif; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pulse-ring { 0% { transform: scale(1); opacity: 0.4; } 100% { transform: scale(1.6); opacity: 0; } }
  @keyframes spin { to { transform: rotate(360deg); } }
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

export default function AuthAction() {
  const [status, setStatus]   = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [, setLocation]       = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode   = params.get("mode");
    const code   = params.get("oobCode");

    if (!mode || !code) {
      setStatus("invalid");
      setMessage("This link is invalid or has expired.");
      return;
    }

    if (mode === "verifyEmail") {
      handleVerifyEmail(code);
    } else {
      setStatus("invalid");
      setMessage("Unsupported action. Please try again from the app.");
    }
  }, []);

  const handleVerifyEmail = async (code: string) => {
    try {
      await applyActionCode(auth, code);
      // Reload user so emailVerified updates
      if (auth.currentUser) {
        await auth.currentUser.reload();
      }
      setStatus("success");
    } catch (err: any) {
      if (
        err.code === "auth/invalid-action-code" ||
        err.code === "auth/expired-action-code"
      ) {
        setStatus("error");
        setMessage("This verification link has expired or already been used. Please request a new one.");
      } else {
        setStatus("error");
        setMessage("Something went wrong. Please try again or contact support.");
      }
    }
  };

  return (
    <>
      <style>{SHARED_STYLES}</style>
      <div className="font-dm min-h-screen bg-[#0d0f14] flex items-center justify-center relative overflow-hidden p-6">

        {/* Background blobs */}
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute top-[-15%] right-[20%] w-[500px] h-[500px] rounded-full bg-amber-500/8 blur-[140px]" />
          <div className="absolute bottom-[-15%] left-[10%] w-[400px] h-[400px] rounded-full bg-indigo-600/8 blur-[120px]" />
        </div>
        <div className="pointer-events-none fixed inset-0 grid-bg" />

        <div className="w-full max-w-md relative z-10">

          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <img
              src="/invio-logo.svg"
              alt="Invote"
              className="h-8 w-auto"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <span className="font-cinzel font-semibold text-lg text-white">Invote</span>
          </div>

          <div className="glass-card border border-white/[0.08] rounded-2xl p-10 text-center animate-fadeUp">

            {/* ── Loading ── */}
            {status === "loading" && (
              <>
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
                  <Loader2 className="w-9 h-9 text-amber-400 animate-spin" />
                </div>
                <h1 className="font-cinzel text-2xl font-bold text-white mb-2">Verifying…</h1>
                <p className="text-slate-400 text-sm">Please wait while we verify your email address.</p>
              </>
            )}

            {/* ── Success ── */}
            {status === "success" && (
              <>
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="pulse-ring absolute inset-0 rounded-full bg-emerald-400/20" />
                  <div className="relative w-20 h-20 rounded-full bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
                    <CheckCircle2 className="w-9 h-9 text-emerald-400" />
                  </div>
                </div>
                <h1 className="font-cinzel text-2xl font-bold text-white mb-2">Email Verified!</h1>
                <p className="text-slate-400 text-sm mb-8">
                  Your email has been successfully verified. You're all set to start using Invote.
                </p>

                {/* Features preview */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mb-8 text-left space-y-2.5">
                  {[
                    "Upload your branded invoice templates",
                    "Generate professional PDFs instantly",
                    "Manage customers & track payments",
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-amber-400 text-[10px]">✓</span>
                      </div>
                      <span className="text-xs text-slate-400">{f}</span>
                    </div>
                  ))}
                </div>

                <Link href="/dashboard">
                  <a className="w-full flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-amber-400/20 hover:-translate-y-px active:translate-y-0 text-sm">
                    Go to Dashboard <ArrowRight className="w-4 h-4" />
                  </a>
                </Link>
              </>
            )}

            {/* ── Error ── */}
            {status === "error" && (
              <>
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-400/10 border border-red-400/20 flex items-center justify-center">
                  <XCircle className="w-9 h-9 text-red-400" />
                </div>
                <h1 className="font-cinzel text-2xl font-bold text-white mb-2">Link Expired</h1>
                <p className="text-slate-400 text-sm mb-8">{message}</p>
                <Link href="/login">
                  <a className="w-full flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-amber-400/20 hover:-translate-y-px active:translate-y-0 text-sm">
                    <MailCheck className="w-4 h-4" /> Back to Login
                  </a>
                </Link>
              </>
            )}

            {/* ── Invalid ── */}
            {status === "invalid" && (
              <>
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-400/10 border border-slate-400/20 flex items-center justify-center">
                  <XCircle className="w-9 h-9 text-slate-400" />
                </div>
                <h1 className="font-cinzel text-2xl font-bold text-white mb-2">Invalid Link</h1>
                <p className="text-slate-400 text-sm mb-8">{message}</p>
                <Link href="/">
                  <a className="w-full flex items-center justify-center gap-2 bg-white/[0.06] hover:bg-white/[0.10] text-white font-bold py-3 rounded-xl transition-all duration-200 text-sm border border-white/[0.08]">
                    Back to Home
                  </a>
                </Link>
              </>
            )}

          </div>

          <p className="mt-6 text-center text-xs text-slate-600">
            Need help?{" "}
            <a
              href="https://themed-edits.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 transition-colors"
            >
              Contact support
            </a>
          </p>
        </div>
      </div>
    </>
  );
}