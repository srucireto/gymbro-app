-- Eliminar políticas existentes que requieren autenticación
drop policy if exists "rutinas: usuario ve las suyas" on rutinas;
drop policy if exists "semanas: usuario ve las suyas" on semanas;
drop policy if exists "tracking: usuario ve el suyo" on tracking;
drop policy if exists "sesiones: accesibles si la rutina es del usuario" on sesiones;
drop policy if exists "ejercicios: accesibles si la sesión es del usuario" on ejercicios;

-- Crear políticas públicas temporales (TODO: reemplazar con auth cuando esté listo)
create policy "rutinas: acceso público temporal"
  on rutinas for all
  using (true)
  with check (true);

create policy "sesiones: acceso público temporal"
  on sesiones for all
  using (true)
  with check (true);

create policy "ejercicios: acceso público temporal"
  on ejercicios for all
  using (true)
  with check (true);

create policy "semanas: acceso público temporal"
  on semanas for all
  using (true)
  with check (true);

create policy "tracking: acceso público temporal"
  on tracking for all
  using (true)
  with check (true);
