alter table public.leads
add column if not exists enquiry_reference text;

create unique index if not exists idx_leads_enquiry_reference_unique
on public.leads(enquiry_reference)
where enquiry_reference is not null;

create index if not exists idx_leads_enquiry_reference
on public.leads(enquiry_reference);
