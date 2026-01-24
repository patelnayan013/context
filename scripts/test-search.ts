import { config } from 'dotenv';
config({ path: '.env.local' });

async function main() {
  const { supabase } = await import('../lib/supabase');
  const OpenAI = (await import('openai')).default;

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const question = 'Where do I send Pre-Vet Requests?';

  console.log('Testing search for:', question);
  console.log('---');

  // Create embedding for the question
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: question,
  });
  const questionEmbedding = embeddingResponse.data[0].embedding;

  console.log('Embedding length:', questionEmbedding.length);

  // Test with different thresholds
  for (const threshold of [0.0, 0.1, 0.2, 0.3, 0.5, 0.7]) {
    const { data: documents, error } = await supabase.rpc('match_knowledge_base', {
      query_embedding: questionEmbedding,
      match_threshold: threshold,
      match_count: 5,
    });

    if (error) {
      console.error(`Threshold ${threshold} error:`, error);
    } else {
      console.log(`Threshold ${threshold}: ${documents?.length || 0} docs found`);
      if (documents?.length > 0) {
        console.log(`  Top similarity: ${documents[0].similarity}`);
        console.log(`  Top content preview: ${documents[0].content.substring(0, 100)}...`);
      }
    }
  }
}

main().catch(console.error);
