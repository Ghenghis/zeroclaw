'use client';

import { useEffect, useRef, useState } from 'react';

export interface GitCommit {
  id: string;
  hash: string;
  message: string;
  type: 'daily' | 'coder' | 'asset' | 'qa' | 'user';
  author: string;
  timestamp: number;
  branch: string;
}

interface UseCommitStreamOptions {
  sseUrl: string;
  maxQueue?: number;
  enabled?: boolean;
}

interface CommitStreamState {
  queue: GitCommit[];
  connected: boolean;
  lastError: string | null;
}

// Mock commit feed for development / when SSE unavailable
const MOCK_COMMITS: Omit<GitCommit, 'id' | 'timestamp'>[] = [
  { hash: 'a1b2c3d', message: 'feat: implement nebula shader FBM octaves', type: 'coder', author: 'DaveAI', branch: 'main' },
  { hash: 'e4f5a6b', message: 'daily: regenerate homepage — cyberpunk theme', type: 'daily', author: 'DaveAI Agent', branch: 'main' },
  { hash: 'c7d8e9f', message: 'asset: update hero background WebP assets', type: 'asset', author: 'Asset Pipeline', branch: 'main' },
  { hash: '1a2b3c4', message: 'fix: resolve SSE reconnection backoff bug', type: 'coder', author: 'DaveAI', branch: 'main' },
  { hash: 'd5e6f7a', message: 'qa: visual regression test — nebula colors', type: 'qa', author: 'QA Agent', branch: 'main' },
];

function spawnMockCommit(index: number): GitCommit {
  const base = MOCK_COMMITS[index % MOCK_COMMITS.length];
  return {
    ...base,
    id: `mock-${Date.now()}-${index}`,
    timestamp: Date.now(),
  };
}

export function useCommitStream(options: UseCommitStreamOptions): CommitStreamState {
  const { sseUrl, maxQueue = 10, enabled = true } = options;

  const [state, setState] = useState<CommitStreamState>({
    queue: [],
    connected: false,
    lastError: null,
  });

  const esRef       = useRef<EventSource | null>(null);
  const backoffRef  = useRef<number>(1000);
  const mockIndexRef = useRef<number>(0);
  const mockTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const addCommit = (commit: GitCommit) => {
    setState(prev => ({
      ...prev,
      queue: [...prev.queue, commit].slice(-maxQueue),
    }));
  };

  // SSE connection with exponential backoff
  useEffect(() => {
    if (!enabled) return;

    let destroyed = false;

    const connect = () => {
      if (destroyed) return;

      try {
        const es = new EventSource(sseUrl);
        esRef.current = es;

        es.addEventListener('commit', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data) as GitCommit;
            if (data.id && data.message) {
              addCommit(data);
              backoffRef.current = 1000; // reset on success
            }
          } catch {
            // malformed event — ignore
          }
        });

        es.addEventListener('heartbeat', () => {
          setState(prev => ({ ...prev, connected: true, lastError: null }));
        });

        es.onopen = () => {
          setState(prev => ({ ...prev, connected: true, lastError: null }));
          backoffRef.current = 1000;
        };

        es.onerror = () => {
          setState(prev => ({ ...prev, connected: false }));
          es.close();
          esRef.current = null;

          // Exponential backoff, cap at 30s
          const delay = Math.min(backoffRef.current, 30000);
          backoffRef.current = Math.min(delay * 2, 30000);

          setTimeout(() => {
            if (!destroyed) connect();
          }, delay);
        };
      } catch {
        // SSE not available — fall through to mock
        setState(prev => ({ ...prev, connected: false, lastError: 'SSE unavailable' }));
        startMockFeed();
      }
    };

    const startMockFeed = () => {
      const spawnNext = () => {
        if (destroyed) return;
        addCommit(spawnMockCommit(mockIndexRef.current++));
        mockTimerRef.current = setTimeout(spawnNext, 5000 + Math.random() * 8000);
      };
      // First mock after 2s
      mockTimerRef.current = setTimeout(spawnNext, 2000);
    };

    // Try SSE first; if it fails the onerror will trigger mock
    connect();

    return () => {
      destroyed = true;
      esRef.current?.close();
      esRef.current = null;
      clearTimeout(mockTimerRef.current);
    };
  }, [sseUrl, enabled, maxQueue]);

  return state;
}
