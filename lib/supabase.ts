import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type VectorDocument = {
  id: number;
  content: string;
  metadata: Record<string, unknown>;
  embedding: number[];
  similarity?: number;
};
