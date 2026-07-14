"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { id: string; name: string; color: string };

export function SidebarNav({ projects }: { projects: Item[] }) {
  const path = usePathname();

  const topLinks: { href: string; label: string }[] = [
    { href: "/", label: "Overview" },
    { href: "/clients", label: "Clients" },
    { href: "/invoices", label: "Invoices" },
    { href: "/billing", label: "Billing" },
  ];

  return (
    <nav className="flex flex-col gap-0.5">
      {topLinks.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="nav-item"
          data-active={l.href === "/" ? path === "/" : path.startsWith(l.href)}
        >
          <span
            aria-hidden
            className="inline-block h-2 w-2 shrink-0 rounded-[2px]"
            style={{ background: "var(--color-ink-3)" }}
          />
          {l.label}
        </Link>
      ))}

      <div className="flex items-center justify-between px-2 pt-6 pb-2">
        <span className="label text-ink-3">Projects</span>
      </div>

      {projects.length === 0 ? (
        <p className="px-2 text-sm text-ink-3">No projects yet</p>
      ) : (
        projects.map((p) => {
          const href = `/projects/${p.id}`;
          return (
            <Link
              key={p.id}
              href={href}
              className="nav-item"
              data-active={path === href}
            >
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                style={{ background: p.color }}
              />
              <span className="truncate">{p.name}</span>
            </Link>
          );
        })
      )}
    </nav>
  );
}
