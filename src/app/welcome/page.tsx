import Link from "next/link";
import type { Metadata } from "next";
import { Wordmark } from "@/components/Sidebar";
import { Reveal, CountUp, TimerDock } from "@/components/landing";

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

const Shell = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`mx-auto max-w-[1200px] px-6 md:px-10 ${className}`}>{children}</div>
);

export default function WelcomePage() {
  return (
    <div className="min-h-screen overflow-x-clip">
      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50 border-b border-line"
        style={{ background: "rgba(238,241,241,0.86)", backdropFilter: "blur(10px)" }}
      >
        <Shell className="flex items-center gap-8 h-16">
          <Link href="/welcome"><Wordmark /></Link>
          <div className="hidden md:flex gap-7 text-[0.9rem] text-ink-2 ml-2">
            <a href="#loop" className="hover:text-ink transition-colors">The loop</a>
            <a href="#features" className="hover:text-ink transition-colors">Features</a>
            <a href="#pricing" className="hover:text-ink transition-colors">Pricing</a>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <Link href="/login" className="text-[0.9rem] font-semibold hover:text-accent transition-colors">Sign in</Link>
            <Link href="/login" className="btn btn-accent">Start free <Arrow /></Link>
          </div>
        </Shell>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <header className="relative">
        <Shell className="grid lg:grid-cols-[1.02fr_0.98fr] gap-12 lg:gap-16 items-center pt-16 pb-20 lg:pt-24 lg:pb-28">
          <div>
            <p className="label text-accent mb-6 hero-line" style={{ letterSpacing: "0.14em" }}>
              <span style={{ "--hl": "0ms" } as React.CSSProperties}>For solo freelancers</span>
            </p>
            <h1 className="serif" style={{ fontSize: "clamp(46px,7vw,84px)", lineHeight: 1.02, letterSpacing: "-0.012em" }}>
              <span className="hero-line"><span style={{ "--hl": "90ms" } as React.CSSProperties}>Every billable</span></span>
              <span className="hero-line"><span style={{ "--hl": "180ms" } as React.CSSProperties}>minute, <em className="italic text-accent">already</em></span></span>
              <span className="hero-line"><span style={{ "--hl": "270ms" } as React.CSSProperties}><em className="italic text-accent">on the invoice.</em></span></span>
            </h1>
            <div className="hero-line">
              <p className="text-ink-2 mt-7 mb-9" style={{ fontSize: "clamp(16px,1.4vw,19px)", maxWidth: "44ch", "--hl": "380ms" } as React.CSSProperties}>
                FluxWork separates billable from non-billable time and turns it straight into a
                correct, sendable invoice — the loop Toggl and Harvest leave open.
              </p>
            </div>
            <div className="hero-line">
              <div className="flex flex-wrap gap-3" style={{ "--hl": "460ms" } as React.CSSProperties}>
                <Link href="/login" className="btn btn-accent" style={{ fontSize: 15, padding: "13px 22px" }}>Start free <Arrow /></Link>
                <a href="#loop" className="btn" style={{ fontSize: 15, padding: "13px 22px" }}>See the loop</a>
              </div>
            </div>
            <div className="hero-line">
              <p className="mt-5 text-[13px] text-ink-2 flex items-center gap-2" style={{ "--hl": "540ms" } as React.CSSProperties}>
                <span className="inline-block h-[7px] w-[7px] rounded-full bg-gold" /> Free plan · no card needed · your data stays yours
              </p>
            </div>
          </div>

          {/* App preview — live, counting, ticking */}
          <Reveal delay={250} className="hero-card">
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
                  <CountUp value={4210} prefix="$" className="num" style={{ fontFamily: "inherit" }} />
                  <span className="text-ink-2" style={{ fontSize: 22 }}>.00</span>
                  <span className="block mt-2 h-0.5 w-[52px] rounded-full" style={{ background: "var(--brass)" }} />
                </p>
                <p className="num text-[12.5px] text-ink-2 mt-4 mb-3.5">52.1 billable hrs · 11.4 non-billable · $80.80/hr avg</p>
                <div className="meter" style={{ "--w-bill": "82%", "--w-non": "18%" } as React.CSSProperties}>
                  <i className="bill" /><i className="non" />
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
              <TimerDock />
            </div>
          </Reveal>
        </Shell>
      </header>

      {/* ── Ticker strip ─────────────────────────────────────────────── */}
      <div className="border-y border-line bg-paper-2 py-3.5" aria-hidden>
        <div className="marquee">
          <div className="marquee-track">
            {[0, 1].map((dup) => (
              <div key={dup} className="flex items-center gap-10 num text-[11.5px] tracking-[0.14em] uppercase text-ink-2">
                {[
                  "Built in the open",
                  "Rates locked at generation",
                  "One tax line",
                  "DOCX + PDF export",
                  "Paddle merchant of record",
                  "Your data stays yours",
                  "Launching on Product Hunt · Show HN · Indie Hackers",
                ].map((t) => (
                  <span key={t} className="flex items-center gap-10 whitespace-nowrap">
                    {t}<span className="h-[5px] w-[5px] rounded-full bg-line-strong inline-block" style={{ background: "var(--line-strong)" }} />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── The Loop: sticky story stack ────────────────────────────── */}
      <section id="loop" className="py-24 lg:py-32">
        <Shell>
          <Reveal className="max-w-[62ch] mb-14 lg:mb-20">
            <p className="label text-accent mb-3">The loop</p>
            <h2 className="serif" style={{ fontSize: "clamp(34px,4.4vw,54px)", lineHeight: 1.05 }}>
              Three unbroken steps, from a running timer to money in the bank.
            </h2>
            <p className="text-ink-2 mt-4" style={{ fontSize: 17 }}>
              Everything off this loop is deferred. FluxWork does one thing completely.
            </p>
          </Reveal>

          <div className="stack">
            {/* 01 — Track */}
            <div className="stack-card panel p-7 md:p-10 lg:min-h-[440px] grid lg:grid-cols-[1fr_0.9fr] gap-8 lg:gap-14 items-center" style={{ "--i": 0 } as React.CSSProperties}>
              <div>
                <p className="num text-[13px] font-semibold text-accent mb-4">01 / Track</p>
                <h3 className="serif mb-3" style={{ fontSize: "clamp(26px,2.6vw,36px)" }}>Track time as it happens</h3>
                <p className="text-ink-2 max-w-[46ch]" style={{ fontSize: 16 }}>
                  Start the timer or log it by hand. Every task is billable or it isn&apos;t —
                  the split is first-class, so non-billable hours never sneak onto a bill.
                </p>
              </div>
              <Reveal delay={120}>
                <div className="border border-line rounded-xl overflow-hidden bg-paper">
                  <div className="flex items-center gap-3 px-4 py-3.5 border-b border-line bg-paper-2">
                    <span className="live-dot" />
                    <b className="text-[14px]">Northwind — homepage build</b>
                    <span className="badge badge-bill ml-auto" style={{ fontSize: "0.6rem" }}>BILLABLE</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3.5 text-[13.5px] text-ink-2">
                    <span>Today</span>
                    <span className="num font-semibold text-ink">04:26:10</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3.5 border-t border-line text-[13.5px] text-ink-2">
                    <span>Admin &amp; ops</span>
                    <span className="badge badge-non" style={{ fontSize: "0.6rem" }}>NON-BILL</span>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* 02 — Invoice (the hero step, inverted) */}
            <div className="stack-card panel-dark p-7 md:p-10 lg:min-h-[440px] grid lg:grid-cols-[1fr_0.9fr] gap-8 lg:gap-14 items-center" style={{ "--i": 1 } as React.CSSProperties}>
              <div>
                <p className="num text-[13px] font-semibold text-d-brass mb-4">02 / Invoice</p>
                <h3 className="serif mb-3" style={{ fontSize: "clamp(26px,2.6vw,36px)" }}>One tap becomes the invoice</h3>
                <p className="text-on-dark/70 max-w-[46ch]" style={{ fontSize: 16 }}>
                  Every un-invoiced billable minute fills the built-in template — rates are
                  snapshotted at generation, one tax line applied, exported as DOCX and PDF.
                  Change a rate next month and this invoice never moves.
                </p>
              </div>
              <Reveal delay={120}>
                <div className="relative rounded-xl bg-paper-2 text-ink p-5 md:p-6" style={{ boxShadow: "0 18px 40px -24px rgba(0,0,0,0.5)" }}>
                  <span className="stamp absolute -top-3 right-4">Rates locked · Sep 30</span>
                  <p className="label mb-3">Invoice INV-0042</p>
                  {[
                    { n: "Northwind — Website", a: "$1,700.00" },
                    { n: "Client A — Retainer", a: "$1,493.00" },
                  ].map((r) => (
                    <p key={r.n} className="flex items-baseline text-[13.5px] py-1">
                      <span>{r.n}</span><span className="leader" /><span className="num font-semibold">{r.a}</span>
                    </p>
                  ))}
                  <p className="flex items-baseline text-[13.5px] py-1 text-ink-2">
                    <span>VAT (20%)</span><span className="leader" /><span className="num">$638.60</span>
                  </p>
                  <p className="flex items-baseline pt-2.5 mt-2 border-t border-line">
                    <span className="font-semibold text-[14.5px]">Total</span><span className="leader" />
                    <span className="num font-bold text-[18px]" style={{ color: "var(--gold)" }}>$3,831.60</span>
                  </p>
                </div>
              </Reveal>
            </div>

            {/* 03 — Paid */}
            <div className="stack-card panel p-7 md:p-10 lg:min-h-[440px] grid lg:grid-cols-[1fr_0.9fr] gap-8 lg:gap-14 items-center" style={{ "--i": 2 } as React.CSSProperties}>
              <div>
                <p className="num text-[13px] font-semibold text-accent mb-4">03 / Paid</p>
                <h3 className="serif mb-3" style={{ fontSize: "clamp(26px,2.6vw,36px)" }}>Send it. Get paid. Done.</h3>
                <p className="text-ink-2 max-w-[46ch]" style={{ fontSize: 16 }}>
                  Download the PDF, send it, mark it paid — the entries it covers are stamped so
                  they can never be billed twice. Your FluxWork subscription runs through Paddle
                  as merchant of record, so even that tax is handled.
                </p>
              </div>
              <Reveal delay={120}>
                <div className="border border-line rounded-xl bg-paper p-5 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="label mb-1">INV-0042 · Northwind</p>
                      <p className="num font-bold" style={{ fontSize: 30, color: "var(--gold)" }}>$3,831.60</p>
                    </div>
                    <span className="badge badge-bill" style={{ fontSize: "0.7rem", padding: "0.35rem 0.7rem" }}>
                      <span className="dot" /> PAID
                    </span>
                  </div>
                  <p className="text-[12.5px] text-ink-2 mt-4 pt-3 border-t border-line">
                    21 time entries stamped · can&apos;t be double-billed
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </Shell>
      </section>

      {/* ── Pull-quote band ─────────────────────────────────────────── */}
      <section className="panel-dark rounded-none py-20 lg:py-28">
        <Shell>
          <Reveal className="text-center">
            <p className="serif mx-auto" style={{ fontSize: "clamp(32px,5vw,60px)", lineHeight: 1.12, maxWidth: "22ch" }}>
              Time trackers stop at the timesheet. FluxWork stops <em className="italic" style={{ color: "var(--d-teal)" }}>when you&apos;re paid.</em>
            </p>
          </Reveal>
        </Shell>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section id="features" className="py-24 lg:py-32 border-b border-line bg-paper-2">
        <Shell>
          <Reveal className="max-w-[62ch] mb-14">
            <p className="label text-accent mb-3">Why it&apos;s different</p>
            <h2 className="serif" style={{ fontSize: "clamp(34px,4.4vw,54px)", lineHeight: 1.05 }}>
              The billable-to-invoice loop, closed with financial precision.
            </h2>
          </Reveal>
          <div className="grid md:grid-cols-6 gap-4">
            <Reveal className="md:col-span-3" delay={0}>
              <div className="rounded-2xl border border-line bg-paper p-6 h-full">
                <div className="flex gap-2 mb-4">
                  <span className="badge badge-bill"><span className="dot" /> BILLABLE</span>
                  <span className="badge badge-non"><span className="dot" /> NON-BILL</span>
                </div>
                <div className="meter mb-5" style={{ "--w-bill": "76%", "--w-non": "24%" } as React.CSSProperties}>
                  <i className="bill" /><i className="non" />
                </div>
                <h3 className="serif mb-1.5" style={{ fontSize: 20 }}>Billable / non-billable split</h3>
                <p className="text-ink-2 text-sm">Every task carries a billable flag that flows into earnings and invoices. Non-billable time is tracked but never billed by accident.</p>
              </div>
            </Reveal>
            <Reveal className="md:col-span-3" delay={80}>
              <div className="rounded-2xl border border-line bg-paper p-6 h-full">
                <p className="num font-semibold" style={{ fontSize: 34, color: "var(--brass-ink)" }}>
                  <CountUp value={80.8} decimals={2} prefix="$" />
                </p>
                <h3 className="serif mt-0.5 mb-1.5" style={{ fontSize: 20 }}>Correct-forever rates</h3>
                <p className="text-ink-2 text-sm">Rates snapshot onto each invoice line at generation. Change a rate later and no historical invoice is ever rewritten.</p>
              </div>
            </Reveal>
            <Reveal className="md:col-span-2" delay={0}>
              <div className="rounded-2xl border border-line bg-paper p-6 h-full">
                <div className="flex gap-1.5 mb-4">
                  {["DOCX", "PDF"].map((t) => (
                    <span key={t} className="num text-[10.5px] font-bold border border-line-strong rounded-md px-2 py-1">{t}</span>
                  ))}
                </div>
                <h3 className="serif mb-1.5" style={{ fontSize: 20 }}>One-tap invoice</h3>
                <p className="text-ink-2 text-sm">Zero-setup first invoice from a built-in template. Rendered natively — no external services.</p>
              </div>
            </Reveal>
            <Reveal className="md:col-span-2" delay={80}>
              <div className="rounded-2xl border border-line bg-paper p-6 h-full">
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="live-dot" />
                  <span className="num text-[13px] font-semibold">00:41:07</span>
                </div>
                <h3 className="serif mb-1.5" style={{ fontSize: 20 }}>Persistent timer</h3>
                <p className="text-ink-2 text-sm">The timer bar follows you across every screen and keeps accruing — reachable on your phone mid-task.</p>
              </div>
            </Reveal>
            <Reveal className="md:col-span-2" delay={160}>
              <div className="rounded-2xl border border-line bg-paper p-6 h-full">
                <p className="flex items-baseline text-[12.5px] mb-4 text-ink-2">
                  <span>VAT (20%)</span><span className="leader" /><span className="num">$638.60</span>
                </p>
                <h3 className="serif mb-1.5" style={{ fontSize: 20 }}>Single tax line</h3>
                <p className="text-ink-2 text-sm">One configurable VAT / Sales Tax rate on the billable subtotal. Zero-rate supported. Mobile-first throughout.</p>
              </div>
            </Reveal>
          </div>
        </Shell>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 lg:py-32">
        <Shell>
          <Reveal className="max-w-[60ch] mx-auto text-center mb-14">
            <p className="label text-accent mb-3">Pricing</p>
            <h2 className="serif" style={{ fontSize: "clamp(34px,4.4vw,54px)", lineHeight: 1.05 }}>Free to track. Pay when you invoice.</h2>
            <p className="text-ink-2 mt-4" style={{ fontSize: 17 }}>
              Start free forever. Upgrade when you&apos;re ready to bill — invoicing and exports live on Pro.
            </p>
          </Reveal>
          <div className="grid md:grid-cols-[1fr_1.12fr] gap-6 max-w-[780px] mx-auto items-stretch">
            <Reveal delay={0}>
              <div className="panel p-8 h-full flex flex-col">
                <h3 className="serif" style={{ fontSize: 23 }}>Free</h3>
                <p className="text-sm text-ink-2">For trying it out</p>
                <p className="num font-semibold mt-4 mb-0.5" style={{ fontSize: 46, lineHeight: 1 }}>$0</p>
                <p className="text-sm text-ink-2">forever</p>
                <ul className="flex flex-col gap-2.5 my-6">
                  {["Time tracking & billable split", "Up to 2 clients & projects", "Earnings overview"].map((f) => (
                    <li key={f} className="flex gap-2.5 text-[14.5px]"><Check color="var(--gold)" />{f}</li>
                  ))}
                </ul>
                <Link href="/login" className="btn w-full justify-center mt-auto">Start free</Link>
              </div>
            </Reveal>
            <Reveal delay={110}>
              <div className="panel-dark p-8 relative overflow-hidden h-full flex flex-col" style={{ boxShadow: "0 28px 56px -30px rgba(15,26,28,0.4)" }}>
                <span className="num absolute top-5 right-5 text-[11px] font-bold rounded-full px-2.5 py-1" style={{ background: "var(--d-brass)", color: "var(--ink)" }}>2 months free</span>
                <h3 className="serif" style={{ fontSize: 23 }}>Pro</h3>
                <p className="text-sm text-on-dark/60">For freelancers who bill</p>
                <p className="num font-semibold mt-4 mb-0.5" style={{ fontSize: 46, lineHeight: 1 }}>$90 <span className="text-on-dark/60" style={{ fontSize: 16 }}>/yr</span></p>
                <p className="text-sm text-on-dark/60">or $9/mo · billed via Paddle</p>
                <ul className="flex flex-col gap-2.5 my-6">
                  {["Unlimited clients & projects", "Invoice generation (DOCX + PDF)", "Rate snapshots & tax line", "Exports & unlimited history"].map((f) => (
                    <li key={f} className="flex gap-2.5 text-[14.5px]"><Check color="var(--d-teal)" />{f}</li>
                  ))}
                </ul>
                <Link href="/login" className="btn btn-teal w-full justify-center mt-auto">Go Pro — $90/yr</Link>
              </div>
            </Reveal>
          </div>
          <Reveal delay={160}>
            <p className="text-center text-ink-2 text-[13px] mt-6">
              Paddle is the merchant of record — VAT &amp; sales tax on your FluxWork subscription are handled for you.
            </p>
          </Reveal>
        </Shell>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────── */}
      <Shell>
        <Reveal>
          <section className="panel-dark text-center px-6 md:px-10 py-16 lg:py-20 mb-16">
            <h2 className="serif mx-auto mb-5" style={{ fontSize: "clamp(32px,4.6vw,56px)", lineHeight: 1.05, maxWidth: "20ch" }}>
              Stop leaving billable time on the table.
            </h2>
            <p className="text-on-dark/70 mx-auto mb-8" style={{ maxWidth: "52ch", fontSize: 17 }}>
              Track your next hour, watch it become an invoice, and get paid. Free to start — no card, no lock-in.
            </p>
            <Link href="/login" className="btn btn-teal" style={{ fontSize: 16, padding: "15px 26px" }}>Start free <Arrow /></Link>
          </section>
        </Reveal>
      </Shell>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-line py-10">
        <Shell className="flex flex-wrap justify-between items-center gap-6 text-[13.5px] text-ink-2">
          <Link href="/welcome"><Wordmark /></Link>
          <div className="flex flex-wrap gap-5">
            <a href="#loop" className="hover:text-ink">The loop</a>
            <a href="#features" className="hover:text-ink">Features</a>
            <a href="#pricing" className="hover:text-ink">Pricing</a>
            <Link href="/login" className="hover:text-ink">Sign in</Link>
          </div>
          <span>© 2026 FluxWork</span>
        </Shell>
      </footer>
    </div>
  );
}
