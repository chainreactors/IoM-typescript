/**
 * Session-specific API wrapper for IoM Platform
 */

import type { GrpcClient } from './client';

/**
 * Session 信息
 */
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

        // sync_ 前缀: 自动等待 Task 完成，返回 TaskContext
        if (propStr.startsWith('sync_')) {
          const actualMethod = propStr.substring(5);
          const method = (this.client as any)[actualMethod];

          if (typeof method === 'function') {
            return async (request: any = {}, options: any = {}) => {
              // 创建 Headers 对象并添加 session_id (后端期望 session_id 而不是 session-id)
              const headers = new Headers(options.headers || {});
              headers.set('session_id', this.sessionInfo.sessionId);

              const task = await method.call(this.client, request, { ...options, headers });

              if (task && typeof task === 'object' && 'taskId' in task) {
                const waitMethod = (this.client as any)['waitTaskFinish'];
                if (waitMethod) {
                  // 返回完整的 TaskContext，让调用者使用 Spite Handler 处理
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

        // 普通方法: 注入 session_id
        const method = (this.client as any)[propStr];
        if (typeof method === 'function') {
          return async (request: any = {}, options: any = {}) => {
            // 创建 Headers 对象并添加 session_id (后端期望 session_id 而不是 session-id)
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
   * 更新 sessions 列表
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
