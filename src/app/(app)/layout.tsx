import { Sidebar, MobileBar } from "@/components/Sidebar";
import {
  StartBar,
  type PickerData,
  type PickerTask,
  type RunningEntry,
} from "@/components/StartBar";
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

/** Preload the quick-picker: recents, all active tasks, projects. Scale is small. */
async function getPickerData(): Promise<PickerData> {
  const supabase = await createClient();

  const [{ data: recentEntries }, { data: tasks }, { data: projects }] =
    await Promise.all([
      supabase
        .from("time_entries")
        .select("task_id, started_at")
        .order("started_at", { ascending: false })
        .limit(80),
      supabase
        .from("tasks")
        .select("id, name, project_id, projects!inner(id, name, color, is_archived)")
        .eq("projects.is_archived", false)
        .order("created_at", { ascending: false }),
      supabase
        .from("projects")
        .select("id, name, color")
        .eq("is_archived", false)
        .order("created_at", { ascending: false }),
    ]);

  const allTasks: PickerTask[] = [];
  for (const t of tasks ?? []) {
    const project = (
      Array.isArray(t.projects) ? t.projects[0] : t.projects
    ) as { id: string; name: string; color: string } | undefined;
    if (!project) continue;
    allTasks.push({
      id: t.id,
      name: t.name,
      projectId: project.id,
      projectName: project.name,
      projectColor: project.color,
    });
  }
  const taskById = new Map(allTasks.map((t) => [t.id, t]));

  // Last ~7 distinct tasks by most recent entry; archived projects drop out
  // naturally because their tasks aren't in taskById.
  const recent: PickerTask[] = [];
  const seen = new Set<string>();
  for (const e of recentEntries ?? []) {
    if (!e.task_id || seen.has(e.task_id)) continue;
    seen.add(e.task_id);
    const task = taskById.get(e.task_id);
    if (!task) continue;
    recent.push(task);
    if (recent.length >= 7) break;
  }

  return {
    recent,
    tasks: allTasks,
    projects: projects ?? [],
    defaultProjectId: recent[0]?.projectId ?? projects?.[0]?.id ?? null,
  };
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [running, picker] = await Promise.all([
    getRunningEntry(),
    getPickerData(),
  ]);

  return (
    <div className="md:grid md:grid-cols-[236px_1fr] md:items-start">
      <Sidebar />
      {/* Bottom padding keeps the mobile tab bar from covering content. */}
      <div className="min-w-0 pb-[calc(5rem_+_env(safe-area-inset-bottom))] md:pb-0">
        <MobileBar />
        <StartBar running={running} picker={picker} />
        {children}
      </div>
    </div>
  );
}
