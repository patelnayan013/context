/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */

// Using require because @types/asana is outdated and doesn't match the actual SDK
const asana = require('asana');

export interface AsanaProject {
  gid: string;
  name: string;
  archived: boolean;
}

export interface AsanaComment {
  gid: string;
  text: string;
  createdBy: string;
  createdAt: string;
}

export interface AsanaTask {
  gid: string;
  name: string;
  notes: string;
  htmlNotes?: string;
  assignee: string | null;
  dueOn: string | null;
  completedAt: string | null;
  createdAt: string;
  modifiedAt: string;
  permalink: string;
  tags: string[];
  projects: { gid: string; name: string }[];
  comments: AsanaComment[];
}

export interface AsanaContentItem {
  sourceType: 'asana_task';
  sourceId: string;
  sourceUrl: string;
  title: string;
  content: string;
  metadata: {
    project_id: string;
    project_name: string;
    assignee: string | null;
    status: 'complete' | 'incomplete';
    tags: string[];
    due_on: string | null;
    created_at: string;
    modified_at: string;
    comment_count: number;
  };
}

function initClient(): void {
  const accessToken = process.env.ASANA_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('ASANA_ACCESS_TOKEN environment variable is not set');
  }
  const client = asana.ApiClient.instance;
  client.authentications['token'].accessToken = accessToken;
}

export async function testConnection(): Promise<{ success: boolean; user?: string; error?: string }> {
  try {
    initClient();
    const usersApi = new asana.UsersApi();
    const result = await usersApi.getUser('me', {});
    return { success: true, user: result.data?.name || 'Unknown' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function fetchWorkspaces(): Promise<{ gid: string; name: string }[]> {
  initClient();
  const workspacesApi = new asana.WorkspacesApi();
  const result = await workspacesApi.getWorkspaces({});
  return (result.data || []).map((w: any) => ({ gid: w.gid, name: w.name }));
}

export async function fetchProjects(workspaceGid?: string): Promise<AsanaProject[]> {
  initClient();
  const projectsApi = new asana.ProjectsApi();
  const projects: AsanaProject[] = [];

  if (workspaceGid) {
    const opts = { opt_fields: 'gid,name,archived' };
    const result = await projectsApi.getProjectsForWorkspace(workspaceGid, opts);

    for (const project of result.data || []) {
      projects.push({
        gid: project.gid || '',
        name: project.name || '',
        archived: (project as any).archived || false
      });
    }
  } else {
    const workspaces = await fetchWorkspaces();
    for (const workspace of workspaces) {
      const workspaceProjects = await fetchProjects(workspace.gid);
      projects.push(...workspaceProjects);
    }
  }

  return projects.filter(p => !p.archived);
}

async function fetchTaskComments(taskGid: string): Promise<AsanaComment[]> {
  const comments: AsanaComment[] = [];

  try {
    initClient();
    const storiesApi = new asana.StoriesApi();
    const opts = { opt_fields: 'gid,text,created_by.name,created_at,resource_subtype' };
    const result = await storiesApi.getStoriesForTask(taskGid, opts);

    for (const story of result.data || []) {
      if ((story as any).resource_subtype === 'comment_added' && story.text) {
        comments.push({
          gid: story.gid || '',
          text: story.text,
          createdBy: (story as any).created_by?.name || 'Unknown',
          createdAt: (story as any).created_at || ''
        });
      }
    }
  } catch (error) {
    console.error(`Failed to fetch comments for task ${taskGid}:`, error);
  }

  return comments;
}

export async function fetchTasksWithComments(projectGid: string): Promise<AsanaTask[]> {
  initClient();
  const projectsApi = new asana.ProjectsApi();
  const tasksApi = new asana.TasksApi();
  const tasks: AsanaTask[] = [];

  // Get project name
  const projectResult = await projectsApi.getProject(projectGid, { opt_fields: 'name' });
  const projectName = projectResult.data?.name || 'Unknown Project';

  // Get all tasks
  const opts = {
    opt_fields: 'gid,name,notes,html_notes,assignee.name,due_on,completed_at,created_at,modified_at,permalink_url,tags.name,memberships.project.gid,memberships.project.name'
  };
  const tasksResult = await tasksApi.getTasksForProject(projectGid, opts);

  for (const task of tasksResult.data || []) {
    const comments = await fetchTaskComments(task.gid || '');

    const projects: { gid: string; name: string }[] = [];
    const memberships = (task as any).memberships || [];
    for (const membership of memberships) {
      if (membership.project) {
        projects.push({
          gid: membership.project.gid,
          name: membership.project.name || ''
        });
      }
    }
    if (projects.length === 0) {
      projects.push({ gid: projectGid, name: projectName });
    }

    const tags: string[] = [];
    const taskTags = (task as any).tags || [];
    for (const tag of taskTags) {
      if (tag.name) tags.push(tag.name);
    }

    tasks.push({
      gid: task.gid || '',
      name: task.name || '',
      notes: (task as any).notes || '',
      htmlNotes: (task as any).html_notes,
      assignee: (task as any).assignee?.name || null,
      dueOn: (task as any).due_on || null,
      completedAt: (task as any).completed_at || null,
      createdAt: (task as any).created_at || '',
      modifiedAt: (task as any).modified_at || '',
      permalink: (task as any).permalink_url || '',
      tags,
      projects,
      comments
    });
  }

  return tasks;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export function formatTaskAsContent(task: AsanaTask): AsanaContentItem {
  const status = task.completedAt ? 'Complete' : 'Incomplete';
  const project = task.projects[0] || { gid: '', name: 'Unknown' };

  let content = `# ${task.name}\n\n`;
  content += `**Status:** ${status}`;
  if (task.assignee) content += ` | **Assignee:** ${task.assignee}`;
  if (task.dueOn) content += ` | **Due:** ${formatDate(task.dueOn)}`;
  if (task.tags.length > 0) content += ` | **Tags:** ${task.tags.join(', ')}`;
  content += '\n\n';

  if (task.notes) {
    content += `## Description\n${task.notes}\n\n`;
  }

  if (task.comments.length > 0) {
    content += `## Comments\n\n`;
    for (const comment of task.comments) {
      const date = formatDate(comment.createdAt);
      content += `**${comment.createdBy}** (${date}):\n${comment.text}\n\n`;
    }
  }

  return {
    sourceType: 'asana_task',
    sourceId: task.gid,
    sourceUrl: task.permalink,
    title: task.name,
    content: content.trim(),
    metadata: {
      project_id: project.gid,
      project_name: project.name,
      assignee: task.assignee,
      status: task.completedAt ? 'complete' : 'incomplete',
      tags: task.tags,
      due_on: task.dueOn,
      created_at: task.createdAt,
      modified_at: task.modifiedAt,
      comment_count: task.comments.length
    }
  };
}
