-- Migración para lógica de enfermedad y sesiones faltadas
-- Basado en docs/05_logica_enfermedad.md

-- 1. Agregar campo estado_sesion a la tabla tracking
ALTER TABLE tracking
ADD COLUMN IF NOT EXISTS estado_sesion TEXT
CHECK (estado_sesion IN (
  'normal', 'liviana', 'vuelta_bien', 'vuelta_regular', 'vuelta_mal',
  'faltada', 'recuperada', 'pospuesta', 'omitida'
));

-- 2. Crear tabla de ausencias
CREATE TABLE IF NOT EXISTS ausencias (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  semana_id     UUID REFERENCES semanas(id) ON DELETE CASCADE NOT NULL,
  sesion_id     UUID REFERENCES sesiones(id) NOT NULL,
  dia_faltado   TEXT NOT NULL,
  dias_fuera    INTEGER NOT NULL CHECK (dias_fuera IN (1, 2, 3, 4)),
  sesion_recuperada     BOOLEAN DEFAULT FALSE,
  dia_recuperacion      TEXT,
  check_in_estado       TEXT CHECK (check_in_estado IN ('bien', 'regular', 'mal')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar RLS en ausencias
ALTER TABLE ausencias ENABLE ROW LEVEL SECURITY;

-- 4. Crear policy para ausencias
CREATE POLICY "ausencias: usuario ve las suyas"
  ON ausencias FOR ALL
  USING (auth.uid() = user_id);

-- 5. Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_ausencias_user_id ON ausencias(user_id);
CREATE INDEX IF NOT EXISTS idx_ausencias_semana_id ON ausencias(semana_id);
CREATE INDEX IF NOT EXISTS idx_tracking_estado_sesion ON tracking(estado_sesion) WHERE estado_sesion IS NOT NULL;

-- 6. Comentarios para documentación
COMMENT ON TABLE ausencias IS 'Registra ausencias de entrenamiento y su manejo según 05_logica_enfermedad.md';
COMMENT ON COLUMN ausencias.dias_fuera IS '1=1día, 2=2-3días, 3=4-7días, 4=+7días según doc';
COMMENT ON COLUMN tracking.estado_sesion IS 'Estado de la sesión para tracking de vuelta de enfermedad';
