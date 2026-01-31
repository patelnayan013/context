import crypto from 'crypto';
import { supabase } from '../supabase';
import { embedDocument, DocumentInput } from '../embed-document';
import {
  fetchTasksWithComments,
  formatTaskAsContent,
  AsanaContentItem
} from '../adapters/asana';

export interface SyncReport {
  projectId: string;
  synced: number;
  skipped: number;
  errors: { taskId: string; error: string }[];
  startedAt: string;
  completedAt: string;
}

function generateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function getExistingItem(sourceId: string): Promise<{ id: number; content_hash: string } | null> {
  const { data, error } = await supabase
    .from('knowledge_base')
    .select('id, content_hash')
    .eq('source_type', 'asana_task')
    .eq('source_id', sourceId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking existing item:', error);
  }

  return data;
}

async function updateExistingDocument(id: number, item: AsanaContentItem): Promise<void> {
  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: item.content,
  });

  const embedding = embeddingResponse.data[0].embedding;
  const contentHash = generateContentHash(item.content);

  const { error } = await supabase
    .from('knowledge_base')
    .update({
      title: item.title,
      content: item.content,
      source_url: item.sourceUrl,
      metadata: item.metadata,
      content_hash: contentHash,
      embedding,
      indexed_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

async function processTask(item: AsanaContentItem): Promise<'synced' | 'skipped' | 'updated'> {
  const contentHash = generateContentHash(item.content);
  const existing = await getExistingItem(item.sourceId);

  if (existing) {
    if (existing.content_hash === contentHash) {
      return 'skipped';
    }
    await updateExistingDocument(existing.id, item);
    return 'updated';
  }

  const doc: DocumentInput = {
    source_type: item.sourceType,
    source_id: item.sourceId,
    source_url: item.sourceUrl,
    title: item.title,
    content: item.content,
    metadata: item.metadata,
  };

  await embedDocument(doc);
  return 'synced';
}

export async function syncProject(projectId: string): Promise<SyncReport> {
  const startedAt = new Date().toISOString();
  const report: SyncReport = {
    projectId,
    synced: 0,
    skipped: 0,
    errors: [],
    startedAt,
    completedAt: '',
  };

  console.log(`Starting sync for project ${projectId}`);

  try {
    const tasks = await fetchTasksWithComments(projectId);
    console.log(`Fetched ${tasks.length} tasks from Asana`);

    for (const task of tasks) {
      try {
        const item = formatTaskAsContent(task);
        const result = await processTask(item);

        if (result === 'skipped') {
          report.skipped++;
        } else {
          report.synced++;
        }

        console.log(`Task ${task.gid} (${task.name}): ${result}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error processing task ${task.gid}:`, errorMsg);
        report.errors.push({ taskId: task.gid, error: errorMsg });
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error syncing project ${projectId}:`, errorMsg);
    report.errors.push({ taskId: 'project', error: errorMsg });
  }

  report.completedAt = new Date().toISOString();
  console.log(`Sync completed: ${report.synced} synced, ${report.skipped} skipped, ${report.errors.length} errors`);

  return report;
}

export async function syncProjects(projectIds: string[]): Promise<SyncReport[]> {
  const reports: SyncReport[] = [];

  for (const projectId of projectIds) {
    const report = await syncProject(projectId);
    reports.push(report);
  }

  return reports;
}
