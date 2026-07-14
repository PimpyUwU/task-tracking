"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function createTask(
  projectId: string,
  formData: FormData,
  parentId: string | null = null,
) {
  const { supabase, user } = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Task name is required." };

  const { error } = await supabase.from("tasks").insert({
    user_id: user.id,
    project_id: projectId,
    parent_id: parentId,
    name,
  });

  if (error) return { error: error.message };

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

export async function createSubtask(
  projectId: string,
  parentId: string,
  formData: FormData,
) {
  return createTask(projectId, formData, parentId);
}

/**
 * Toggle a task's billability. New time entries inherit this as their default
 * (see startTimer / addManualEntry); existing entries keep their own flag.
 */
export async function setTaskBillable(
  taskId: string,
  projectId: string,
  isBillable: boolean,
) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("tasks")
    .update({ is_billable: isBillable })
    .eq("id", taskId);
  if (error) return { error: error.message };
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

export async function deleteTask(taskId: string, projectId: string) {
  const { supabase } = await requireUser();
  // Child subtasks cascade automatically via the parent_id FK.
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) return { error: error.message };
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
