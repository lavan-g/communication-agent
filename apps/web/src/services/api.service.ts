import type { 
  Session, 
  SessionReport, 
  AnalyzeChunkPayload, 
  AnalyzeChunkResponse,
  UserProfile,
  Story,
  CreateSessionPayload
} from '@communication-agent/types';

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`API Error ${response.status}: ${errorBody || response.statusText}`);
  }

  return response.json();
}

// Sessions
export async function createSession(payload: CreateSessionPayload): Promise<Session> {
  const data = await fetchApi<{ session: Session }>('/sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.session;
}

export async function getSessions(): Promise<Session[]> {
  const data = await fetchApi<{ sessions: Session[] }>('/sessions');
  return data.sessions;
}

export async function getSession(id: string): Promise<Session> {
  const data = await fetchApi<{ session: Session }>(`/sessions/${id}`);
  return data.session;
}

export async function analyzeChunk(sessionId: string, payload: AnalyzeChunkPayload): Promise<AnalyzeChunkResponse> {
  return fetchApi<AnalyzeChunkResponse>(`/sessions/${sessionId}/analyze`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function endSession(sessionId: string): Promise<SessionReport> {
  const data = await fetchApi<{ report: SessionReport }>(`/sessions/${sessionId}/end`, {
    method: 'POST',
  });
  return data.report;
}

export interface SessionReportFull {
  report: SessionReport;
  session: any;           // raw snake_case DB row
  transcripts: any[];     // raw transcript_chunks rows
  coachingEvents: any[];  // raw coaching_events rows
}

export async function getSessionReport(sessionId: string): Promise<SessionReportFull> {
  return fetchApi<SessionReportFull>(`/sessions/${sessionId}/report`);
}

// Profile
export async function getProfile(): Promise<UserProfile> {
  const data = await fetchApi<{ profile: UserProfile }>('/profile');
  return data.profile;
}

export async function updateProfile(updateData: Partial<UserProfile>): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>('/profile', {
    method: 'PATCH',
    body: JSON.stringify(updateData),
  });
}

export async function deleteProfileData(): Promise<{ deleted: boolean }> {
  return fetchApi<{ deleted: boolean }>('/profile/data', {
    method: 'DELETE',
  });
}

// Stories
export async function getStories(): Promise<Story[]> {
  const data = await fetchApi<{ stories: Story[] }>('/stories');
  return data.stories;
}

export async function createStory(storyData: Omit<Story, 'id' | 'createdAt' | 'updatedAt'>): Promise<Story> {
  const data = await fetchApi<{ story: Story }>('/stories', {
    method: 'POST',
    body: JSON.stringify(storyData),
  });
  return data.story;
}

export async function updateStory(id: string, storyData: Partial<Story>): Promise<Story> {
  const data = await fetchApi<{ story: Story }>(`/stories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(storyData),
  });
  return data.story;
}

export async function deleteStory(id: string): Promise<void> {
  await fetchApi<{ deleted: boolean }>(`/stories/${id}`, {
    method: 'DELETE',
  });
}
