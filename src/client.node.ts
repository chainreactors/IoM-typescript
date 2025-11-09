/**
 * Node.js gRPC Client for IoM Platform
 * Supports both native gRPC and gRPC-Web transports
 */

import { createPromiseClient, type PromiseClient, type CallOptions, type Transport } from '@connectrpc/connect';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import { createGrpcTransport } from '@connectrpc/connect-node';
import { MaliceRPC } from './generated/web/services/clientrpc/service_connect';
import { ListenerRPC } from './generated/web/services/listenerrpc/service_connect';
import { parseAuthFile, type AuthConfig } from './config';

export type TransportType = 'grpc' | 'grpc-web';

export interface GrpcClientConfig {
  transport?: TransportType;
  baseUrl?: string;
  auth?: AuthConfig;
  onLog?: (message: string) => void;
  timeout?: number;
  defaultHeaders?: Record<string, string>;
}

export class GrpcClient {
  private maliceClient: PromiseClient<typeof MaliceRPC>;
  private listenerClient: PromiseClient<typeof ListenerRPC>;
  private config: GrpcClientConfig;

  constructor(config: GrpcClientConfig) {
    this.config = config;
    const transport = this.createTransport(config);
    this.maliceClient = createPromiseClient(MaliceRPC, transport);
    this.listenerClient = createPromiseClient(ListenerRPC, transport);
    this.log(`GrpcClient initialized with transport: ${config.transport || 'grpc-web'}`);

    return new Proxy(this, {
      get: (target, prop: string | symbol) => {
        if (typeof prop === 'string' && (prop in target || prop.startsWith('_'))) {
          return (target as any)[prop];
        }

        const methodName = typeof prop === 'string' ? prop : String(prop);

        if (methodName in this.maliceClient) {
          this.log(`Forwarding ${methodName} to MaliceRPC`);
          return (...args: any[]) => {
            const [request, callOptions] = args;
            const mergedOptions = this.mergeCallOptions(callOptions);
            return (this.maliceClient as any)[methodName](request, mergedOptions);
          };
        }

        if (methodName in this.listenerClient) {
          this.log(`Forwarding ${methodName} to ListenerRPC`);
          return (...args: any[]) => {
            const [request, callOptions] = args;
            const mergedOptions = this.mergeCallOptions(callOptions);
            return (this.listenerClient as any)[methodName](request, mergedOptions);
          };
        }

        throw new Error(`Method '${methodName}' not found on MaliceRPC or ListenerRPC`);
      }
    }) as any;
  }

  private createTransport(config: GrpcClientConfig): Transport {
    const transportType = config.transport || 'grpc-web';

    if (transportType === 'grpc') {
      if (!config.auth) {
        throw new Error('Auth configuration is required for native gRPC transport');
      }

      return createGrpcTransport({
        baseUrl: `https://${config.auth.host}:${config.auth.port}`,
        httpVersion: '2',
        nodeOptions: {
          ca: Buffer.from(config.auth.ca),
          cert: Buffer.from(config.auth.cert),
          key: Buffer.from(config.auth.key),
          rejectUnauthorized: false,
        },
      });
    } else {
      if (!config.baseUrl) {
        throw new Error('baseUrl is required for gRPC-Web transport');
      }

      return createGrpcWebTransport({
        baseUrl: config.baseUrl,
      });
    }
  }

  public getMaliceClient(): PromiseClient<typeof MaliceRPC> {
    return this.maliceClient;
  }

  public getListenerClient(): PromiseClient<typeof ListenerRPC> {
    return this.listenerClient;
  }

  public createCallOptions(overrides?: Partial<CallOptions>): CallOptions {
    return this.mergeCallOptions(overrides);
  }

  private mergeCallOptions(callOptions?: Partial<CallOptions>): CallOptions {
    const headers = new Headers();

    if (this.config.defaultHeaders) {
      Object.entries(this.config.defaultHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });
    }

    if (callOptions?.headers) {
      Object.entries(callOptions.headers).forEach(([key, value]) => {
        headers.set(key, String(value));
      });
    }

    console.log('[GrpcClient] Outgoing headers:', Array.from(headers.entries()));

    const options: CallOptions = {
      ...callOptions,
      headers,
    };

    if (this.config.timeout && !callOptions?.timeoutMs) {
      options.timeoutMs = this.config.timeout;
    }

    return options;
  }

  private log(message: string): void {
    if (this.config.onLog) {
      this.config.onLog(message);
    }
  }

  static fromAuthFile(authFilePath: string, overrides?: Partial<GrpcClientConfig>): GrpcClient {
    const authConfig = parseAuthFile(authFilePath);

    return new GrpcClient({
      transport: 'grpc',
      auth: authConfig,
      ...overrides,
    });
  }
}

export type GrpcClientMethods = PromiseClient<typeof MaliceRPC> & PromiseClient<typeof ListenerRPC>;
export type TypedGrpcClient = GrpcClient & GrpcClientMethods;
