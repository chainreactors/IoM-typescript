/**
 * Manager - 统一的服务端状态维护器
 */

import { SessionManager } from './session';

/**
 * Manager 类 - 维护所有服务端状态
 */
export class Manager {
  public sessions: SessionManager;

  constructor(client: any) {
    this.sessions = new SessionManager(client);
  }
}
