-- Rutinas
create table rutinas (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete cascade,
  nombre            text not null,
  fecha_inicio      date not null,
  semanas_duracion  integer not null default 6,
  activa            boolean not null default false,
  created_at        timestamptz default now()
);

-- Sesiones (pertenecen a una rutina)
create table sesiones (
  id                    uuid primary key default gen_random_uuid(),
  rutina_id             uuid references rutinas(id) on delete cascade,
  nombre                text not null,
  tipo                  text not null check (tipo in ('pull', 'push')),
  intensidad            text not null check (intensidad in ('pesada', 'liviana')),
  buffer_minimo_horas   integer not null,
  es_post_partido       boolean not null default false,
  version_liviana_id    uuid references sesiones(id),
  orden                 integer not null
);

-- Ejercicios (pertenecen a una sesión)
create table ejercicios (
  id              uuid primary key default gen_random_uuid(),
  sesion_id       uuid references sesiones(id) on delete cascade,
  nombre          text not null,
  grupo_muscular  text not null,
  series          integer not null,
  reps_target     text not null,
  rir_target      text not null,
  notas           text,
  nota_ajuste     text,
  youtube_search  text,
  orden           integer not null
);

-- Semanas programadas
create table semanas (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  rutina_id       uuid references rutinas(id),
  semana_numero   integer not null,
  fecha_inicio    date not null,
  dia_partido     text not null,
  dia_futsal      text not null,
  calendario      jsonb not null,
  created_at      timestamptz default now()
);

-- Tracking de pesos y reps
create table tracking (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  semana_id     uuid references semanas(id) on delete cascade,
  ejercicio_id  uuid references ejercicios(id),
  peso_trabajo  numeric,
  reps_s1       integer,
  reps_s2       integer,
  reps_s3       integer,
  reps_s4       integer,
  created_at    timestamptz default now()
);

-- RLS: cada usuario solo ve y modifica sus propios datos
alter table rutinas    enable row level security;
alter table sesiones   enable row level security;
alter table ejercicios enable row level security;
alter table semanas    enable row level security;
alter table tracking   enable row level security;

create policy "rutinas: usuario ve las suyas"
  on rutinas for all using (auth.uid() = user_id);

create policy "semanas: usuario ve las suyas"
  on semanas for all using (auth.uid() = user_id);

create policy "tracking: usuario ve el suyo"
  on tracking for all using (auth.uid() = user_id);

create policy "sesiones: accesibles si la rutina es del usuario"
  on sesiones for all using (
    exists (
      select 1 from rutinas
      where rutinas.id = sesiones.rutina_id
      and rutinas.user_id = auth.uid()
    )
  );

create policy "ejercicios: accesibles si la sesión es del usuario"
  on ejercicios for all using (
    exists (
      select 1 from sesiones
      join rutinas on rutinas.id = sesiones.rutina_id
      where sesiones.id = ejercicios.sesion_id
      and rutinas.user_id = auth.uid()
    )
  );
