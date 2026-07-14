import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { SidebarNav } from "@/components/SidebarNav";

/** FluxWork wordmark — teal mark with a serif "F" and a brass underline. */
export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5 font-semibold tracking-tight">
      <span
        className="relative flex-none rounded-[9px] bg-accent"
        style={{ width: 32, height: 32 }}
        aria-hidden
      >
        <span className="serif absolute inset-0 flex items-center justify-center text-paper" style={{ fontSize: 18, top: -1 }}>
          F
        </span>
        <span
          className="absolute rounded-[2px] bg-d-brass"
          style={{ left: 6, right: 6, bottom: 6, height: 2 }}
        />
      </span>
      {!compact && <span className="text-[1.05rem]">FluxWork</span>}
    </span>
  );
}

export async function Sidebar() {
  const supabase = await createClient();
  const [{ data: user }, { data: projects }] = await Promise.all([
    supabase.auth.getUser().then((r) => ({ data: r.data.user })),
    supabase
      .from("projects")
      .select("id, name, color")
      .eq("is_archived", false)
      .order("created_at", { ascending: false }),
  ]);

  const nav = <SidebarNav projects={projects ?? []} />;

  return (
    <aside className="hidden md:flex md:flex-col md:h-screen md:sticky md:top-0 border-r border-line bg-paper-2">
      <div className="px-4 h-16 flex items-center border-b border-line">
        <Link href="/" aria-label="FluxWork — Overview">
          <Wordmark />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">{nav}</div>

      <div className="border-t border-line p-3">
        <p className="text-xs text-ink-3 truncate px-1 mb-2">{user?.email}</p>
        <form action={signOut}>
          <button type="submit" className="btn btn-ghost w-full justify-start">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

/** Compact top bar shown instead of the sidebar on small screens. */
export async function MobileBar() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, color")
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  return (
    <header className="md:hidden sticky top-0 z-20 border-b border-line bg-paper-2/95 backdrop-blur-sm">
      <div className="px-4 h-14 flex items-center justify-between">
        <Link href="/" aria-label="FluxWork — Overview">
          <Wordmark />
        </Link>
        <form action={signOut}>
          <button type="submit" className="btn btn-ghost btn-sm">
            Sign out
          </button>
        </form>
      </div>
      <div className="px-3 pb-2 overflow-x-auto">
        <SidebarNav projects={projects ?? []} />
      </div>
    </header>
  );
}
