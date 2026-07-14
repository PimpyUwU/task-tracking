-- D5 · Single tax line (label + rate) at the client level, snapshotted onto invoices.
-- Applied on top of the existing remote schema. After applying, regenerate
-- src/lib/database.types.ts, then wire the tax math in src/lib/invoice.ts +
-- src/app/actions/invoices.ts and render subtotal/tax/total in the templates.
--
-- Money stays numeric (never float). tax_rate is a percentage (e.g. 20.00 = 20%).
-- tax_amount is round2(subtotal * tax_rate / 100), snapshotted so historical
-- invoices never move when a client's tax settings change later.

-- Tax settings live on the client (per the scope: "user (or client) level").
alter table public.clients
  add column if not exists tax_label text,
  add column if not exists tax_rate  numeric(6,3) not null default 0
    check (tax_rate >= 0 and tax_rate <= 100);

-- Snapshot fields on the invoice header (copy-on-write at generation).
alter table public.invoices
  add column if not exists tax_label  text,
  add column if not exists tax_rate   numeric(6,3) not null default 0
    check (tax_rate >= 0 and tax_rate <= 100),
  add column if not exists tax_amount numeric(14,2) not null default 0
    check (tax_amount >= 0);

-- Existing rows: total already equals subtotal (no tax), which stays correct
-- because tax_amount defaults to 0. New invoices set total = subtotal + tax_amount.
