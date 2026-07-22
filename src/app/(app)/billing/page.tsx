import { redirect } from "next/navigation";

/**
 * Billing → Plan (plan §8: "billing" now means client billing only). Kept as a
 * redirect so old bookmarks and links to /billing still resolve.
 */
export default function BillingRedirect() {
  redirect("/plan");
}
