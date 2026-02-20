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

        // Check if client is null or undefined
        if (!target.client) {
          throw new Error(`Session client is not initialized. Cannot access property '${String(prop)}'`);
        }

        const propStr = String(prop);

        // sync_ prefix: automatically wait for task completion, return TaskContext
        if (propStr.startsWith('sync_')) {
          const actualMethod = propStr.substring(5);
          const method = (target.client as any)[actualMethod];

          if (typeof method === 'function') {
            return async (request: any = {}, options: any = {}) => {
              // Create headers object and add session_id (backend expects session_id, not session-id)
              // Use plain object instead of Headers object, as client.node.ts mergeCallOptions expects Record<string, string>
              const headers: Record<string, string> = {};
              if (options.headers) {
                if (options.headers instanceof Headers) {
                  options.headers.forEach((value: string, key: string) => {
                    headers[key] = value;
                  });
                } else {
                  Object.assign(headers, options.headers);
                }
              }
              headers['session_id'] = target.sessionInfo.sessionId;

              const task = await method.call(target.client, request, { ...options, headers });

              if (task && typeof task === 'object' && 'taskId' in task) {
                const waitMethod = (target.client as any)['waitTaskFinish'];
                if (waitMethod) {
                  // Return complete TaskContext, let caller use Spite Handler to process
                  // Use the same timeout from options, or default to 60 seconds for waiting
                  const waitTimeoutMs = options.timeoutMs || 60000;
                  const taskContext = await waitMethod.call(target.client,
                    { taskId: task.taskId, sessionId: task.sessionId || target.sessionInfo.sessionId },
                    { headers, timeoutMs: waitTimeoutMs }
                  );
                  return taskContext;
                }
              }
              return task;
            };
          }
        }

        // Normal method: inject session_id
        const method = (target.client as any)[propStr];
        if (typeof method === 'function') {
          return async (request: any = {}, options: any = {}) => {
            // Create headers object and add session_id (backend expects session_id, not session-id)
            // Use plain object instead of Headers object, as client.node.ts mergeCallOptions expects Record<string, string>
            const headers: Record<string, string> = {};
            if (options.headers) {
              if (options.headers instanceof Headers) {
                options.headers.forEach((value: string, key: string) => {
                  headers[key] = value;
                });
              } else {
                Object.assign(headers, options.headers);
              }
            }
            headers['session_id'] = target.sessionInfo.sessionId;

            return method.call(target.client, request, { ...options, headers });
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

  /**
   * Get all sessions list
   */
  async list(): Promise<SessionInfo[]> {
    if (!this.client) {
      throw new Error('SessionManager client is not initialized');
    }
    const maliceClient = this.client.getMaliceClient();
    const response = await maliceClient.getSessions({ sessionId: '', all: true });
    const sessions = response.sessions || [];
    // Update internal session infos
    this.updateSessions(sessions);
    return sessions;
  }

  /**
   * Get contexts for a specific session and type
   */
  async getContexts(type: string, sessionId: string): Promise<any[]> {
    if (!this.client) {
      throw new Error('SessionManager client is not initialized');
    }
    const maliceClient = this.client.getMaliceClient();
    const response = await maliceClient.getContexts({
      type,
      session: {
        sessionId
      }
    });
    // response is Contexts type, which has a contexts array property
    return response.contexts || [];
  }

  /**
   * Get tasks for a specific session
   */
  async getTasks(sessionId: string, all = false): Promise<any[]> {
    if (!this.client) {
      throw new Error('SessionManager client is not initialized');
    }
    const maliceClient = this.client.getMaliceClient();
    const response = await maliceClient.getTasks({
      sessionId,
      all
    });
    return response.tasks || [];
  }

  /**
   * Execute a task for a specific session and wait for completion
   * This method automatically gets the session and calls the appropriate sync_ method
   */
  async executeTask(taskRequest: {
    name: string;
    input?: string;
    args?: any[];
    params?: any;
    bin?: Uint8Array | Buffer;
  }, sessionId: string): Promise<any> {
    if (!this.client) {
      throw new Error('SessionManager client is not initialized');
    }
    
    // Get or create the session
    const session = this.getSession(sessionId);
    
    // Convert Buffer to Uint8Array if needed
    const bin = taskRequest.bin instanceof Buffer 
      ? new Uint8Array(taskRequest.bin) 
      : taskRequest.bin || new Uint8Array();
    
    // Build Request object
    const request = {
      name: taskRequest.name,
      input: taskRequest.input || '',
      args: taskRequest.args || [],
      params: taskRequest.params || {},
      bin: bin
    };
    
    // Map task names to their corresponding sync_ methods
    // For tasks that have specific RPC methods, use the sync_ prefix
    const taskNameToMethod: Record<string, string> = {
      'netstat': 'sync_netstat',
      'service_list': 'sync_serviceList',
      'ls': 'sync_ls',
      'cat': 'sync_cat',
      'mkdir': 'sync_mkdir',
      'rm': 'sync_rm',
      'mv': 'sync_mv',
      'cp': 'sync_cp',
      'cd': 'sync_cd',
      'pwd': 'sync_pwd',
      'enum_drivers': 'sync_enumDrivers',
      // Add more mappings as needed
    };
    
    const methodName = taskNameToMethod[taskRequest.name.toLowerCase()];
    
    if (methodName && typeof (session as any)[methodName] === 'function') {
      // Use the specific sync_ method with increased timeout
      // Some operations like netstat and service_list can take longer
      // Set timeout to 60 seconds (60000ms) for these operations
      const timeoutMs = 60000; // 60 seconds
      return await (session as any)[methodName](request, { timeoutMs });
    } else {
      // Fallback: try to use a generic method if available
      // For now, throw an error for unsupported task names
      throw new Error(`Task '${taskRequest.name}' is not supported. Supported tasks: ${Object.keys(taskNameToMethod).join(', ')}`);
    }
  }
}
