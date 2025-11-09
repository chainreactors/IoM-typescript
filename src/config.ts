/**
 * Configuration utilities for IoM Platform
 */

import * as fs from 'fs';
import * as yaml from 'js-yaml';

/**
 * Auth configuration for connecting to gRPC server
 */
export interface AuthConfig {
  host: string;
  port: number;
  ca: string;
  cert: string;
  key: string;
  operator?: string;
  type?: string;
}

/**
 * Parse auth file (YAML format)
 */
export function parseAuthFile(authFilePath: string): AuthConfig {
  try {
    const authFileContent = fs.readFileSync(authFilePath, 'utf8');
    const authData = yaml.load(authFileContent) as any;

    if (!authData.host || !authData.port || !authData.ca ||
        !authData.cert || !authData.key) {
      throw new Error('Invalid auth file format: missing required fields (host, port, ca, cert, key)');
    }

    return {
      host: authData.host,
      port: authData.port,
      ca: authData.ca,
      cert: authData.cert,
      key: authData.key,
      operator: authData.operator,
      type: authData.type
    };
  } catch (error) {
    throw new Error(`Failed to parse auth file: ${error}`);
  }
}
