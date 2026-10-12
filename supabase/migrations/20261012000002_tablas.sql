-- Tablas de la aplicación (SPEC §5.2)

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Pendientes de la casa
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  text text not null check (char_length(text) between 1 and 120),
  assignee_id uuid references public.members(id) on delete set null,
  is_shared boolean not null default false,
  due_date date,
  priority text not null default 'media' check (priority in ('alta','media','baja')),
  category text not null default 'Casa' check (category in ('Casa','Pagos','Coche','Niños','Otro')),
  repeat text check (repeat in ('semanal','quincenal','mensual','bimestral','trimestral','semestral','anual')),
  rotate boolean not null default false,        -- alternar responsable cada vez que se completa
  notes text,
  done boolean not null default false,          -- solo para tareas sin repetición
  done_on date,
  last_done_on date,                            -- solo para rutinas
  last_done_by uuid references public.members(id) on delete set null,
  created_by uuid references public.members(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not (assignee_id is not null and is_shared))
);

-- Eventos del calendario
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  date date not null,
  time time,                                    -- null = todo el día
  repeat text check (repeat in ('semanal','quincenal','mensual','bimestral','trimestral','semestral','anual')),
  owner_id uuid references public.members(id) on delete set null,
  is_shared boolean not null default true,
  place text,
  notes text,
  created_by uuid references public.members(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not (owner_id is not null and is_shared))
);

-- Fechas importantes
create table public.important_dates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'cumple' check (kind in ('cumple','aniversario','vence','otro')),
  date date not null,
  yearly boolean not null default true,
  remind_days int not null default 7 check (remind_days in (1,3,7,14,30)),
  notes text,
  created_by uuid references public.members(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Niños
create table public.kid_items (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  kind text not null default 'cita' check (kind in ('cita','vacuna','actividad','escuela','fiesta','otro')),
  kid text,
  date date,
  time time,
  notes text,
  done boolean not null default false,
  created_by uuid references public.members(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Comidas de la semana (una fila por día y comida)
create table public.meals (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  meal text not null check (meal in ('desayuno','comida','cena')),
  text text,
  ingredients text,
  created_by uuid references public.members(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (date, meal)
);

-- Planes y citas
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  kind text not null default 'restaurante' check (kind in ('restaurante','finde','pareja','viaje','otro')),
  status text not null default 'idea' check (status in ('idea','planeado','hecho')),
  date date,
  place text,
  link text,
  notes text,
  created_by uuid references public.members(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Notas y contactos
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  created_by uuid references public.members(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  phone text,
  notes text,
  created_by uuid references public.members(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Listas
create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  category text not null default 'otros' check (category in
    ('frutas','carnes','lacteos','pan','despensa','bebidas','congelados','limpieza','cuidado','otros')),
  done boolean not null default false,
  created_by uuid references public.members(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  price numeric(12,2),
  store text,
  priority text not null default 'media' check (priority in ('alta','media','baja')),
  done boolean not null default false,
  created_by uuid references public.members(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.home_improvements (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  area text not null default 'Toda la casa' check (area in
    ('Cocina','Baño','Recámaras','Sala y comedor','Terraza o jardín','Cochera','Toda la casa')),
  price numeric(12,2),
  status text not null default 'idea' check (status in ('idea','planeado','proceso','listo')),
  created_by uuid references public.members(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger updated_at en todas las tablas de la app
do $$
declare t text;
begin
  foreach t in array array['tasks','events','important_dates','kid_items','meals','plans','notes',
                           'contacts','shopping_items','purchases','home_improvements'] loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end $$;
