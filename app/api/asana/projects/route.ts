import { NextResponse } from 'next/server';
import { fetchProjects, fetchWorkspaces } from '@/lib/adapters/asana';

export async function GET() {
  try {
    const workspaces = await fetchWorkspaces();
    const projects = await fetchProjects();

    return NextResponse.json({
      workspaces,
      projects,
      count: projects.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch projects',
      },
      { status: 500 }
    );
  }
}
