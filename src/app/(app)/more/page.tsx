import Link from "next/link";
import { signOut } from "@/app/auth/actions";

/**
 * Mobile-only catch-all for the demoted destinations (plan §5). Clients and Plan
 * live here instead of the tab bar; sign-out reuses the same action the sidebar
 * footer does. Desktop reaches these straight from the sidebar's Manage cluster.
 */
const links = [
  { href: "/clients", label: "Clients", hint: "Who you bill, and their rates" },
  { href: "/plan", label: "Plan", hint: "Your subscription and limits" },
];

export default function MorePage() {
  return (
    <div className="max-w-5xl px-5 md:px-8 py-7 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">More</h1>
        <p className="text-sm text-ink-2 mt-1">Settings and account.</p>
      </div>

      <div className="panel overflow-hidden">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex items-center justify-between gap-4 px-5 py-4 rule-b last:border-b-0 hover:bg-surface-2 transition-colors"
          >
            <span className="flex flex-col min-w-0">
              <span className="font-medium">{l.label}</span>
              <span className="text-xs text-ink-3 truncate">{l.hint}</span>
            </span>
            <span aria-hidden className="text-ink-3">
              →
            </span>
          </Link>
        ))}
      </div>

      <form action={signOut}>
        <button type="submit" className="btn btn-ghost w-full justify-start">
          Sign out
        </button>
      </form>
    </div>
  );
}
