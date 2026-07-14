import Link from "next/link";
import type { Metadata } from "next";
import { Wordmark } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "FluxWork — every billable minute, already on the invoice",
  description:
    "FluxWork separates billable from non-billable time and turns it straight into a correct, sendable invoice — the loop Toggl and Harvest leave open.",
};

const Arrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const Check = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" className="shrink-0 mt-0.5" aria-hidden>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export default function WelcomePage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-line" style={{ background: "rgba(238,241,241,0.86)", backdropFilter: "blur(10px)" }}>
        <div className="mx-auto max-w-[1120px] px-6 flex items-center gap-8 h-[70px]">
          <Link href="/welcome"><Wordmark /></Link>
          <div className="hidden md:flex gap-7 text-[0.9rem] text-ink-2 ml-2">
            <a href="#loop" className="hover:text-ink transition-colors">How it works</a>
            <a href="#features" className="hover:text-ink transition-colors">Features</a>
            <a href="#pricing" className="hover:text-ink transition-colors">Pricing</a>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <Link href="/login" className="text-[0.9rem] font-semibold hover:text-accent transition-colors">Sign in</Link>
            <Link href="/login" className="btn btn-accent">Start free <Arrow /></Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="mx-auto max-w-[1120px] px-6 grid md:grid-cols-[1.05fr_1fr] gap-14 items-center py-16 md:py-20">
        <div>
          <p className="label text-accent mb-5" style={{ letterSpacing: "0.14em" }}>For solo freelancers</p>
          <h1 className="serif" style={{ fontSize: "clamp(44px,6vw,72px)", lineHeight: 1.04, letterSpacing: "-0.01em" }}>
            Every billable minute, <span className="italic text-accent">already on the invoice.</span>
          </h1>
          <p className="text-ink-2 mt-7 mb-9" style={{ fontSize: 19, maxWidth: "34ch" }}>
            FluxWork separates billable from non-billable time and turns it straight into a
            correct, sendable invoice — the loop Toggl and Harvest leave open.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/login" className="btn btn-accent" style={{ fontSize: 15, padding: "13px 22px" }}>Start free <Arrow /></Link>
            <a href="#loop" className="btn" style={{ fontSize: 15, padding: "13px 22px" }}>See how it works</a>
          </div>
          <p className="mt-5 text-[13px] text-ink-2 flex items-center gap-2">
            <span className="inline-block h-[7px] w-[7px] rounded-full bg-gold" /> Free plan · no card needed · your data stays yours
          </p>
        </div>

        {/* App preview card */}
        <div className="panel overflow-hidden" style={{ boxShadow: "0 28px 56px -30px rgba(15,26,28,0.32)" }} aria-label="FluxWork app preview">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-line" style={{ background: "rgba(238,241,241,0.5)" }}>
            <Wordmark compact />
            <div className="ml-auto flex gap-3 text-xs text-ink-2">
              <span className="text-ink font-semibold">Overview</span><span>Projects</span><span>Invoices</span>
            </div>
          </div>
          <div className="p-6">
            <p className="label mb-1.5">Projected earnings · September</p>
            <p className="serif text-ink inline-block" style={{ fontSize: 46, lineHeight: 1 }}>
              $4,210<span className="text-ink-2" style={{ fontSize: 22 }}>.00</span>
              <span className="block mt-2 h-0.5 w-[52px] rounded-full" style={{ background: "var(--brass)" }} />
            </p>
            <p className="num text-[12.5px] text-ink-2 mt-4 mb-3.5">52.1 billable hrs · 11.4 non-billable · $80.80/hr avg</p>
            <div className="split" style={{ height: 12 }}>
              <i className="bill" style={{ width: "82%" }} />
              <i className="non" style={{ width: "18%" }} />
            </div>
            <div className="mt-4 border border-line rounded-xl overflow-hidden text-[13px]">
              {[
                { n: "Northwind — Website", b: true, h: "21:15", a: "$1,700" },
                { n: "Client A — Retainer", b: true, h: "18:40", a: "$1,493" },
                { n: "Admin & ops", b: false, h: "11:24", a: "$0" },
              ].map((r) => (
                <div key={r.n} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center px-3.5 py-2.5 border-b border-line last:border-b-0">
                  <span className="flex items-center gap-2 min-w-0">
                    <b className="truncate">{r.n}</b>
                    <span className={`badge ${r.b ? "badge-bill" : "badge-non"}`} style={{ fontSize: "0.6rem" }}>
                      {r.b ? "BILLABLE" : "NON-BILL"}
                    </span>
                  </span>
                  <span className="num text-ink-2 text-xs">{r.h}</span>
                  <span className={`num font-semibold ${r.b ? "" : "text-ink-3"}`}>{r.a}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 panel-dark rounded-none">
            <span className="live-dot" />
            <span className="num font-semibold text-[15px] text-on-dark">01:12:40</span>
            <span className="text-xs text-on-dark/60">Northwind</span>
            <span className="num font-semibold text-d-brass text-[13px] ml-auto">+$96.89</span>
            <span className="btn btn-teal btn-sm">Stop</span>
          </div>
        </div>
      </header>

      {/* Trust */}
      <div className="border-y border-line bg-paper-2">
        <div className="mx-auto max-w-[1120px] px-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3.5 py-5 text-[13.5px] text-ink-2">
          <span><b className="text-ink">Built in the open.</b> Launching on</span>
          {["Product Hunt", "Show HN", "Indie Hackers", "r/freelance"].map((c) => (
            <span key={c} className="num text-xs border border-line rounded-full px-3 py-1.5">{c}</span>
          ))}
        </div>
      </div>

      {/* How it works */}
      <section id="loop" className="py-24">
        <div className="mx-auto max-w-[1120px] px-6">
          <div className="max-w-[60ch] mb-14">
            <p className="label text-accent mb-3">The loop</p>
            <h2 className="serif" style={{ fontSize: "clamp(32px,4vw,46px)", lineHeight: 1.06 }}>
              Three unbroken steps, from a running timer to money in the bank.
            </h2>
            <p className="text-ink-2 mt-4" style={{ fontSize: 17 }}>
              Everything off this loop is deferred. FluxWork does one thing completely.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { n: "01", t: "Track time", hot: false, p: "Start a timer or add it manually. Flag each task billable or non-billable — the split is first-class, not an afterthought." },
              { n: "02", t: "Generate the invoice", hot: true, p: "Billable, un-invoiced time fills the built-in template. Rates are snapshotted, one tax line applied, exported DOCX → PDF." },
              { n: "03", t: "Get paid", hot: false, p: "Send the PDF, mark it invoiced. Subscriptions run through Paddle as merchant of record — tax handled, payouts sorted." },
            ].map((s) => (
              <div key={s.n} className={s.hot ? "panel-dark p-7" : "panel p-7"}>
                <span
                  className="num inline-flex items-center justify-center rounded-[11px] text-[13px] font-semibold mb-4"
                  style={{
                    width: 36, height: 36,
                    background: s.hot ? "rgba(224,179,106,0.16)" : "var(--accent-dim)",
                    color: s.hot ? "var(--d-brass)" : "var(--accent)",
                  }}
                >{s.n}</span>
                <h3 className="serif mb-2" style={{ fontSize: 24 }}>{s.t}</h3>
                <p className={s.hot ? "text-on-dark/70 text-[14.5px]" : "text-ink-2 text-[14.5px]"}>{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 border-y border-line bg-paper-2">
        <div className="mx-auto max-w-[1120px] px-6">
          <div className="max-w-[60ch] mb-14">
            <p className="label text-accent mb-3">Why it&apos;s different</p>
            <h2 className="serif" style={{ fontSize: "clamp(32px,4vw,46px)", lineHeight: 1.06 }}>
              The billable-to-invoice loop, closed with financial precision.
            </h2>
          </div>
          <div className="grid md:grid-cols-6 gap-4">
            <Feature cls="md:col-span-3" title="Billable / non-billable split">
              Every task carries a billable flag that flows into earnings and invoices. Non-billable time is tracked but never billed by accident.
            </Feature>
            <div className="md:col-span-3 rounded-2xl border border-line bg-paper p-6">
              <p className="num font-semibold" style={{ fontSize: 34, color: "var(--brass-ink)" }}>$0.00</p>
              <h3 className="serif mt-0.5 mb-1.5" style={{ fontSize: 20 }}>Correct-forever rates</h3>
              <p className="text-ink-2 text-sm">Rates snapshot onto each invoice line at generation. Change a rate later and no historical invoice is ever rewritten.</p>
            </div>
            <Feature cls="md:col-span-2" title="One-tap invoice">Zero-setup first invoice from a built-in template. DOCX → PDF, downloadable.</Feature>
            <Feature cls="md:col-span-2" title="Persistent timer">The timer bar follows you across every screen and keeps accruing — reachable on your phone mid-task.</Feature>
            <Feature cls="md:col-span-2" title="Single tax line">One configurable VAT / Sales Tax rate on the billable subtotal. Zero-rate supported. Mobile-first throughout.</Feature>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="mx-auto max-w-[1120px] px-6">
          <div className="max-w-[60ch] mx-auto text-center mb-14">
            <p className="label text-accent mb-3">Pricing</p>
            <h2 className="serif" style={{ fontSize: "clamp(32px,4vw,46px)", lineHeight: 1.06 }}>Free to track. Pay when you invoice.</h2>
            <p className="text-ink-2 mt-4" style={{ fontSize: 17 }}>
              Start free forever. Upgrade when you&apos;re ready to bill — invoicing and exports live on Pro.
            </p>
          </div>
          <div className="grid md:grid-cols-[1fr_1.12fr] gap-6 max-w-[760px] mx-auto">
            <div className="panel p-8">
              <h3 className="serif" style={{ fontSize: 23 }}>Free</h3>
              <p className="text-sm text-ink-2">For trying it out</p>
              <p className="num font-semibold mt-4 mb-0.5" style={{ fontSize: 46, lineHeight: 1 }}>$0</p>
              <p className="text-sm text-ink-2">forever</p>
              <ul className="flex flex-col gap-2.5 my-6">
                {["Time tracking & billable split", "Up to 2 clients & projects", "Earnings overview"].map((f) => (
                  <li key={f} className="flex gap-2.5 text-[14.5px]"><Check color="var(--gold)" />{f}</li>
                ))}
              </ul>
              <Link href="/login" className="btn w-full justify-center">Start free</Link>
            </div>
            <div className="panel-dark p-8 relative overflow-hidden" style={{ boxShadow: "0 28px 56px -30px rgba(15,26,28,0.4)" }}>
              <span className="num absolute top-5 right-5 text-[11px] font-bold rounded-full px-2.5 py-1" style={{ background: "var(--d-brass)", color: "var(--ink)" }}>2 months free</span>
              <h3 className="serif" style={{ fontSize: 23 }}>Pro</h3>
              <p className="text-sm text-on-dark/60">For freelancers who bill</p>
              <p className="num font-semibold mt-4 mb-0.5" style={{ fontSize: 46, lineHeight: 1 }}>$90 <span className="text-on-dark/60" style={{ fontSize: 16 }}>/yr</span></p>
              <p className="text-sm text-on-dark/60">or $9/mo · billed via Paddle</p>
              <ul className="flex flex-col gap-2.5 my-6">
                {["Unlimited clients & projects", "Invoice generation (DOCX → PDF)", "Rate snapshots & tax line", "Exports & unlimited history"].map((f) => (
                  <li key={f} className="flex gap-2.5 text-[14.5px]"><Check color="var(--d-teal)" />{f}</li>
                ))}
              </ul>
              <Link href="/login" className="btn btn-teal w-full justify-center">Go Pro — $90/yr</Link>
            </div>
          </div>
          <p className="text-center text-ink-2 text-[13px] mt-6">
            Paddle is the merchant of record — VAT &amp; sales tax on your FluxWork subscription are handled for you.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <div className="mx-auto max-w-[1120px] px-6">
        <section className="panel-dark text-center px-10 py-16 mb-16">
          <h2 className="serif mx-auto mb-5" style={{ fontSize: "clamp(30px,4vw,48px)", lineHeight: 1.05, maxWidth: "20ch" }}>
            Stop leaving billable time on the table.
          </h2>
          <p className="text-on-dark/70 mx-auto mb-8" style={{ maxWidth: "52ch", fontSize: 17 }}>
            Track your next hour, watch it become an invoice, and get paid. Free to start — no card, no lock-in.
          </p>
          <Link href="/login" className="btn btn-teal" style={{ fontSize: 16, padding: "15px 26px" }}>Start free <Arrow /></Link>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-line py-10">
        <div className="mx-auto max-w-[1120px] px-6 flex flex-wrap justify-between items-center gap-6 text-[13.5px] text-ink-2">
          <Link href="/welcome"><Wordmark /></Link>
          <div className="flex flex-wrap gap-5">
            <a href="#loop" className="hover:text-ink">How it works</a>
            <a href="#features" className="hover:text-ink">Features</a>
            <a href="#pricing" className="hover:text-ink">Pricing</a>
            <Link href="/login" className="hover:text-ink">Sign in</Link>
          </div>
          <span>© 2026 FluxWork</span>
        </div>
      </footer>
    </div>
  );
}

function Feature({ cls, title, children }: { cls: string; title: string; children: React.ReactNode }) {
  return (
    <div className={`${cls} rounded-2xl border border-line bg-paper p-6`}>
      <div className="rounded-[11px] grid place-items-center mb-3.5" style={{ width: 40, height: 40, background: "var(--accent-dim)" }}>
        <span className="h-2 w-2 rounded-full bg-accent" />
      </div>
      <h3 className="serif mb-1.5" style={{ fontSize: 20 }}>{title}</h3>
      <p className="text-ink-2 text-sm">{children}</p>
    </div>
  );
}
