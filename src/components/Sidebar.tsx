import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { SidebarNav } from "@/components/SidebarNav";
import { Wordmark } from "@/components/Wordmark";

export { Wordmark };

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
