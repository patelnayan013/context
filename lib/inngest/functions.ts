import { inngest } from './client';
import { syncProject, syncProjects, SyncReport } from '../services/asana-ingestion';
import { SYNC_PROJECT_IDS } from '../config/asana-projects';

type SyncRequestedEvent = {
  name: 'asana/sync.requested';
  data: {
    projectIds: string[];
  };
};

export const syncAsanaProject = inngest.createFunction(
  {
    id: 'sync-asana-project',
    retries: 3,
  },
  { event: 'asana/sync.requested' },
  async ({ event, step }) => {
    const { projectIds } = event.data as SyncRequestedEvent['data'];

    const reports: SyncReport[] = [];

    for (const projectId of projectIds) {
      const report = await step.run(`sync-project-${projectId}`, async () => {
        return await syncProject(projectId);
      });
      reports.push(report);
    }

    const summary = {
      totalProjects: reports.length,
      totalSynced: reports.reduce((sum, r) => sum + r.synced, 0),
      totalSkipped: reports.reduce((sum, r) => sum + r.skipped, 0),
      totalErrors: reports.reduce((sum, r) => sum + r.errors.length, 0),
      reports,
    };

    return summary;
  }
);

export const scheduledAsanaSync = inngest.createFunction(
  {
    id: 'scheduled-asana-sync',
    retries: 3,
  },
  { cron: '0 2 * * *' }, // Daily at 2 AM
  async ({ step }) => {
    if (SYNC_PROJECT_IDS.length === 0) {
      return { message: 'No projects configured for scheduled sync' };
    }

    const reports = await step.run('sync-all-configured-projects', async () => {
      return await syncProjects(SYNC_PROJECT_IDS);
    });

    const summary = {
      totalProjects: reports.length,
      totalSynced: reports.reduce((sum, r) => sum + r.synced, 0),
      totalSkipped: reports.reduce((sum, r) => sum + r.skipped, 0),
      totalErrors: reports.reduce((sum, r) => sum + r.errors.length, 0),
      completedAt: new Date().toISOString(),
    };

    return summary;
  }
);

export const functions = [syncAsanaProject, scheduledAsanaSync];
