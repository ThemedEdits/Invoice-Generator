import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  FileText, Zap, Shield, BarChart3, ArrowRight, Check,
  ChevronRight, Star, Users, TrendingUp, Clock,
} from "lucide-react";

// ─── Animated counter ─────────────────────────────────────────────────────────
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        let start = 0;
        const step = Math.ceil(to / 60);
        const timer = setInterval(() => {
          start += step;
          if (start >= to) { setVal(to); clearInterval(timer); }
          else setVal(start);
        }, 16);
        obs.disconnect();
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to]);

  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

// ─── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({
  icon: Icon, title, desc, delay,
}: { icon: any; title: string; desc: string; delay: string }) {
  return (
    <div
      className="group relative bg-white/[0.03]/[0.03] border border-white/[0.08] rounded-2xl p-6 hover:bg-white/[0.03]/[0.07] hover:border-amber-400/30 transition-all duration-500 animate-fadeUp"
      style={{ animationDelay: delay, animationFillMode: "both" }}
    >
      <div className="w-11 h-11 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mb-4 group-hover:bg-amber-400/20 transition-colors duration-300">
        <Icon className="w-5 h-5 text-amber-400" />
      </div>
      <h3 className="text-white font-semibold text-base mb-2">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const features = [
    { icon: FileText,   title: "Smart Templates",     desc: "Design pixel-perfect invoice templates with our drag-and-drop canvas editor. Upload any background and map your fields visually." },
    { icon: Zap,        title: "Instant Generation",  desc: "Generate professional PDFs in seconds. All calculations — tax, totals, balances — are handled automatically." },
    { icon: Shield,     title: "Secure & Private",    desc: "Your data lives in your Firebase account. We never store sensitive invoice data on our servers." },
    { icon: BarChart3,  title: "Track Everything",    desc: "Dashboard gives you a real-time overview of revenue, outstanding balances, and overdue invoices." },
    { icon: Users,      title: "Customer Manager",    desc: "Store client details once, auto-fill forever. Never retype an address or email on an invoice again." },
    { icon: TrendingUp, title: "Multiple Statuses",   desc: "Mark invoices as Draft, Sent, Paid, or Overdue. Stay on top of your cash flow at a glance." },
  ];

  const testimonials = [
    { name: "Sarah K.",  role: "Freelance Designer",    text: "Invote cut my invoicing time from 20 minutes to under 2. The template editor is genuinely impressive.",      stars: 5 },
    { name: "James R.",  role: "Independent Consultant", text: "Finally a tool that doesn't look like it was built in 2009. Clean, fast, and my clients love the PDFs.",    stars: 5 },
    { name: "Amna M.",   role: "Photography Studio",     text: "The customer manager alone saves me hours every month. Everything auto-fills perfectly.",                   stars: 5 },
  ];

  return (
    <>
      {/* ── Global styles ──────────────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

        .font-cinzel  { font-family: 'Cinzel', serif; }
        .font-dm      { font-family: 'DM Sans', sans-serif; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-12px); }
        }
        @keyframes gridScroll {
          from { transform: translateY(0); }
          to   { transform: translateY(60px); }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(1);    opacity: 0.4; }
          100% { transform: scale(1.6);  opacity: 0; }
        }

        .animate-fadeUp   { animation: fadeUp  0.6s ease forwards; opacity: 0; }
        .animate-fadeIn   { animation: fadeIn  0.8s ease forwards; opacity: 0; }
        .animate-float    { animation: float   4s ease-in-out infinite; }
        .animate-shimmer  { background: linear-gradient(90deg, #f59e0b 0%, #fde68a 40%, #f59e0b 80%); background-size: 200% auto; animation: shimmer 3s linear infinite; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .animate-pulse-ring { animation: pulse-ring 2s ease-out infinite; }

        .grid-bg {
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 48px 48px;
        }
        .noise::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
          mix-blend-mode: overlay;
        }

        .glow-amber { box-shadow: 0 0 40px rgba(245,158,11,0.15); }
        .text-gradient { background: linear-gradient(135deg, #fff 0%, #fbbf24 50%, #fff 100%); background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
      `}</style>

      <div className="font-dm min-h-screen bg-[#0d0f14] text-white overflow-x-hidden noise relative">

        {/* ── Ambient glow blobs ────────────────────────────────────────────── */}
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-amber-500/8 blur-[160px]" />
          <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] rounded-full bg-indigo-600/8 blur-[140px]" />
        </div>

        {/* ── Grid overlay ─────────────────────────────────────────────────── */}
        <div className="pointer-events-none fixed inset-0 z-0 grid-bg" />

        {/* ── Navbar ───────────────────────────────────────────────────────── */}
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#0d0f14]/90 backdrop-blur-xl border-b border-white/[0.19]" : ""}`}>
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/invio-logo.svg" alt="Invote" className="h-8 w-auto" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <span className="font-cinzel font-semibold text-lg tracking-wide text-white">Invote</span>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
              <a href="#features"     className="hover:text-amber-400 transition-colors">Features</a>
              <a href="#testimonials" className="hover:text-amber-400 transition-colors">Reviews</a>
              <a href="#pricing"      className="hover:text-amber-400 transition-colors">Pricing</a>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <a className="text-sm text-slate-400 hover:text-white transition-colors px-4 py-2 rounded-xl hover:bg-white/[0.03]/5">
                  Sign In
                </a>
              </Link>
              <Link href="/register">
                <a className="text-sm font-semibold bg-amber-400 text-white px-4 py-2 rounded-xl hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/20">
                  Get Started
                </a>
              </Link>
            </div>
          </div>
        </nav>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="relative z-10 pt-36 pb-24 px-6">
          <div className="max-w-5xl mx-auto text-center">

            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/20 rounded-full px-4 py-1.5 text-xs text-amber-400 font-medium mb-8 animate-fadeIn"
              style={{ animationDelay: "0.1s", animationFillMode: "both" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Professional Invoice Management
            </div>

            {/* Headline */}
            <h1
              className="font-cinzel text-5xl sm:text-6xl md:text-7xl font-bold leading-tight mb-6 animate-fadeUp"
              style={{ animationDelay: "0.2s", animationFillMode: "both" }}
            >
              <span className="text-white">Invoice with</span>
              <br />
              <span className="text-gradient">Confidence.</span>
            </h1>

            <p
              className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10 animate-fadeUp"
              style={{ animationDelay: "0.35s", animationFillMode: "both" }}
            >
              Create beautiful, branded invoices in seconds. Design custom templates, auto-calculate totals, and deliver stunning PDFs — all from one elegant workspace.
            </p>

            {/* CTA buttons */}
            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fadeUp"
              style={{ animationDelay: "0.5s", animationFillMode: "both" }}
            >
              <Link href="/register">
                <a className="group flex items-center gap-2 bg-amber-400 text-white font-bold text-base px-8 py-4 rounded-2xl shadow-xl shadow-amber-400/25 hover:bg-amber-300 hover:-translate-y-0.5 transition-all duration-200">
                  Start for Free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </Link>
              <Link href="/login">
                <a className="flex items-center gap-2 text-slate-300 hover:text-white border border-white/10 hover:border-white/20 px-8 py-4 rounded-2xl transition-all duration-200 text-base">
                  Sign In
                  <ChevronRight className="w-4 h-4" />
                </a>
              </Link>
            </div>

            {/* Trust line */}
            <p
              className="mt-6 text-xs text-slate-400 animate-fadeIn"
              style={{ animationDelay: "0.7s", animationFillMode: "both" }}
            >
              No credit card required · Free forever plan · Secure with Firebase
            </p>
          </div>

          {/* Hero visual — mock invoice card */}
          <div
            className="relative max-w-3xl mx-auto mt-20 animate-fadeUp"
            style={{ animationDelay: "0.6s", animationFillMode: "both" }}
          >
            <div className="animate-float">
              <div className="relative bg-white/[0.03]/[0.04] border border-white/10 rounded-3xl p-6 backdrop-blur-sm glow-amber overflow-hidden">
                {/* Invoice mock header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="h-4 w-20 bg-amber-400/30 rounded-full mb-2" />
                    <div className="h-3 w-32 bg-white/[0.03]/10 rounded-full mb-1.5" />
                    <div className="h-3 w-24 bg-white/[0.03]/10 rounded-full" />
                  </div>
                  <div className="text-right">
                    <div className="h-3 w-16 bg-white/[0.03]/10 rounded-full mb-1.5 ml-auto" />
                    <div className="h-5 w-24 bg-emerald-400/20 border border-emerald-400/30 rounded-full ml-auto flex items-center justify-center">
                      <span className="text-[10px] text-emerald-400 font-semibold">PAID</span>
                    </div>
                  </div>
                </div>
                {/* Mock line items */}
                <div className="space-y-2 mb-4">
                  {[["Design Services", "3", "$150", "$450"], ["Brand Strategy", "1", "$800", "$800"], ["Revisions", "2", "$75", "$150"]].map(([d,q,u,t]) => (
                    <div key={d} className="flex items-center text-xs border-b border-white/5 pb-2">
                      <span className="flex-1 text-slate-400">{d}</span>
                      <span className="w-8 text-center text-slate-500">{q}</span>
                      <span className="w-16 text-right text-slate-500">{u}</span>
                      <span className="w-16 text-right text-white font-medium">{t}</span>
                    </div>
                  ))}
                </div>
                {/* Mock totals */}
                <div className="space-y-1 text-xs text-right">
                  <div className="flex justify-end gap-8 text-slate-500"><span>Subtotal</span><span>$1,400.00</span></div>
                  <div className="flex justify-end gap-8 text-slate-500"><span>Tax (10%)</span><span>$140.00</span></div>
                  <div className="flex justify-end gap-8 text-amber-400 font-bold text-sm border-t border-white/10 pt-2 mt-2"><span>Total</span><span>$1,540.00</span></div>
                </div>
                {/* Ambient glow inside card */}
                <div className="absolute -bottom-8 -right-8 w-40 h-40 rounded-full bg-amber-400/10 blur-3xl" />
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -top-4 -right-4 bg-emerald-400 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg shadow-emerald-400/30 rotate-6">
              PDF Generated ✓
            </div>
            <div className="absolute -bottom-4 -left-4 bg-[#1a1d24] border border-white/10 text-white text-xs px-3 py-1.5 rounded-full shadow-lg -rotate-3">
              ⚡ Generated in 0.3s
            </div>
          </div>
        </section>

        {/* ── Stats ────────────────────────────────────────────────────────── */}
        <section className="relative z-10 py-16 border-y border-white/[0.19]">
          <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: "Invoices Generated", value: 12400, suffix: "+" },
              { label: "Active Users",        value: 2300,  suffix: "+" },
              { label: "Templates Created",   value: 8700,  suffix: "+" },
              { label: "Revenue Tracked",     value: 4,     suffix: "M+" },
            ].map(s => (
              <div key={s.label}>
                <p className="font-cinzel text-3xl font-bold text-amber-400 mb-1">
                  <Counter to={s.value} suffix={s.suffix} />
                </p>
                <p className="text-xs text-slate-500 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────────────────── */}
        <section id="features" className="relative z-10 py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-cinzel text-4xl font-bold text-white mb-4">
                Everything you need
              </h2>
              <p className="text-slate-400 max-w-xl mx-auto">
                A complete invoicing suite built for freelancers and small businesses who value design.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((f, i) => (
                <FeatureCard key={f.title} {...f} delay={`${0.1 * i}s`} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Testimonials ─────────────────────────────────────────────────── */}
        <section id="testimonials" className="relative z-10 py-24 px-6 border-t border-white/[0.19]">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-cinzel text-4xl font-bold text-white mb-4">Loved by creators</h2>
              <p className="text-slate-400">Don't take our word for it.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((t, i) => (
                <div
                  key={t.name}
                  className="bg-white/[0.03]/[0.03] border border-white/[0.07] rounded-2xl p-6 animate-fadeUp"
                  style={{ animationDelay: `${0.15 * i}s`, animationFillMode: "both" }}
                >
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: t.stars }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed mb-5">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center font-cinzel font-bold text-amber-400 text-sm">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold">{t.name}</p>
                      <p className="text-slate-500 text-xs">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ──────────────────────────────────────────────────────── */}
        <section id="pricing" className="relative z-10 py-24 px-6 border-t border-white/[0.19]">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-cinzel text-4xl font-bold text-white mb-4">Simple pricing</h2>
              <p className="text-slate-400">Start free. Upgrade when you're ready.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Free */}
              <div className="bg-white/[0.03]/[0.03] border border-white/[0.08] rounded-2xl p-8">
                <h3 className="font-cinzel text-xl font-semibold text-white mb-1">Free</h3>
                <p className="text-slate-500 text-sm mb-6">Perfect to get started</p>
                <p className="text-4xl font-bold text-white mb-6">$0<span className="text-slate-500 text-lg font-normal">/mo</span></p>
                {["Up to 10 invoices/mo", "3 templates", "Customer manager", "PDF export"].map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm text-slate-400 mb-3">
                    <Check className="w-4 h-4 text-amber-400 flex-shrink-0" /> {f}
                  </div>
                ))}
                <Link href="/register">
                  <a className="mt-6 block text-center border border-white/10 hover:border-amber-400/40 text-white hover:text-amber-400 rounded-xl py-3 text-sm font-semibold transition-all">
                    Get Started Free
                  </a>
                </Link>
              </div>
              {/* Pro */}
              <div className="relative bg-amber-400/10 border border-amber-400/30 rounded-2xl p-8 overflow-hidden">
                <div className="absolute top-4 right-4 bg-amber-400 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                  Popular
                </div>
                <div className="absolute -bottom-8 -right-8 w-48 h-48 rounded-full bg-amber-400/10 blur-3xl" />
                <h3 className="font-cinzel text-xl font-semibold text-white mb-1">Pro</h3>
                <p className="text-slate-400 text-sm mb-6">For growing businesses</p>
                <p className="text-4xl font-bold text-amber-400 mb-6">$12<span className="text-slate-500 text-lg font-normal">/mo</span></p>
                {["Unlimited invoices", "Unlimited templates", "Priority support", "Advanced analytics", "Custom branding", "Bulk export"].map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm text-slate-300 mb-3">
                    <Check className="w-4 h-4 text-amber-400 flex-shrink-0" /> {f}
                  </div>
                ))}
                <Link href="/register">
                  <a className="relative z-10 mt-6 block text-center bg-amber-400 hover:bg-amber-300 text-white font-bold rounded-xl py-3 text-sm transition-all shadow-lg shadow-amber-400/20">
                    Start Pro Trial
                  </a>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section className="relative z-10 py-24 px-6 border-t border-white/[0.19]">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-cinzel text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Ready to invoice<br />
              <span className="text-gradient">like a pro?</span>
            </h2>
            <p className="text-slate-400 mb-10 text-lg">
              Join thousands of freelancers who've simplified their billing with Invote.
            </p>
            <Link href="/register">
              <a className="inline-flex items-center gap-2 bg-amber-400 text-white font-bold text-base px-10 py-4 rounded-2xl shadow-xl shadow-amber-400/25 hover:bg-amber-300 hover:-translate-y-0.5 transition-all duration-200">
                Create Free Account
                <ArrowRight className="w-4 h-4" />
              </a>
            </Link>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <footer className="relative z-10 border-t border-white/[0.19] py-10 px-6">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src="/invio-logo.svg" alt="Invote" className="h-6 w-auto" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <span className="font-cinzel font-semibold text-white">Invote</span>
            </div>
            <p className="text-slate-400 text-xs text-center">
              Designed & developed by{" "}
              <a href="https://themed-edits.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 transition-colors">
                Themed Edits
              </a>
              {" "}· © {new Date().getFullYear()}
            </p>
            <div className="flex items-center gap-6 text-xs text-slate-400">
              <Link href="/login"><a className="hover:text-slate-400 transition-colors">Sign In</a></Link>
              <Link href="/register"><a className="hover:text-slate-400 transition-colors">Register</a></Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}