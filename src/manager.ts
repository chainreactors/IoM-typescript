/**
 * Manager - Unified server status maintainer
 */

import { SessionManager } from './session';

/**
 * Manager class - Maintains all server status
 */
export class Manager {
  public sessions: SessionManager;

  constructor(client: any) {
    this.sessions = new SessionManager(client);
  }
}
