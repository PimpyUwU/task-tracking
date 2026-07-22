import { listUnbilledClients, type Supabase } from "@/lib/invoice";

/**
 * Per-client unbilled money for Today's actionable Unbilled card and the
 * Clients screen. A thin adapter over listUnbilledClients — the invoice
 * picker's helper, which reuses buildInvoiceDraft's exact entry selection and
 * per-task rounding — so every surface shows the same number to the cent.
 */

export type ClientUnbilled = {
  clientId: string;
  clientName: string;
  currency: string;
  amount: number;
};

export type UnbilledSummary = {
  /** Clients with unbilled billable time, largest amount first. */
  perClient: ClientUnbilled[];
  total: number;
  /** Display currency for the total (largest client's, USD fallback). */
  currency: string;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function getUnbilledByClient(
  supabase: Supabase,
): Promise<UnbilledSummary> {
  const clients = await listUnbilledClients(supabase);

  const perClient = clients.map((c) => ({
    clientId: c.id,
    clientName: c.name,
    currency: c.currency,
    amount: c.amount,
  }));

  return {
    perClient,
    total: round2(perClient.reduce((sum, r) => sum + r.amount, 0)),
    currency: perClient[0]?.currency ?? "USD",
  };
}
