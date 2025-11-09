const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const protoDir = path.join(__dirname, '..', 'proto');
const srcProtoDir = path.join(__dirname, '..', 'src');

// 确保输出目录存在
if (!fs.existsSync(srcProtoDir)) {
    fs.mkdirSync(srcProtoDir, { recursive: true });
}

// 生成 protobuf TypeScript 类型
function generateProtoTypes() {
    const protoFiles = [
        'client/clientpb/client.proto',
        'client/rootpb/root.proto',
        'implant/implantpb/implant.proto',
        'implant/implantpb/module.proto',
        'services/clientrpc/service.proto',
        'services/listenerrpc/service.proto'
    ];

    protoFiles.forEach(protoFile => {
        const protoPath = path.join(protoDir, protoFile);
        const outputDir = path.dirname(path.join(srcProtoDir, protoFile.replace('.proto', '.ts')));
        
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        try {
            console.log(`Generating types for ${protoFile}`);
            
            // 使用 ts-proto 生成 TypeScript 文件
            // const command = `protoc --plugin=protoc-gen-ts_proto=.\\node_modules\\.bin\\protoc-gen-ts_proto.cmd --ts_proto_out=${srcProtoDir} --ts_proto_opt=esModuleInterop=true --ts_proto_opt=forceLong=long --ts_proto_opt=useOptionals=messages --proto_path=${protoDir} ${protoPath}`;
            const command = `protoc --plugin=protoc-gen-ts_proto=.\\node_modules\\.bin\\protoc-gen-ts_proto.cmd --ts_proto_out=${srcProtoDir} --ts_proto_opt=esModuleInterop=true,outputServices=grpc-js,useExactTypes=false --ts_proto_opt=forceLong=long --ts_proto_opt=useOptionals=messages --proto_path=${protoDir} ${protoPath}`;

            execSync(command, { stdio: 'inherit' });
            
        } catch (error) {
            console.error(`Error generating ${protoFile}:`, error.message);
        }
    });
}

generateProtoTypes();
console.log('Proto generation completed');