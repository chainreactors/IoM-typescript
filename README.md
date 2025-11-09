# C2 Platform Shared gRPC Client

## 概述

`iom-typescript` 是一个共享的 gRPC 客户端包，用于 C2 平台的 IoM-gui (VSCode 扩展) 和 iom-webui (Next.js 应用) 项目。

## 包结构

```
packages/iom-typescript/
├── package.json          # 包配置文件
├── tsconfig.json         # TypeScript 配置
├── src/
│   ├── index.ts          # 主导出文件
│   ├── client.ts         # gRPC 客户端类
│   └── proto/            # 生成的 protobuf 类型
├── proto/                # 原始 proto 文件
└── scripts/
    └── generate-proto.js # proto 生成脚本
```

## 安装

### 在工作区内引用

在消费端的 `package.json` 中添加依赖：

```jsonc
{
  "dependencies": {
    "iom-typescript": "workspace:*"
  }
}
```

工作区安装完成后即可直接 `import`。

### 单独构建

```bash
npm run build --workspace iom-typescript
```

## 基本用法

### 1. 创建客户端实例

```typescript
import { GrpcClient, AuthConfig } from 'iom-typescript';

const client = new GrpcClient({
    onLog: (message: string) => console.log(message),
    timeout: 10,
    maxMessageSize: 50 * 1024 * 1024 // 50MB
});
```

### 2. 连接到服务器

```typescript
const config: AuthConfig = {
    operator: 'admin',
    host: 'localhost',
    port: 31337,
    type: 'mtls',
    ca: 'base64_encoded_ca_cert',
    cert: 'base64_encoded_client_cert',
    key: 'base64_encoded_client_key'
};

try {
    await client.connect(config, 'config_file_name');
    console.log('连接成功');
} catch (error) {
    console.error('连接失败:', error);
}
```

### 3. 使用 RPC 调用

```typescript
if (client.isConnected()) {
    const rpc = client.getRpc();
    
    // 使用 malice 客户端
    rpc.malice.getSessions(Empty, (error, response) => {
        if (error) {
            console.error('RPC 调用失败:', error);
        } else {
            console.log('Sessions:', response);
        }
    });
    
    // 使用 listener 客户端
    rpc.listener.getListeners(Empty, (error, response) => {
        if (error) {
            console.error('RPC 调用失败:', error);
        } else {
            console.log('Listeners:', response);
        }
    });
}
```

### 4. 断开连接

```typescript
client.disconnect();
```

## 在 IoM-gui (VSCode Extension) 中的用法

```typescript
// src/grpc/client.ts
import { GrpcClient as SharedGrpcClient, AuthConfig } from 'iom-typescript';

export class GrpcClient {
    private sharedClient: SharedGrpcClient;

    constructor(outputChannel: vscode.OutputChannel) {
        this.sharedClient = new SharedGrpcClient({
            onLog: (message: string) => outputChannel.appendLine(message)
        });
    }

    async connect(config: AuthConfig, authFile: string) {
        return this.sharedClient.connect(config, authFile);
    }

    getRpc() {
        return this.sharedClient.getRpc();
    }
}
```

## 在 iom-webui (Next.js) 中的用法

```typescript
// components/grpc-connection.tsx
'use client';
import { GrpcClient, AuthConfig } from 'iom-typescript';

export default function GrpcConnection() {
    const [client, setClient] = useState<GrpcClient | null>(null);

    useEffect(() => {
        const grpcClient = new GrpcClient({
            onLog: (message) => console.log(message)
        });
        setClient(grpcClient);
        
        return () => grpcClient.disconnect();
    }, []);

    // ... 组件逻辑
}
```

## 可用的类型

包导出所有必要的 protobuf 生成类型：

- `Session`, `Sessions`
- `Pipeline`, `Pipelines` 
- `Listener`, `Listeners`
- `Artifact`, `Artifacts`
- `Website`, `Websites`
- `Task`, `Tasks`
- `Context`, `Contexts`
- `Cert`, `Certs`
- `MaliceRPCClient`, `ListenerRPCClient`
- `AuthConfig`
- `Empty`
- 等等...

## 更新 Proto 文件

1. 更新 `proto/` 目录中的 `.proto` 文件
2. 运行生成脚本：
```bash
npm run proto
```
3. 重新构建包：
```bash
npm run build
```

## 配置选项

`GrpcClientConfig` 接口支持以下选项：

- `onLog?: (message: string) => void` - 日志回调函数
- `timeout?: number` - 连接超时时间（秒），默认 10 秒
- `maxMessageSize?: number` - 最大消息大小，默认 50MB

## 注意事项

1. 确保 gRPC 服务器支持 mTLS 认证
2. CA、证书和私钥需要是 base64 编码的字符串
3. 服务器必须配置正确的 SSL/TLS 设置
4. 在生产环境中使用适当的证书验证
