-- Add real date tracking to semanas table
-- fecha_inicio_real: when the user completes their first session
-- fecha_fin_real: when the user completes their last session
ALTER TABLE semanas
ADD COLUMN fecha_inicio_real timestamptz,
ADD COLUMN fecha_fin_real timestamptz;

-- Add index for better query performance
CREATE INDEX idx_semanas_fecha_inicio_real ON semanas(fecha_inicio_real);
CREATE INDEX idx_semanas_fecha_fin_real ON semanas(fecha_fin_real);
