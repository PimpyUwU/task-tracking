import { Sidebar, MobileBar } from "@/components/Sidebar";
import { RunningTimerBar, type RunningEntry } from "@/components/RunningTimerBar";
import { createClient } from "@/lib/supabase/server";

async function getRunningEntry(): Promise<RunningEntry | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("time_entries")
    .select(
      "id, started_at, is_billable, tasks!inner(name, projects!inner(id, name, rate, clients(name, default_rate, currency)))",
    )
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  // Embedded to-one relations arrive as objects (or arrays under some configs).
  const task = (Array.isArray(data.tasks) ? data.tasks[0] : data.tasks) as
    | { name: string; projects: unknown }
    | undefined;
  const project = (
    Array.isArray(task?.projects) ? task?.projects[0] : task?.projects
  ) as
    | {
        id: string;
        name: string;
        rate: number | null;
        clients: unknown;
      }
    | undefined;
  const client = (
    Array.isArray(project?.clients) ? project?.clients[0] : project?.clients
  ) as { name: string; default_rate: number | null; currency: string } | undefined;

  if (!project) return null;

  return {
    entryId: data.id,
    projectId: project.id,
    taskName: task?.name ?? "Untitled task",
    projectName: project.name,
    clientName: client?.name ?? null,
    startedAt: data.started_at,
    isBillable: data.is_billable,
    rate: project.rate ?? client?.default_rate ?? null,
    currency: client?.currency ?? "USD",
  };
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const running = await getRunningEntry();

  return (
    <div className="md:grid md:grid-cols-[236px_1fr] md:items-start">
      <Sidebar />
      <div className="min-w-0">
        <MobileBar />
        <RunningTimerBar running={running} />
        {children}
      </div>
    </div>
  );
}
