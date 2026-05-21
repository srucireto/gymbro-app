-- Habilitar RLS en todas las tablas
-- Esto asegura que cada usuario solo vea sus propios datos

-- Eliminar políticas existentes (por si acaso)
DROP POLICY IF EXISTS "rutinas: usuario ve las suyas" ON rutinas;
DROP POLICY IF EXISTS "semanas: usuario ve las suyas" ON semanas;
DROP POLICY IF EXISTS "tracking: usuario ve el suyo" ON tracking;
DROP POLICY IF EXISTS "sesiones: accesibles si la rutina es del usuario" ON sesiones;
DROP POLICY IF EXISTS "ejercicios: accesibles si la sesión es del usuario" ON ejercicios;
DROP POLICY IF EXISTS "ausencias: usuario ve las suyas" ON ausencias;

-- Habilitar RLS
ALTER TABLE rutinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE ejercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE semanas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE ausencias ENABLE ROW LEVEL SECURITY;

-- Políticas para rutinas
CREATE POLICY "rutinas: usuario ve las suyas"
  ON rutinas FOR ALL
  USING (auth.uid() = user_id);

-- Políticas para semanas
CREATE POLICY "semanas: usuario ve las suyas"
  ON semanas FOR ALL
  USING (auth.uid() = user_id);

-- Políticas para tracking
CREATE POLICY "tracking: usuario ve el suyo"
  ON tracking FOR ALL
  USING (auth.uid() = user_id);

-- Políticas para ausencias
CREATE POLICY "ausencias: usuario ve las suyas"
  ON ausencias FOR ALL
  USING (auth.uid() = user_id);

-- Políticas para sesiones (accesibles si la rutina es del usuario)
CREATE POLICY "sesiones: accesibles si la rutina es del usuario"
  ON sesiones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM rutinas
      WHERE rutinas.id = sesiones.rutina_id
      AND rutinas.user_id = auth.uid()
    )
  );

-- Políticas para ejercicios (accesibles si la sesión es del usuario)
CREATE POLICY "ejercicios: accesibles si la sesión es del usuario"
  ON ejercicios FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sesiones
      JOIN rutinas ON rutinas.id = sesiones.rutina_id
      WHERE sesiones.id = ejercicios.sesion_id
      AND rutinas.user_id = auth.uid()
    )
  );
