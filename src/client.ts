/**
 * Browser gRPC Client for IoM Platform
 * Only supports gRPC-Web transport
 */

import { createPromiseClient, type PromiseClient, type CallOptions, type Transport } from '@connectrpc/connect';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import { MaliceRPC } from './generated/web/services/clientrpc/service_connect';
import { ListenerRPC } from './generated/web/services/listenerrpc/service_connect';

export interface GrpcClientConfig {
  baseUrl: string;
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
    this.log('GrpcClient initialized with gRPC-Web transport');

    // Return Proxy for dynamic method forwarding
    return new Proxy(this, {
      get: (target, prop: string | symbol) => {
        // Allow access to internal properties
        if (typeof prop === 'string' && (prop in target || prop.startsWith('_'))) {
          return (target as any)[prop];
        }

        // Convert camelCase method name (if needed)
        const methodName = typeof prop === 'string' ? prop : String(prop);

        // Check if method exists on maliceClient
        if (methodName in this.maliceClient) {
          this.log(`Forwarding ${methodName} to MaliceRPC`);
          return (...args: any[]) => {
            // Merge default headers with call-specific options
            const [request, callOptions] = args;
            const mergedOptions = this.mergeCallOptions(callOptions);
            return (this.maliceClient as any)[methodName](request, mergedOptions);
          };
        }

        // Check if method exists on listenerClient
        if (methodName in this.listenerClient) {
          this.log(`Forwarding ${methodName} to ListenerRPC`);
          return (...args: any[]) => {
            const [request, callOptions] = args;
            const mergedOptions = this.mergeCallOptions(callOptions);
            return (this.listenerClient as any)[methodName](request, mergedOptions);
          };
        }

        // Method not found
        throw new Error(`Method '${methodName}' not found on MaliceRPC or ListenerRPC`);
      }
    }) as any;
  }

  private createTransport(config: GrpcClientConfig): Transport {
    return createGrpcWebTransport({
      baseUrl: config.baseUrl,
    });
  }

  /**
   * Get the MaliceRPC client directly (for advanced usage)
   */
  public getMaliceClient(): PromiseClient<typeof MaliceRPC> {
    return this.maliceClient;
  }

  /**
   * Get the ListenerRPC client directly (for advanced usage)
   */
  public getListenerClient(): PromiseClient<typeof ListenerRPC> {
    return this.listenerClient;
  }

  /**
   * Create call options with default headers and timeout
   */
  public createCallOptions(overrides?: Partial<CallOptions>): CallOptions {
    return this.mergeCallOptions(overrides);
  }

  /**
   * Merge default headers with call-specific options
   */
  private mergeCallOptions(callOptions?: Partial<CallOptions>): CallOptions {
    const headers = new Headers();

    // Add default headers
    if (this.config.defaultHeaders) {
      Object.entries(this.config.defaultHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });
    }

    // Merge with provided headers
    if (callOptions?.headers) {
      Object.entries(callOptions.headers).forEach(([key, value]) => {
        headers.set(key, String(value));
      });
    }

    // Debug log
    console.log('[GrpcClient] Outgoing headers:', Array.from(headers.entries()));

    const options: CallOptions = {
      ...callOptions,
      headers,
    };

    // Add timeout if configured and not provided
    if (this.config.timeout && !callOptions?.timeoutMs) {
      options.timeoutMs = this.config.timeout;
    }

    return options;
  }

  /**
   * Log message (if logging is enabled)
   */
  private log(message: string): void {
    if (this.config.onLog) {
      this.config.onLog(message);
    }
  }

}

export type GrpcClientMethods = PromiseClient<typeof MaliceRPC> & PromiseClient<typeof ListenerRPC>;
export type TypedGrpcClient = GrpcClient & GrpcClientMethods;
