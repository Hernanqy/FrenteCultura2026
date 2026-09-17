-- Ejecutar UNA SOLA VEZ en Supabase > SQL Editor para habilitar el mapa cultural.

alter table public.contacts
  add column if not exists address text not null default '',
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.contacts
  drop constraint if exists contacts_type_check;

alter table public.contacts
  add constraint contacts_type_check
  check (type in ('Artista', 'Espacio cultural', 'Organización cultural', 'Agrupación', 'Colectividad', 'Peña'));

alter table public.contacts
  drop constraint if exists contacts_latitude_check;
alter table public.contacts
  add constraint contacts_latitude_check
  check (latitude is null or latitude between -90 and 90);

alter table public.contacts
  drop constraint if exists contacts_longitude_check;
alter table public.contacts
  add constraint contacts_longitude_check
  check (longitude is null or longitude between -180 and 180);
