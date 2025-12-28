-- Migración: Agregar columna cheque_tipo (ENUM) a echeqs
-- Fecha: 2025-10-30

-- 1) Crear tipo ENUM si no existe
DO $$ BEGIN
  CREATE TYPE cheque_tipo_enum AS ENUM ('CC', 'CPD');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) Agregar columna cheque_tipo usando el tipo ENUM
ALTER TABLE echeqsandbox.echeqs 
  ADD COLUMN IF NOT EXISTS cheque_tipo cheque_tipo_enum DEFAULT 'CC';

-- 3) Completar valores para registros existentes
UPDATE echeqsandbox.echeqs 
SET cheque_tipo = CASE 
  WHEN due_date = CURRENT_DATE THEN 'CC'
  WHEN due_date > CURRENT_DATE THEN 'CPD'
  WHEN due_date < CURRENT_DATE THEN 'CC'
END
WHERE cheque_tipo IS NULL;

-- 4) Volver NOT NULL luego de completar datos
ALTER TABLE echeqsandbox.echeqs 
  ALTER COLUMN cheque_tipo SET NOT NULL;

-- 5) Índice útil para consultas por tipo y fecha
CREATE INDEX IF NOT EXISTS idx_echeqs_tipo_fecha 
  ON echeqsandbox.echeqs(cheque_tipo, due_date);

-- 6) Validación post-migración
-- SELECT cheque_tipo, COUNT(*) FROM echeqsandbox.echeqs GROUP BY cheque_tipo;




