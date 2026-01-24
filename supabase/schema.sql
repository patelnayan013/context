-- Enable the pgvector extension (run this first in Supabase SQL Editor)
create extension if not exists vector;

-- Note: This assumes you already have a 'knowledge_base' table with embeddings.
-- If you need to create it, uncomment the following:

-- create table if not exists knowledge_base (
--   id uuid primary key default gen_random_uuid(),
--   content text not null,
--   metadata jsonb default '{}'::jsonb,
--   embedding vector(1536), -- OpenAI text-embedding-3-small dimension
--   created_at timestamp with time zone default timezone('utc'::text, now()) not null,
--   updated_at timestamp with time zone default timezone('utc'::text, now()) not null
-- );

-- Create an index for faster similarity searches (adjust if your table already has this)
create index if not exists knowledge_base_embedding_idx on knowledge_base
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- Create a function to search for similar documents in knowledge_base
-- Note: id is bigint to match existing table structure
create or replace function match_knowledge_base(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 5
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    knowledge_base.id,
    knowledge_base.content,
    knowledge_base.metadata,
    1 - (knowledge_base.embedding <=> query_embedding) as similarity
  from knowledge_base
  where 1 - (knowledge_base.embedding <=> query_embedding) > match_threshold
  order by knowledge_base.embedding <=> query_embedding
  limit match_count;
$$;

-- Optional: Create a table to track widget interactions
create table if not exists widget_interactions (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  question text not null,
  answer text not null,
  sources jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create an index on session_id for querying conversation history
create index if not exists widget_interactions_session_idx on widget_interactions(session_id);

-- Row Level Security (RLS) policies
alter table knowledge_base enable row level security;
alter table widget_interactions enable row level security;

-- Allow anonymous read access to knowledge_base (for the widget)
create policy "Allow anonymous read access to knowledge_base"
  on knowledge_base for select
  using (true);

-- Allow anonymous insert access to widget_interactions
create policy "Allow anonymous insert access to widget_interactions"
  on widget_interactions for insert
  with check (true);

-- Helper function to update the updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Trigger to automatically update updated_at
create trigger update_knowledge_base_updated_at
  before update on knowledge_base
  for each row
  execute function update_updated_at_column();
