-- Add grade and parent_code to students if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='students' AND column_name='grade'
  ) THEN
    ALTER TABLE students ADD COLUMN grade TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='students' AND column_name='parent_code'
  ) THEN
    ALTER TABLE students ADD COLUMN parent_code TEXT;
  END IF;
END $$;
