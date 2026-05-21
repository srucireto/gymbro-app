-- Create ausencias table for tracking missed sessions
CREATE TABLE IF NOT EXISTS ausencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  semana_id UUID REFERENCES semanas(id) ON DELETE CASCADE,
  sesion_id UUID REFERENCES sesiones(id),
  dia_faltado TEXT NOT NULL,
  dias_fuera INTEGER NOT NULL CHECK (dias_fuera BETWEEN 1 AND 4),
  sesion_recuperada BOOLEAN DEFAULT FALSE,
  dia_recuperacion TEXT,
  check_in_estado TEXT CHECK (check_in_estado IN ('bien', 'regular', 'mal')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for development
ALTER TABLE ausencias DISABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ausencias_user_id ON ausencias(user_id);
CREATE INDEX IF NOT EXISTS idx_ausencias_semana_id ON ausencias(semana_id);
