import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const allowedOrigins = process.env.WIDGET_ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || ['*'];

function getCorsHeaders(origin: string | null) {
  // If wildcard is allowed, permit all origins
  if (allowedOrigins.includes('*')) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, ngrok-skip-browser-warning',
    };
  }

  // Check if the specific origin is allowed
  const isAllowed = origin && allowedOrigins.includes(origin);
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, ngrok-skip-browser-warning',
  };
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  try {
    const { question, sessionId } = await request.json();

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Create embedding for the question
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: question,
    });
    const questionEmbedding = embeddingResponse.data[0].embedding;

    // 2. Search for similar documents in Supabase
    const { data: documents, error: searchError } = await supabase.rpc(
      'match_knowledge_base',
      {
        query_embedding: questionEmbedding,
        match_threshold: 0.3,
        match_count: 5,
      }
    );

    if (searchError) {
      console.error('Supabase search error:', searchError);
      return NextResponse.json(
        { error: 'Failed to search knowledge base' },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('Search results:', documents?.length || 0, 'documents found');
    if (documents?.length > 0) {
      console.log('Top match similarity:', documents[0].similarity);
    }

    // 3. Build context from matched documents
    const context = documents
      ?.map((doc: { content: string; metadata?: { title?: string; url?: string } }) => doc.content)
      .join('\n\n') || '';

    const sources = documents
      ?.filter((doc: { metadata?: { title?: string; url?: string } }) => doc.metadata?.url)
      .map((doc: { metadata?: { title?: string; url?: string } }) => ({
        title: doc.metadata?.title || 'Source',
        url: doc.metadata?.url,
      })) || [];

    // 4. Generate answer using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that answers questions based on the provided context.
If the context doesn't contain relevant information, say so politely and suggest the user contact support.
Keep answers concise but informative. Use markdown formatting when helpful.

Context:
${context || 'No relevant context found.'}`,
        },
        {
          role: 'user',
          content: question,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const answer = completion.choices[0]?.message?.content || 'I could not generate an answer.';

    // 5. Optionally log the interaction (fire and forget, ignore errors)
    if (sessionId) {
      Promise.resolve(
        supabase.from('widget_interactions').insert({
          session_id: sessionId,
          question,
          answer,
          sources,
          created_at: new Date().toISOString(),
        })
      ).catch(() => {});
    }

    return NextResponse.json(
      { answer, sources },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Widget API error:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500, headers: corsHeaders }
    );
  }
}
