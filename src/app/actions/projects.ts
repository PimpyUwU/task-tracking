"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assertWithinLimit } from "@/lib/plan";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/** Parse a money field into a non-negative number or null (null = inherit client rate). */
function parseRate(raw: FormDataEntryValue | null): number | null | { error: string } {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return { error: "Rate must be a positive number." };
  return Math.round(n * 100) / 100;
}

export async function createProject(formData: FormData) {
  const { supabase, user } = await requireUser();

  // Free-tier cap: block creating a 6th project until upgraded.
  const limitErr = await assertWithinLimit(supabase, "projects");
  if (limitErr) return limitErr;

  const name = String(formData.get("name") ?? "").trim();
  // Legacy free-text client is still accepted; client_id is the linked record.
  const client = String(formData.get("client") ?? "").trim() || null;
  const clientId = String(formData.get("client_id") ?? "").trim() || null;
  const code = String(formData.get("code") ?? "").trim() || null;
  const color = String(formData.get("color") ?? "").trim() || "#111111";

  if (!name) return { error: "Project name is required." };

  const rate = parseRate(formData.get("rate"));
  if (rate && typeof rate === "object") return rate;

  const { error } = await supabase.from("projects").insert({
    user_id: user.id,
    name,
    client,
    client_id: clientId,
    rate: rate as number | null,
    code,
    color,
  });

  if (error) return { error: error.message };

  revalidatePath("/");
  return { ok: true };
}

/**
 * Set a project's billing link + rate override. `rate` null means the project
 * inherits the client's default_rate; `clientId` null detaches the client.
 */
export async function updateProjectBilling(
  projectId: string,
  clientId: string | null,
  formData: FormData,
) {
  const { supabase } = await requireUser();

  const rate = parseRate(formData.get("rate"));
  if (rate && typeof rate === "object") return rate;

  const { error } = await supabase
    .from("projects")
    .update({ client_id: clientId, rate: rate as number | null })
    .eq("id", projectId);

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

export async function setProjectArchived(projectId: string, archived: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("projects")
    .update({ is_archived: archived })
    .eq("id", projectId);
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

export async function deleteProject(projectId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) return { error: error.message };
  revalidatePath("/");
  redirect("/");
}
