begin;
insert into public.admin_emails(email) values ('euriemeeb@gmail.com') on conflict(email) do nothing;
commit;
