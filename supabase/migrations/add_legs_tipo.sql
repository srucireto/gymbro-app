-- Eliminar el constraint anterior
ALTER TABLE sesiones DROP CONSTRAINT IF EXISTS sesiones_tipo_check;

-- Agregar nuevo constraint que incluye 'legs'
ALTER TABLE sesiones ADD CONSTRAINT sesiones_tipo_check
  CHECK (tipo IN ('push', 'pull', 'legs'));
