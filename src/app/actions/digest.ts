"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Toggle the weekly digest for the signed-in user. Stored on the auth user's
 * metadata (`digest_opt_out`) — the same flag the /api/digest cron reads to skip
 * a user. Default is on, so the flag is only ever set to opt OUT. Used as a
 * <form action>, so it takes FormData and returns void.
 */
export async function setDigestOptOut(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const optOut = String(formData.get("optOut") ?? "") === "true";
  await supabase.auth.updateUser({ data: { digest_opt_out: optOut } });

  revalidatePath("/more");
}
