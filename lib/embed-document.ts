import { supabase } from './supabase';
import OpenAI from 'openai';
import crypto from 'crypto';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type DocumentInput = {
  source_type: string;
  source_id: string;
  source_url?: string;
  title?: string;
  content: string;
  metadata?: Record<string, unknown>;
};

function generateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export async function embedDocument(doc: DocumentInput) {
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: doc.content,
  });

  const embedding = embeddingResponse.data[0].embedding;
  const content_hash = generateContentHash(doc.content);

  const { data, error } = await supabase
    .from('knowledge_base')
    .insert({
      source_type: doc.source_type,
      source_id: doc.source_id,
      source_url: doc.source_url || null,
      title: doc.title || null,
      content: doc.content,
      metadata: doc.metadata || {},
      content_hash,
      embedding,
      indexed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function embedDocuments(docs: DocumentInput[]) {
  const results = [];

  for (const doc of docs) {
    const result = await embedDocument(doc);
    results.push(result);
  }

  return results;
}

export async function deleteDocument(id: number) {
  const { error } = await supabase.from('knowledge_base').delete().eq('id', id);
  if (error) throw error;
}

export async function updateDocument(id: number, doc: Partial<DocumentInput>) {
  const updates: Record<string, unknown> = {};

  if (doc.content) {
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: doc.content,
    });
    updates.content = doc.content;
    updates.embedding = embeddingResponse.data[0].embedding;
  }

  if (doc.metadata) {
    updates.metadata = doc.metadata;
  }

  const { data, error } = await supabase
    .from('knowledge_base')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
