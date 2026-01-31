'use client';

import { useState } from 'react';

type ConnectionStatus = {
  status: string;
  user?: string;
  message?: string;
};

type Project = {
  gid: string;
  name: string;
};

type SyncReport = {
  projectId: string;
  synced: number;
  skipped: number;
  errors: { taskId: string; error: string }[];
};

export default function TestAsanaPage() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [syncResult, setSyncResult] = useState<SyncReport[] | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testConnection = async () => {
    setLoading('connection');
    setError(null);
    try {
      const res = await fetch('/api/asana/test');
      const data = await res.json();
      setConnectionStatus(data);
    } catch (err) {
      console.log(err);
      setError(err instanceof Error ? err.message : 'Failed to test connection');
    } finally {
      setLoading(null);
    }
  };

  const fetchProjects = async () => {
    setLoading('projects');
    setError(null);
    try {
      const res = await fetch('/api/asana/projects');
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setLoading(null);
    }
  };

  const syncProject = async () => {
    if (!selectedProject) {
      setError('Please select a project first');
      return;
    }
    setLoading('sync');
    setError(null);
    setSyncResult(null);
    try {
      const res = await fetch('/api/asana/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectIds: [selectedProject], async: false }),
      });
      const data = await res.json();
      setSyncResult(data.reports || [data]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem' }}>Asana Integration Test</h1>

      {error && (
        <div style={{ padding: '1rem', background: '#fee', border: '1px solid #c00', borderRadius: '4px', marginBottom: '1rem', color: '#c00' }}>
          {error}
        </div>
      )}

      {/* Step 1: Test Connection */}
      <section style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>Step 1: Test Connection</h2>
        <p style={{ color: '#666', marginBottom: '1rem' }}>Verify your ASANA_ACCESS_TOKEN is configured correctly.</p>
        <button
          onClick={testConnection}
          disabled={loading === 'connection'}
          style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
        >
          {loading === 'connection' ? 'Testing...' : 'Test Connection'}
        </button>
        {connectionStatus && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: connectionStatus.status === 'connected' ? '#efe' : '#fee', borderRadius: '4px' }}>
            <strong>Status:</strong> {connectionStatus.status}<br />
            {connectionStatus.user && <><strong>User:</strong> {connectionStatus.user}<br /></>}
            {connectionStatus.message && <><strong>Message:</strong> {connectionStatus.message}</>}
          </div>
        )}
      </section>

      {/* Step 2: Fetch Projects */}
      <section style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>Step 2: Fetch Projects</h2>
        <p style={{ color: '#666', marginBottom: '1rem' }}>List all accessible Asana projects.</p>
        <button
          onClick={fetchProjects}
          disabled={loading === 'projects'}
          style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
        >
          {loading === 'projects' ? 'Loading...' : 'Fetch Projects'}
        </button>
        {projects.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <strong>Found {projects.length} projects:</strong>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              style={{ display: 'block', marginTop: '0.5rem', padding: '0.5rem', width: '100%' }}
            >
              <option value="">-- Select a project --</option>
              {projects.map((p) => (
                <option key={p.gid} value={p.gid}>
                  {p.name} ({p.gid})
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      {/* Step 3: Sync Project */}
      <section style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>Step 3: Sync Project</h2>
        <p style={{ color: '#666', marginBottom: '1rem' }}>Fetch tasks + comments from selected project, generate embeddings, and store in Supabase.</p>
        <button
          onClick={syncProject}
          disabled={loading === 'sync' || !selectedProject}
          style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
        >
          {loading === 'sync' ? 'Syncing...' : 'Sync Selected Project'}
        </button>
        {loading === 'sync' && (
          <p style={{ marginTop: '1rem', color: '#666' }}>This may take a while depending on the number of tasks...</p>
        )}
        {syncResult && syncResult.map((report, idx) => (
          <div key={idx} style={{ marginTop: '1rem', padding: '1rem', background: '#efe', borderRadius: '4px' }}>
            <strong>Sync Complete!</strong><br />
            <strong>Project:</strong> {report.projectId}<br />
            <strong>Synced:</strong> {report.synced} tasks<br />
            <strong>Skipped:</strong> {report.skipped} (unchanged)<br />
            <strong>Errors:</strong> {report.errors?.length || 0}
            {report.errors && report.errors.length > 0 && (
              <ul style={{ marginTop: '0.5rem', color: '#c00' }}>
                {report.errors.map((e, i) => (
                  <li key={i}>{e.taskId}: {e.error}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>

      {/* Step 4: Test Q&A */}
      <section style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>Step 4: Test Q&A</h2>
        <p style={{ color: '#666' }}>
          After syncing, test the widget API at <code>/api/widget/ask</code> or use the existing widget.
        </p>
        <TestQA />
      </section>
    </div>
  );
}

function TestQA() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<{ answer: string; sources: { title: string; url: string }[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const askQuestion = async () => {
    if (!question.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/widget/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setAnswer(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '1rem' }}>
      <input
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask a question about your Asana tasks..."
        style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
        onKeyDown={(e) => e.key === 'Enter' && askQuestion()}
      />
      <button onClick={askQuestion} disabled={loading} style={{ padding: '0.5rem 1rem' }}>
        {loading ? 'Asking...' : 'Ask'}
      </button>
      {answer && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#f5f5f5', borderRadius: '4px' }}>
          <strong>Answer:</strong>
          <p>{answer.answer}</p>
          {answer.sources && answer.sources.length > 0 && (
            <>
              <strong>Sources:</strong>
              <ul>
                {answer.sources.map((s, i) => (
                  <li key={i}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
