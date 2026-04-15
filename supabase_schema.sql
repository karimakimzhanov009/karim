-- Выполните этот SQL в Supabase → SQL Editor → New Query

-- 1. Пользователи
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','teacher','student','deputy')),
  full_name TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL
);

-- 2. Группы
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_by TEXT NOT NULL,
  student_ids JSONB DEFAULT '[]',
  created_at TEXT NOT NULL
);

-- 3. Тесты / Экзамены
CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  created_by TEXT NOT NULL,
  assigned_to JSONB DEFAULT '[]',
  assigned_groups JSONB DEFAULT '[]',
  questions JSONB DEFAULT '[]',
  time_limit_minutes INTEGER,
  scheduled_at TEXT,
  created_at TEXT NOT NULL
);

-- 4. Результаты студентов
CREATE TABLE IF NOT EXISTS student_results (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  quiz_id TEXT NOT NULL,
  answers JSONB DEFAULT '{}',
  score NUMERIC NOT NULL,
  max_score NUMERIC NOT NULL,
  completed_at TEXT NOT NULL,
  snapshots JSONB DEFAULT '[]'
);

-- 5. Прямые трансляции (временные)
CREATE TABLE IF NOT EXISTS live_streams (
  student_id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL,
  snapshot TEXT,
  timestamp BIGINT NOT NULL,
  face_detected BOOLEAN
);

-- ─── Row Level Security (RLS) ──────────────────────────────
-- Для простоты разрешаем анонимный доступ (anon key)
-- В продакшне рекомендуется настроить RLS политики

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_streams ENABLE ROW LEVEL SECURITY;

-- Разрешаем всё для anon (можно ограничить позже)
CREATE POLICY "allow_all_users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_groups" ON groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_quizzes" ON quizzes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_results" ON student_results FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_streams" ON live_streams FOR ALL USING (true) WITH CHECK (true);
