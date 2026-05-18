-- Migración: Tracking con peso por serie (no por ejercicio)
-- Razón: El peso puede cambiar entre series (ajuste en tiempo real, lumbar que cede, drop sets)

-- 1. Renombrar tabla actual a backup
alter table tracking rename to tracking_old;

-- 2. Crear nueva tabla tracking con diseño correcto
create table tracking (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  semana_id     uuid references semanas(id) on delete cascade,
  ejercicio_id  uuid references ejercicios(id) on delete cascade,
  numero_serie  integer not null check (numero_serie between 1 and 4),
  peso          numeric,           -- kg para esa serie específica
  reps          integer,           -- reps logradas en esa serie
  created_at    timestamptz default now(),
  unique (semana_id, ejercicio_id, numero_serie)
);

-- 3. Migrar datos existentes (expandir filas)
-- Cada fila antigua se convierte en 1-4 filas nuevas
insert into tracking (user_id, semana_id, ejercicio_id, numero_serie, peso, reps)
select
  user_id,
  semana_id,
  ejercicio_id,
  1 as numero_serie,
  peso_trabajo as peso,
  reps_s1 as reps
from tracking_old
where reps_s1 is not null

union all

select
  user_id,
  semana_id,
  ejercicio_id,
  2 as numero_serie,
  peso_trabajo as peso,
  reps_s2 as reps
from tracking_old
where reps_s2 is not null

union all

select
  user_id,
  semana_id,
  ejercicio_id,
  3 as numero_serie,
  peso_trabajo as peso,
  reps_s3 as reps
from tracking_old
where reps_s3 is not null

union all

select
  user_id,
  semana_id,
  ejercicio_id,
  4 as numero_serie,
  peso_trabajo as peso,
  reps_s4 as reps
from tracking_old
where reps_s4 is not null;

-- 4. RLS y políticas
alter table tracking enable row level security;

create policy "tracking: usuario ve el suyo"
  on tracking for all using (auth.uid() = user_id);

-- 5. Eliminar tabla antigua (descomentar cuando estés seguro)
-- drop table tracking_old;

-- NOTA: Si tienes datos de producción, primero ejecuta la migración en un ambiente de prueba
-- y verifica que los datos se migraron correctamente antes de eliminar tracking_old
