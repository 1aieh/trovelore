// src/app/api/db-setup/stored-procedures.sql
-- SQL script to create stored procedures needed for database migrations

-- Function to check if a column exists in a table
CREATE OR REPLACE FUNCTION check_column_exists(table_name text, column_name text)
RETURNS boolean AS $$
DECLARE
  column_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
      AND column_name = $2
  ) INTO column_exists;
  
  RETURN column_exists;
END;
$$ LANGUAGE plpgsql;

-- Function to add a column if it doesn't exist
CREATE OR REPLACE FUNCTION add_column_if_not_exists(
  table_name text,
  column_name text,
  column_type text,
  column_default text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  column_exists boolean;
  alter_statement text;
BEGIN
  SELECT check_column_exists(table_name, column_name) INTO column_exists;
  
  IF NOT column_exists THEN
    alter_statement := 'ALTER TABLE public.' || quote_ident(table_name) || ' ADD COLUMN ' || quote_ident(column_name) || ' ' || column_type;
    
    IF column_default IS NOT NULL THEN
      alter_statement := alter_statement || ' DEFAULT ' || column_default;
    END IF;
    
    EXECUTE alter_statement;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to create an index if it doesn't exist
CREATE OR REPLACE FUNCTION create_index_if_not_exists(
  table_name text,
  index_name text,
  column_name text
)
RETURNS void AS $$
DECLARE
  index_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = $1
      AND indexname = $2
  ) INTO index_exists;
  
  IF NOT index_exists THEN
    EXECUTE 'CREATE INDEX ' || quote_ident(index_name) || ' ON public.' || quote_ident(table_name) || ' (' || quote_ident(column_name) || ')';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to create a table if it doesn't exist
CREATE OR REPLACE FUNCTION create_table_if_not_exists(
  table_name text,
  table_definition text
)
RETURNS void AS $$
DECLARE
  table_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = $1
  ) INTO table_exists;
  
  IF NOT table_exists THEN
    EXECUTE 'CREATE TABLE public.' || quote_ident(table_name) || ' (' || table_definition || ')';
  END IF;
END;
$$ LANGUAGE plpgsql;
