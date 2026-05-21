-- Verificar políticas de RLS para rutinas
SELECT
  schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('rutinas', 'tracking', 'sesiones', 'ejercicios', 'semanas')
ORDER BY tablename, policyname;
