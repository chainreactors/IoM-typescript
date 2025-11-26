/**
 * IoM TypeScript SDK
 *
 * Unified gRPC client for IoM C2 Platform
 *
 * @example
 * ```typescript
 * // Basic usage
 * import { GrpcClient } from 'iom-typescript';
 *
 * const client = new GrpcClient({
 *   baseUrl: 'http://localhost:8080/grpc'
 * });
 *
 * const basic = await client.getBasic({});
 * const sessions = await client.getSessions({});
 *
 * // Session-specific usage
 * import { Session } from 'iom-typescript';
 *
 * const session = new Session(client, 'session-123');
 * await session.ls({ path: '/' });
 * await session.ps({});
 *
 * // From auth file
 * const client = GrpcClient.fromAuthFile('./admin.auth');
 * ```
 */

// Core client exports (browser-only)
export {
  GrpcClient,
  type GrpcClientConfig,
  type GrpcClientMethods,
  type TypedGrpcClient,
} from './client';

// Config exports
export {
  parseAuthFile,
  type AuthConfig,
} from './config';

// Session exports
export {
  Session,
  SessionManager,
  type SessionInfo,
} from './session';

// Manager exports
export { Manager } from './manager';

// Note: Node.js specific exports (GrpcClientNode) should be imported from 'iom-typescript/client.node'
// to avoid bundling Node.js code in browser environments

// Utils exports
export {
  parseTaskContext,
  getOutputFromTaskContext,
  extractResponseFromTaskContext,
  extractResponse,
  extractOutput,
  extractError,
  handleMaleficError,
  handleTaskError,
  SpiteError,
  MaleficError,
  TaskError,
} from './utils/spite-handler';

// Re-export Connect types
export type { CallOptions, PromiseClient } from '@connectrpc/connect';

// Re-export service definitions
export { MaliceRPC } from './generated/web/services/clientrpc/service_connect';
export { ListenerRPC } from './generated/web/services/listenerrpc/service_connect';

// Alias for backward compatibility
export { MaliceRPC as MaliceRPCClient } from './generated/web/services/clientrpc/service_connect';

// Re-export protobuf classes (can be used as both types and values)
export {
  Listener,
  Pipeline,
  Profile,
  Website,
  Websites,
  WebContent,
  WebContents,
  REMAgent,
  REMAgents,
  BuildConfig,
  DockerBuildConfig,
  GithubActionBuildConfig,
  SaasBuildConfig,
} from './generated/web/client/clientpb/client_pb';

// Re-export commonly used protobuf types
export type {
  // Basic types
  Empty,
  Basic,
  Int,
  Bin,

  // Auth & Client
  LoginReq,
  Client,
  Clients,

  // Session types
  Session as SessionProto,
  Sessions,
  SessionRequest,
  BasicUpdateSession,

  // Task types
  Task,
  Tasks,
  TaskRequest,
  TaskContext,
  TaskContexts,
  TasksContext,
  Jobs,

  // Context types
  Context,
  Contexts,

  // Profile types
  Profiles,

  // Listener types
  Listeners,
  Polling,
  TLS,

  // Artifact types
  Artifact,
  Artifacts,

  // Certificate types
  Cert,
  Certs,

  // Pipeline types
  Pipelines,

  // File types
  Files,

  // Event types
  Event,
  Events,
  Notify,
  Sync,
  On,

  // Audit types
  Audits,

  // License types
  LicenseInfo,

  // Build types (classes exported above)

  // Encode types
  DLL2Shellcode,
  EXE2Shellcode,
  ShellcodeEncode,
} from './generated/web/client/clientpb/client_pb';

// Re-export implant module types
export type {
  // Request types
  Request,
  Ping,
  Switch,
  Timer,
  TaskCtrl,

  // Execution types
  ExecRequest,
  ExecuteBinary,
  ExecuteAddon,
  PtyRequest,

  // File operations
  UploadRequest,
  DownloadRequest,

  // System operations
  ChownRequest,
  RunAsRequest,

  // Network operations
  CurlRequest,
  PipeRequest,

  // Registry operations
  RegistryRequest,
  RegistryWriteRequest,

  // Service operations
  ServiceRequest,

  // WMI operations
  WmiQueryRequest,
  WmiMethodRequest,

  // Module operations
  LoadModule,
  LoadAddon,

  // Bypass operations
  BypassRequest,

  // Media operations
  FFmpegRequest,

  // Task scheduling
  TaskScheduleRequest,
} from './generated/web/implant/implantpb/module_pb';

// Re-export root types
export type {
  Response,
  Operator,
} from './generated/web/client/rootpb/root_pb';
