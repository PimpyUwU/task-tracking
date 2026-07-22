"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
// Aliased: this file exports client-*entity* CRUD, which would otherwise
// collide with the Supabase `createClient` factory.
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { assertWithinLimit } from "@/lib/plan";

async function requireUser() {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/** Parse a money field ("120", "120.50", "") into a non-negative number or null. */
function parseRate(raw: FormDataEntryValue | null): number | null | { error: string } {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return { error: "Rate must be a positive number." };
  // Round to cents to match numeric(12,2).
  return Math.round(n * 100) / 100;
}

/** Parse a tax percentage ("0"–"100", "") into 0..100 or an error. Empty ⇒ 0. */
function parseTaxRate(raw: FormDataEntryValue | null): number | { error: string } {
  const s = String(raw ?? "").trim();
  if (!s) return 0;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    return { error: "Tax rate must be between 0 and 100." };
  }
  // Round to 3 decimals to match numeric(6,3).
  return Math.round(n * 1000) / 1000;
}

export async function createClient(formData: FormData) {
  const { supabase, user } = await requireUser();

  // Free-tier cap: block creating a 6th client until upgraded.
  const limitErr = await assertWithinLimit(supabase, "clients");
  if (limitErr) return limitErr;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Client name is required." };

  const rate = parseRate(formData.get("default_rate"));
  if (rate && typeof rate === "object") return rate; // { error }

  const taxRate = parseTaxRate(formData.get("tax_rate"));
  if (typeof taxRate === "object") return taxRate; // { error }

  const email = String(formData.get("email") ?? "").trim() || null;
  const currency = (String(formData.get("currency") ?? "").trim() || "USD").toUpperCase();
  const address = String(formData.get("address") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const taxLabel = String(formData.get("tax_label") ?? "").trim() || null;

  const { data, error } = await supabase
    .from("clients")
    .insert({
      user_id: user.id,
      name,
      email,
      default_rate: rate as number | null,
      currency,
      address,
      notes,
      tax_label: taxLabel,
      tax_rate: taxRate,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/clients");
  return { ok: true, id: data.id };
}

/**
 * Just-in-time client creation (plan §6 Flow 5, fixes F6): the three-field inline
 * mini-form. Same auth guard, free-tier ceiling and rate parsing as createClient,
 * but only name/email/rate — everything else defaults. When `projectId` is given
 * (created from a project's no-client warning or its Client & rate section) the
 * new client is linked to that project in the same round-trip so invoicing
 * unlocks without a second step.
 */
export async function createClientInline(
  formData: FormData,
  projectId?: string | null,
) {
  const { supabase, user } = await requireUser();

  const limitErr = await assertWithinLimit(supabase, "clients");
  if (limitErr) return limitErr;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Client name is required." };

  const rate = parseRate(formData.get("default_rate"));
  if (rate && typeof rate === "object") return rate; // { error }

  const email = String(formData.get("email") ?? "").trim() || null;

  const { data, error } = await supabase
    .from("clients")
    .insert({
      user_id: user.id,
      name,
      email,
      default_rate: rate as number | null,
    })
    .select("id, name")
    .single();

  if (error) return { error: error.message };

  if (projectId) {
    const { error: linkErr } = await supabase
      .from("projects")
      .update({ client_id: data.id })
      .eq("id", projectId);
    if (linkErr) return { error: linkErr.message };
    revalidatePath(`/projects/${projectId}`);
  }

  revalidatePath("/clients");
  revalidatePath("/");
  return { ok: true as const, id: data.id, name: data.name };
}

export async function updateClient(clientId: string, formData: FormData) {
  const { supabase } = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Client name is required." };

  const rate = parseRate(formData.get("default_rate"));
  if (rate && typeof rate === "object") return rate;

  const taxRate = parseTaxRate(formData.get("tax_rate"));
  if (typeof taxRate === "object") return taxRate;

  const { error } = await supabase
    .from("clients")
    .update({
      name,
      email: String(formData.get("email") ?? "").trim() || null,
      default_rate: rate as number | null,
      currency: (String(formData.get("currency") ?? "").trim() || "USD").toUpperCase(),
      address: String(formData.get("address") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      tax_label: String(formData.get("tax_label") ?? "").trim() || null,
      tax_rate: taxRate,
    })
    .eq("id", clientId);

  if (error) return { error: error.message };

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  return { ok: true };
}

export async function setClientArchived(clientId: string, archived: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("clients")
    .update({ is_archived: archived })
    .eq("id", clientId);
  if (error) return { error: error.message };
  revalidatePath("/clients");
  return { ok: true };
}

export async function deleteClient(clientId: string) {
  const { supabase } = await requireUser();
  // Invoices reference clients with ON DELETE RESTRICT, so Postgres blocks
  // deletion of a client that still has invoices. Surface that cleanly.
  const { error } = await supabase.from("clients").delete().eq("id", clientId);
  if (error) {
    if (error.code === "23503") {
      return { error: "This client has invoices and can't be deleted. Archive it instead." };
    }
    return { error: error.message };
  }
  revalidatePath("/clients");
  return { ok: true };
}
