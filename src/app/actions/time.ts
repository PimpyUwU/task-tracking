"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { trackOnce } from "@/lib/analytics";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/** Look up a task's billability so new entries inherit it as their default. */
async function taskBillableDefault(
  supabase: Awaited<ReturnType<typeof createClient>>,
  taskId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("tasks")
    .select("is_billable")
    .eq("id", taskId)
    .single();
  return data?.is_billable ?? true;
}

/**
 * Start a timer for a task. Overlapping running timers are permitted by design
 * (mirrors Harvest's ability to track concurrent work), so we do not stop other
 * running entries here.
 */
export async function startTimer(taskId: string, projectId: string) {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("time_entries")
    .insert({
      user_id: user.id,
      task_id: taskId,
      started_at: new Date().toISOString(),
      ended_at: null,
      is_billable: await taskBillableDefault(supabase, taskId),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
  return { ok: true, id: data.id };
}

export async function stopTimer(entryId: string, projectId: string) {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("time_entries")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", entryId)
    .is("ended_at", null) // only stop if still running
    .select("is_billable")
    .maybeSingle();

  if (error) return { error: error.message };

  // Funnel: activation = the user's first completed billable entry.
  if (data?.is_billable) await trackOnce(supabase, user.id, "activation");

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
  return { ok: true };
}

export async function addManualEntry(projectId: string, formData: FormData) {
  const { supabase, user } = await requireUser();

  const taskId = String(formData.get("task_id") ?? "");
  const startedAtLocal = String(formData.get("started_at") ?? "");
  const endedAtLocal = String(formData.get("ended_at") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!taskId || !startedAtLocal || !endedAtLocal) {
    return { error: "Task, start and end are all required." };
  }

  const started = new Date(startedAtLocal);
  const ended = new Date(endedAtLocal);

  if (Number.isNaN(started.getTime()) || Number.isNaN(ended.getTime())) {
    return { error: "Invalid start or end time." };
  }
  if (ended < started) {
    return { error: "End time must be after start time." };
  }

  const isBillable = await taskBillableDefault(supabase, taskId);
  const { error } = await supabase.from("time_entries").insert({
    user_id: user.id,
    task_id: taskId,
    started_at: started.toISOString(),
    ended_at: ended.toISOString(),
    notes,
    is_billable: isBillable,
  });

  if (error) return { error: error.message };

  // Funnel: activation = the user's first completed billable entry.
  if (isBillable) await trackOnce(supabase, user.id, "activation");

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
  return { ok: true };
}

/** Override billability on a single entry (independent of the task default). */
export async function setEntryBillable(
  entryId: string,
  projectId: string,
  isBillable: boolean,
) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("time_entries")
    .update({ is_billable: isBillable })
    .eq("id", entryId);
  if (error) return { error: error.message };
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
  return { ok: true };
}

export async function deleteEntry(entryId: string, projectId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("time_entries")
    .delete()
    .eq("id", entryId);
  if (error) return { error: error.message };
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
  return { ok: true };
}
