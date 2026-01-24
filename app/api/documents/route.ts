import { NextRequest, NextResponse } from 'next/server';
import { embedDocument, embedDocuments } from '@/lib/embed-document';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('id, content, metadata, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ documents: data });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (Array.isArray(body.documents)) {
      const results = await embedDocuments(body.documents);
      return NextResponse.json({ documents: results });
    }

    if (body.content) {
      const result = await embedDocument({
        content: body.content,
        metadata: body.metadata,
      });
      return NextResponse.json({ document: result });
    }

    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
}
