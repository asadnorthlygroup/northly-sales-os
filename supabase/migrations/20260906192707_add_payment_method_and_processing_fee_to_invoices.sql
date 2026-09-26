-- Record how the client pays and what processing fee was charged.
-- Without these the 3% credit card fee cannot be stored or audited.
alter table public.invoices
  add column if not exists payment_method text not null default 'e_transfer',
  add column if not exists processing_fee numeric not null default 0,
  add column if not exists discount_amount numeric not null default 0;

alter table public.invoices
  drop constraint if exists invoices_payment_method_check;

alter table public.invoices
  add constraint invoices_payment_method_check
  check (payment_method in ('credit_card', 'e_transfer', 'cheque', 'eft'));

comment on column public.invoices.processing_fee is
  '3% of the tax-inclusive total, zero-rated, charged only on credit_card payments.';
comment on column public.invoices.payment_method is
  'Drives whether the processing fee applies. See src/lib/invoice-pricing.ts.';
