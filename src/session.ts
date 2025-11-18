/**
 * Session-specific API wrapper for IoM Platform
 */

import type { GrpcClient } from './client';

/* *
 * Session Information */
export interface SessionInfo {
  sessionId: string;
  name?: string;
  type?: string;
  [key: string]: any;
}

/**
 * Session wrapper that automatically injects session_id into gRPC metadata
 */
export class Session {
  private client: any;
  private sessionInfo: SessionInfo;

  constructor(client: GrpcClient, sessionInfo: SessionInfo | string) {
    this.client = client;
    this.sessionInfo = typeof sessionInfo === 'string' ? { sessionId: sessionInfo } : sessionInfo;

    // Return Proxy for dynamic method forwarding with session_id injection
    return new Proxy(this, {
      get: (target, prop: string | symbol) => {
        if (prop === 'sessionInfo') return target.sessionInfo;
        if (prop === 'sessionId') return target.sessionInfo.sessionId;
        if (prop === 'getSessionId') return () => target.sessionInfo.sessionId;

        const propStr = String(prop);

        // sync_ prefix: automatically wait for task completion, return TaskContext
        if (propStr.startsWith('sync_')) {
          const actualMethod = propStr.substring(5);
          const method = (this.client as any)[actualMethod];

          if (typeof method === 'function') {
            return async (request: any = {}, options: any = {}) => {
              // Create Headers object and add session_id (backend expects session_id, not session-id)
              const headers = new Headers(options.headers || {});
              headers.set('session_id', this.sessionInfo.sessionId);

              const task = await method.call(this.client, request, { ...options, headers });

              if (task && typeof task === 'object' && 'taskId' in task) {
                const waitMethod = (this.client as any)['waitTaskFinish'];
                if (waitMethod) {
                  // Return complete TaskContext, let caller use Spite Handler to process
                  const taskContext = await waitMethod.call(this.client,
                    { taskId: task.taskId, sessionId: task.sessionId || this.sessionInfo.sessionId },
                    { headers }
                  );
                  return taskContext;
                }
              }
              return task;
            };
          }
        }

        // Normal method: inject session_id
        const method = (this.client as any)[propStr];
        if (typeof method === 'function') {
          return async (request: any = {}, options: any = {}) => {
            // Create Headers object and add session_id (backend expects session_id, not session-id)
            const headers = new Headers(options.headers || {});
            headers.set('session_id', this.sessionInfo.sessionId);

            return method.call(this.client, request, { ...options, headers });
          };
        }

        return undefined;
      }
    }) as any;
  }

  getSessionId(): string {
    return this.sessionInfo.sessionId;
  }
}

/**
 * Session manager for handling multiple sessions
 */
export class SessionManager {
  private client: GrpcClient;
  private sessions: Map<string, Session>;
  private sessionInfos: Map<string, SessionInfo>;

  constructor(client: GrpcClient) {
    this.client = client;
    this.sessions = new Map();
    this.sessionInfos = new Map();
  }

  /**
   * Update sessions list
   */
  updateSessions(sessions: SessionInfo[]) {
    sessions.forEach(info => {
      this.sessionInfos.set(info.sessionId, info);
    });
  }

  getSession(sessionId: string): Session {
    if (!this.sessions.has(sessionId)) {
      const sessionInfo = this.sessionInfos.get(sessionId) || { sessionId };
      this.sessions.set(sessionId, new Session(this.client, sessionInfo));
    }
    return this.sessions.get(sessionId)!;
  }

  removeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.sessionInfos.delete(sessionId);
  }

  clearSessions(): void {
    this.sessions.clear();
    this.sessionInfos.clear();
  }

  getAllSessionInfos(): SessionInfo[] {
    return Array.from(this.sessionInfos.values());
  }
}
