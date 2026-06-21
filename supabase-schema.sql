-- WellDropp Task Manager — Supabase Schema
-- Run this in Supabase Dashboard → SQL Editor → New Query → Run

create table if not exists users (
  id text primary key,
  name text not null,
  email text not null unique,
  password text not null,
  role text not null check (role in ('admin', 'worker')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id text primary key,
  title text not null,
  description text default '',
  assigned_to text references users(id),
  assigned_by text references users(id),
  priority text not null check (priority in ('High', 'Medium', 'Low')),
  status text not null default 'Pending' check (status in ('Pending', 'In Progress', 'Completed')),
  due_date text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists comments (
  id text primary key,
  task_id text references tasks(id) on delete cascade,
  user_id text references users(id),
  user_name text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists activity_logs (
  id text primary key,
  task_id text,
  user_id text references users(id),
  user_name text not null,
  action text not null,
  created_at timestamptz not null default now()
);

-- Disable RLS so service role key can read/write freely
alter table users disable row level security;
alter table tasks disable row level security;
alter table comments disable row level security;
alter table activity_logs disable row level security;
