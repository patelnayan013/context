import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/lib/inngest/client';
import { syncProjects } from '@/lib/services/asana-ingestion';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectIds, async = true } = body;

    if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
      return NextResponse.json(
        { error: 'projectIds must be a non-empty array of project GIDs' },
        { status: 400 }
      );
    }

    if (async) {
      // Trigger async sync via Inngest
      await inngest.send({
        name: 'asana/sync.requested',
        data: { projectIds },
      });

      return NextResponse.json({
        status: 'queued',
        message: `Sync queued for ${projectIds.length} project(s)`,
        projectIds,
      });
    } else {
      // Synchronous sync (for testing/small projects)
      const reports = await syncProjects(projectIds);

      const summary = {
        totalProjects: reports.length,
        totalSynced: reports.reduce((sum, r) => sum + r.synced, 0),
        totalSkipped: reports.reduce((sum, r) => sum + r.skipped, 0),
        totalErrors: reports.reduce((sum, r) => sum + r.errors.length, 0),
        reports,
      };

      return NextResponse.json({
        status: 'completed',
        ...summary,
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Sync failed',
      },
      { status: 500 }
    );
  }
}
