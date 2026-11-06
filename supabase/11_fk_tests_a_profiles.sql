-- LabFlow 11 (ya aplicada). La pantalla de Procesamiento hace embed profiles!tests_tech_id_fkey / tests_validator_id_fkey.
-- Esas FK apuntaban a auth.users y PostgREST devolvia 400. Se redefinen hacia profiles (misma id que auth.users).
alter table public.tests drop constraint if exists tests_tech_id_fkey;
alter table public.tests add constraint tests_tech_id_fkey foreign key (tech_id) references public.profiles(id) on delete set null;
alter table public.tests drop constraint if exists tests_validator_id_fkey;
alter table public.tests add constraint tests_validator_id_fkey foreign key (validator_id) references public.profiles(id) on delete set null;
alter table public.samples drop constraint if exists samples_collected_by_fkey;
alter table public.samples add constraint samples_collected_by_fkey foreign key (collected_by) references public.profiles(id) on delete set null;
notify pgrst, 'reload schema';
