# IoM-typescript

IoM-typescript 是 Malice Network 的官方 TypeScript/JavaScript SDK。

## 核心功能

- **双环境支持** - 浏览器 (gRPC-Web) 和 Node.js (gRPC)
- **类型安全** - 完整的 TypeScript 类型定义
- **动态 API** - 自动转发所有 gRPC 方法
- **会话管理** - 便捷的会话操作封装
- **错误处理** - 统一的错误处理机制

## 安装

```bash
npm install iom-typescript
```

## 快速开始

### 浏览器环境 (gRPC-Web)

```typescript
import { GrpcClient } from 'iom-typescript';

const client = new GrpcClient({
  baseUrl: 'http://localhost:8080/grpc'
});

// 获取会话列表
const sessions = await client.getSessions({});

// 使用会话
import { Session } from 'iom-typescript';
const session = new Session(client, 'session-id');
await session.ls({ path: '/' });
```

### Node.js 环境

```typescript
import { GrpcClient } from 'iom-typescript/client.node';
import { parseAuthFile } from 'iom-typescript';

// 从认证文件加载
const client = GrpcClient.fromAuthFile('./admin.auth');

// 获取基本信息
const basic = await client.getBasic({});
console.log(`服务器版本: ${basic.version}`);
```

## 基础用法

### 1. 连接服务器

```typescript
import { GrpcClient, parseAuthFile } from 'iom-typescript';

// 方式一：使用认证文件（推荐）
const config = parseAuthFile('./admin.auth');
const client = GrpcClient.fromAuthFile('./admin.auth');

// 方式二：手动配置
const client = new GrpcClient({
  baseUrl: 'https://localhost:5004/grpc',
  defaultHeaders: {
    'Authorization': 'Bearer token'
  }
});
```

### 2. 会话管理

```typescript
import { SessionManager } from 'iom-typescript';

// 创建会话管理器
const manager = new SessionManager(client);

// 获取所有会话
await manager.updateSessions();
const sessions = manager.getSessions();

// 获取特定会话
const session = manager.getSession('session-id');
```

### 3. 执行任务

```typescript
import { Session } from 'iom-typescript';

const session = new Session(client, 'session-id');

// 文件系统操作
await session.ls({ path: '/' });
await session.pwd({});

// 进程管理
await session.ps({});

// 命令执行
await session.execute({
  path: '/bin/bash',
  args: ['-c', 'ls -la']
});
```

## 项目结构

```
iom-typescript/
├── src/
│   ├── index.ts              # 主导出文件（浏览器）
│   ├── client.ts             # gRPC-Web 客户端
│   ├── client.node.ts        # Node.js gRPC 客户端
│   ├── config.ts             # 配置解析
│   ├── session.ts            # 会话封装
│   ├── manager.ts            # 管理器
│   ├── utils/
│   │   └── spite-handler.ts  # 错误处理
│   └── generated/            # 生成的 protobuf 代码
│       ├── web/              # 浏览器版本
│       └── node/             # Node.js 版本
├── proto/                    # protobuf 定义文件
├── dist/                     # 编译输出
├── package.json
├── tsconfig.json
└── buf.gen.yaml             # protobuf 生成配置
```

## 错误处理

```typescript
import {
  SpiteError,
  MaleficError,
  TaskError,
  extractError
} from 'iom-typescript';

try {
  const result = await session.ls({ path: '/' });
  const output = extractOutput(result);
  console.log(output);
} catch (error) {
  if (error instanceof TaskError) {
    console.error('任务执行失败:', error.message);
  }
}
```

## 开发

```bash
# 安装依赖
npm install

# 生成 protobuf 代码
npm run proto

# 构建
npm run build

# 类型检查
npm run type-check
```

## 相关链接

- [Malice Network](https://github.com/chainreactors/malice-network)
- [文档](https://chainreactors.github.io/wiki/IoM/)
- [Issues](https://github.com/chainreactors/malice-network/issues)

## License

MIT
