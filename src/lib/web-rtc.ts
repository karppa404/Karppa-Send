import SimplePeer from 'simple-peer';

export interface FileTransferData {
  type: 'file-metadata' | 'file-chunk' | 'file-complete';
  fileName?: string;
  fileSize?: number;
  totalChunks?: number;
  chunkIndex?: number;
  data?: string; // Base64 encoded data
}

export interface TransferStats {
  bytesTransferred: number;
  totalBytes: number;
  speed: number; // bytes per second
  startTime: number;
  isActive: boolean;
  direction: 'sending' | 'receiving';
  progress: number; // percentage
}

export interface ConnectionInfo {
  sessionId: string;
  isInitiator: boolean;
  isConnected: boolean;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'failed';
}

export class WebRTCService {
  private peer: SimplePeer.Instance | null = null;
  private sessionId: string = '';
  private isInitiator: boolean = false;
  private connectionInfo: ConnectionInfo;
  
  // Event callbacks
  private onPeerConnected: (() => void) | null = null;
  private onPeerDisconnected: (() => void) | null = null;
  private onFileReceived: ((fileName: string, data: ArrayBuffer) => void) | null = null;
  private onTransferProgress: ((stats: TransferStats) => void) | null = null;
  private onConnectionStateChange: ((info: ConnectionInfo) => void) | null = null;
  
  private currentTransfer: {
    fileName: string;
    fileSize: number;
    totalChunks: number;
    receivedChunks: Map<number, ArrayBuffer>;
    stats: TransferStats;
  } | null = null;

  // Store signaling data for manual exchange
  private signalData: any = null;
  private onSignalData: ((data: any) => void) | null = null;

  constructor() {
    this.connectionInfo = {
      sessionId: '',
      isInitiator: false,
      isConnected: false,
      connectionState: 'disconnected'
    };
  }

  private updateConnectionState(state: ConnectionInfo['connectionState']) {
    this.connectionInfo.connectionState = state;
    this.connectionInfo.isConnected = state === 'connected';
    
    if (this.onConnectionStateChange) {
      this.onConnectionStateChange({ ...this.connectionInfo });
    }
  }

  async createSession(sessionId: string): Promise<void> {
    this.sessionId = sessionId;
    this.isInitiator = true;
    this.connectionInfo.sessionId = sessionId;
    this.connectionInfo.isInitiator = true;
    
    this.updateConnectionState('connecting');
    
    this.peer = new SimplePeer({
      initiator: true,
      trickle: false,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      }
    });

    this.setupPeerEvents();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Session creation timeout'));
      }, 30000);

      this.peer!.on('signal', (data) => {
        clearTimeout(timeout);
        this.signalData = data;
        if (this.onSignalData) {
          this.onSignalData(data);
        }
        resolve();
      });
    });
  }

  async joinSession(sessionId: string): Promise<void> {
    this.sessionId = sessionId;
    this.isInitiator = false;
    this.connectionInfo.sessionId = sessionId;
    this.connectionInfo.isInitiator = false;
    
    this.updateConnectionState('connecting');
    
    this.peer = new SimplePeer({
      initiator: false,
      trickle: false,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      }
    });

    this.setupPeerEvents();
    
    return new Promise((resolve) => {
      this.peer!.on('signal', (data) => {
        this.signalData = data;
        if (this.onSignalData) {
          this.onSignalData(data);
        }
        resolve();
      });
    });
  }

  acceptSignal(signalData: any) {
    if (this.peer && signalData) {
      try {
        this.peer.signal(signalData);
      } catch (error) {
        console.error('Error accepting signal:', error);
        this.updateConnectionState('failed');
      }
    }
  }

  getSignalData() {
    return this.signalData;
  }

  private setupPeerEvents() {
    if (!this.peer) return;

    this.peer.on('connect', () => {
      console.log('Peer connected');
      this.updateConnectionState('connected');
      if (this.onPeerConnected) {
        this.onPeerConnected();
      }
    });

    this.peer.on('data', (data) => {
      try {
        this.handleIncomingData(data);
      } catch (error) {
        console.error('Error handling incoming data:', error);
      }
    });

    this.peer.on('close', () => {
      console.log('Peer disconnected');
      this.updateConnectionState('disconnected');
      if (this.onPeerDisconnected) {
        this.onPeerDisconnected();
      }
    });

    this.peer.on('error', (err) => {
      console.error('Peer error:', err);
      this.updateConnectionState('failed');
    });
  }

  private handleIncomingData(data: Buffer) {
    const message: FileTransferData = JSON.parse(data.toString());
    
    switch (message.type) {
      case 'file-metadata':
        this.initializeFileReceive(message);
        break;
      case 'file-chunk':
        this.handleFileChunk(message);
        break;
      case 'file-complete':
        this.completeFileReceive();
        break;
    }
  }

  private initializeFileReceive(metadata: FileTransferData) {
    this.currentTransfer = {
      fileName: metadata.fileName!,
      fileSize: metadata.fileSize!,
      totalChunks: metadata.totalChunks!,
      receivedChunks: new Map(),
      stats: {
        bytesTransferred: 0,
        totalBytes: metadata.fileSize!,
        speed: 0,
        startTime: Date.now(),
        isActive: true,
        direction: 'receiving',
        progress: 0
      }
    };

    if (this.onTransferProgress) {
      this.onTransferProgress(this.currentTransfer.stats);
    }
  }

  private handleFileChunk(chunk: FileTransferData) {
    if (!this.currentTransfer) return;

    // Decode base64 data
    const binaryString = atob(chunk.data!);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    this.currentTransfer.receivedChunks.set(chunk.chunkIndex!, bytes.buffer);
    this.currentTransfer.stats.bytesTransferred += bytes.length;

    // Calculate progress and speed
    this.currentTransfer.stats.progress = 
      (this.currentTransfer.stats.bytesTransferred / this.currentTransfer.stats.totalBytes) * 100;

    const elapsedTime = (Date.now() - this.currentTransfer.stats.startTime) / 1000;
    this.currentTransfer.stats.speed = this.currentTransfer.stats.bytesTransferred / elapsedTime;

    if (this.onTransferProgress) {
      this.onTransferProgress(this.currentTransfer.stats);
    }
  }

  private completeFileReceive() {
    if (!this.currentTransfer) return;

    // Reconstruct file from chunks
    const chunks = Array.from(this.currentTransfer.receivedChunks.entries())
      .sort(([a], [b]) => a - b)
      .map(([, data]) => data);

    const totalSize = chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
    const fileData = new Uint8Array(totalSize);
    let offset = 0;
    
    chunks.forEach(chunk => {
      fileData.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    });

    this.currentTransfer.stats.isActive = false;
    this.currentTransfer.stats.progress = 100;
    
    if (this.onTransferProgress) {
      this.onTransferProgress(this.currentTransfer.stats);
    }

    if (this.onFileReceived) {
      this.onFileReceived(this.currentTransfer.fileName, fileData.buffer);
    }

    this.currentTransfer = null;
  }

  async sendFile(file: File): Promise<void> {
    if (!this.peer || !this.peer.connected) {
      throw new Error('No peer connection');
    }

    const CHUNK_SIZE = 16 * 1024; // 16KB chunks for better reliability
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    const stats: TransferStats = {
      bytesTransferred: 0,
      totalBytes: file.size,
      speed: 0,
      startTime: Date.now(),
      isActive: true,
      direction: 'sending',
      progress: 0
    };

    // Send file metadata
    const metadata: FileTransferData = {
      type: 'file-metadata',
      fileName: file.name,
      fileSize: file.size,
      totalChunks
    };

    this.peer.send(JSON.stringify(metadata));

    // Send file chunks
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      
      const arrayBuffer = await chunk.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      // Convert to base64 for transmission
      let binary = '';
      for (let j = 0; j < bytes.length; j++) {
        binary += String.fromCharCode(bytes[j]);
      }
      const base64Data = btoa(binary);
      
      const chunkMessage: FileTransferData = {
        type: 'file-chunk',
        chunkIndex: i,
        data: base64Data
      };

      this.peer.send(JSON.stringify(chunkMessage));
      
      stats.bytesTransferred += arrayBuffer.byteLength;
      stats.progress = (stats.bytesTransferred / stats.totalBytes) * 100;
      
      const elapsedTime = (Date.now() - stats.startTime) / 1000;
      stats.speed = stats.bytesTransferred / elapsedTime;

      if (this.onTransferProgress) {
        this.onTransferProgress(stats);
      }

      // Small delay to prevent overwhelming the connection
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Send completion message
    const completeMessage: FileTransferData = {
      type: 'file-complete'
    };

    this.peer.send(JSON.stringify(completeMessage));
    
    stats.isActive = false;
    stats.progress = 100;
    
    if (this.onTransferProgress) {
      this.onTransferProgress(stats);
    }
  }

  // Event handlers
  onPeerConnect(callback: () => void) {
    this.onPeerConnected = callback;
  }

  onPeerDisconnect(callback: () => void) {
    this.onPeerDisconnected = callback;
  }

  onFileReceive(callback: (fileName: string, data: ArrayBuffer) => void) {
    this.onFileReceived = callback;
  }

  onTransferProgressUpdate(callback: (stats: TransferStats) => void) {
    this.onTransferProgress = callback;
  }

  onConnectionStateUpdate(callback: (info: ConnectionInfo) => void) {
    this.onConnectionStateChange = callback;
  }

  onSignal(callback: (data: any) => void) {
    this.onSignalData = callback;
  }

  getConnectionInfo(): ConnectionInfo {
    return { ...this.connectionInfo };
  }

  disconnect() {
    this.updateConnectionState('disconnected');
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.currentTransfer = null;
    this.signalData = null;
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatSpeed(bytesPerSecond: number): string {
    return this.formatBytes(bytesPerSecond) + '/s';
  }
}