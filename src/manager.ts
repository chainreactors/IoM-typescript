/**
 * Manager - Unified server status maintainer
 */

import { SessionManager } from './session';

/**
 * Manager class - Maintains all server status
 */
export class Manager {
  public sessions: SessionManager;
  public pipelines: PipelineManager;
  public websites: WebsiteManager;
  public artifacts: ArtifactManager;
  public certificates: CertificateManager;
  private client: any = null;

  constructor(client?: any) {
    // If client is provided, use it; otherwise create SessionManager with null (for backward compatibility)
    this.client = client || null;
    this.sessions = new SessionManager(this.client || (null as any));
    this.pipelines = new PipelineManager(this);
    this.websites = new WebsiteManager(this);
    this.artifacts = new ArtifactManager(this);
    this.certificates = new CertificateManager(this);
  }

  public async connect(authConfig: any, authFile: string): Promise<void> {
    // Import dynamically to avoid circular dependency
    const { GrpcClient } = await import('./client.node');
    this.client = GrpcClient.fromAuthFile(authFile, {
      onLog: (message: string) => console.log(message),
      timeout: 10
    });
    this.sessions = new SessionManager(this.client as any);
    // Update managers with new client
    this.pipelines = new PipelineManager(this);
    this.websites = new WebsiteManager(this);
    this.artifacts = new ArtifactManager(this);
    this.certificates = new CertificateManager(this);
  }

  public getClient(): any {
    if (!this.client) {
      throw new Error('Manager not connected. Call connect() first.');
    }
    return this.client;
  }

  public getListenerClient(): any {
    const client = this.getClient();
    return client.getListenerClient();
  }

  public getMaliceClient(): any {
    const client = this.getClient();
    return client.getMaliceClient();
  }
}

/**
 * Pipeline Manager - Handles pipeline operations
 */
class PipelineManager {
  constructor(private manager: Manager) {}

  async list(): Promise<any[]> {
    const listenerClient = this.manager.getListenerClient();
    const response = await listenerClient.listPipelines({
      id: '',
      ip: '',
      active: false,
      pipelines: { pipelines: [] }
    });
    // response is Pipelines type, which has a pipelines array property
    const pipelines = response.pipelines || [];
    console.log(`[PipelineManager] listPipelines returned ${pipelines.length} pipelines`);
    return pipelines;
  }

  async start(name: string, listenerId: string, pipeline?: any): Promise<void> {
    const listenerClient = this.manager.getListenerClient();
    await listenerClient.startPipeline({
      listenerId,
      name,
      pipeline: pipeline || {},
      certName: ''
    });
  }

  async stop(name: string, listenerId: string, pipeline?: any): Promise<void> {
    const listenerClient = this.manager.getListenerClient();
    await listenerClient.stopPipeline({
      listenerId,
      name,
      pipeline: pipeline || {},
      certName: ''
    });
  }

  async create(pipeline: any): Promise<void> {
    const listenerClient = this.manager.getListenerClient();
    await listenerClient.registerPipeline(pipeline);
  }

  async delete(name: string, listenerId: string): Promise<void> {
    const listenerClient = this.manager.getListenerClient();
    await listenerClient.deletePipeline({
      listenerId,
      name,
      pipeline: {},
      certName: ''
    });
  }

  async getListeners(): Promise<any[]> {
    const maliceClient = this.manager.getMaliceClient();
    const response = await maliceClient.getListeners({});
    return response.listeners || [];
  }
}

/**
 * Website Manager - Handles website operations
 */
class WebsiteManager {
  constructor(private manager: Manager) {}

  async list(): Promise<any[]> {
    const listenerClient = this.manager.getListenerClient();
    const response = await listenerClient.listWebsites({
      id: '',
      ip: '',
      active: false,
      pipelines: { pipelines: [] }
    });
    // listWebsites returns Pipelines type, extract the pipelines array
    // Note: websites are returned as pipelines with web body type
    const websites = response.pipelines || [];
    console.log(`[WebsiteManager] listWebsites returned ${websites.length} websites`);
    return websites;
  }

  async start(name: string, listenerId: string, pipeline?: any): Promise<void> {
    const listenerClient = this.manager.getListenerClient();
    await listenerClient.startWebsite({
      name,
      listenerId,
      pipeline: pipeline || {}
    });
  }

  async stop(name: string, listenerId: string): Promise<void> {
    const listenerClient = this.manager.getListenerClient();
    await listenerClient.stopWebsite({
      name,
      listenerId
    });
  }

  async create(website: any): Promise<void> {
    const listenerClient = this.manager.getListenerClient();
    await listenerClient.registerWebsite(website);
  }

  async delete(name: string, listenerId: string): Promise<void> {
    const listenerClient = this.manager.getListenerClient();
    await listenerClient.deleteWebsite({
      name,
      listenerId
    });
  }

  async addContent(content: any): Promise<void> {
    const listenerClient = this.manager.getListenerClient();
    await listenerClient.addWebContent(content);
  }

  async updateContent(content: any): Promise<void> {
    const listenerClient = this.manager.getListenerClient();
    await listenerClient.updateWebContent(content);
  }

  async removeContent(contentRef: any): Promise<void> {
    const listenerClient = this.manager.getListenerClient();
    await listenerClient.removeWebContent(contentRef);
  }

  async getContents(website: any): Promise<any[]> {
    const listenerClient = this.manager.getListenerClient();
    const response = await listenerClient.listWebContents(website);
    return response.contents || [];
  }
}

/**
 * Artifact Manager - Handles artifact operations
 */
class ArtifactManager {
  constructor(private manager: Manager) {}

  async list(): Promise<any[]> {
    const maliceClient = this.manager.getMaliceClient();
    const response = await maliceClient.listArtifact({});
    // response is Artifacts type, which has an artifacts array property
    const artifacts = response.artifacts || [];
    console.log(`[ArtifactManager] listArtifact returned ${artifacts.length} artifacts`);
    return artifacts;
  }

  async download(name: string, id: number): Promise<any> {
    const maliceClient = this.manager.getMaliceClient();
    const response = await maliceClient.downloadArtifact({
      name,
      id
    });
    return response;
  }

  async delete(name: string): Promise<void> {
    const maliceClient = this.manager.getMaliceClient();
    await maliceClient.deleteArtifact({
      name,
      id: 0
    });
  }

  async getLog(name: string, lines: number = 100): Promise<string> {
    // This might need to be implemented differently based on the actual API
    const maliceClient = this.manager.getMaliceClient();
    // Assuming there's a method for this, adjust as needed
    return '';
  }

  async build(config: any): Promise<any> {
    const maliceClient = this.manager.getMaliceClient();
    const response = await maliceClient.buildArtifact(config);
    return response;
  }

  async getProfile(artifactId: number, artifactName: string): Promise<any> {
    const maliceClient = this.manager.getMaliceClient();
    const response = await maliceClient.getArtifactProfile({
      name: artifactName,
      id: artifactId
    });
    return response;
  }
}

/**
 * Certificate Manager - Handles certificate operations
 */
class CertificateManager {
  constructor(private manager: Manager) {}

  async list(): Promise<any[]> {
    const maliceClient = this.manager.getMaliceClient();
    const response = await maliceClient.getAllCertificates({});
    // response is Certs type, which has a certs array property
    const certificates = response.certs || [];
    console.log(`[CertificateManager] getAllCertificates returned ${certificates.length} certificates`);
    return certificates;
  }

  async generateSelf(pipeline: any): Promise<void> {
    const listenerClient = this.manager.getListenerClient();
    await listenerClient.generateSelfCert(pipeline);
  }

  async generateAcme(pipeline: any): Promise<void> {
    const listenerClient = this.manager.getListenerClient();
    await listenerClient.generateAcmeCert(pipeline);
  }

  async delete(name: string): Promise<void> {
    const maliceClient = this.manager.getMaliceClient();
    await maliceClient.deleteCertificate({
      name,
      type: '',
      cert: '',
      key: ''
    });
  }

  async download(name: string): Promise<any> {
    const maliceClient = this.manager.getMaliceClient();
    const response = await maliceClient.downloadCertificate({
      name,
      type: '',
      cert: '',
      key: ''
    });
    return response;
  }

  async update(certData: any): Promise<void> {
    const maliceClient = this.manager.getMaliceClient();
    await maliceClient.updateCertificate(certData);
  }
}
