import SimplePeer from 'simple-peer';

export interface FileTransferData {
  type: 'file-metadata' | 'file-chunk' | 'file-complete';
  fileName?: string;
  fileSize?: number;
  totalChunks?: number;
  chunkIndex?: number;
  data?: ArrayBuffer;
}

export interface TransferStats {
  bytesTransferred: number;
  totalBytes: number;
  speed: number; // bytes per second
  startTime: number;
  isActive: boolean;
  direction: 'sending' | 'receiving';
}

export class WebRTCService {
  private peer: SimplePeer.Instance | null = null;
  private ws: WebSocket | null = null;
  private sessionId: string = '';
  private isInitiator: boolean = false;
  private onPeerConnected: (() => void) | null = null;
  private onPeerDisconnected: (() => void) | null = null;
  private onFileReceived: ((fileName: string, data: ArrayBuffer) => void) | null = null;
  private onTransferProgress: ((stats: TransferStats) => void) | null = null;
  
  private currentTransfer: {
    fileName: string;
    fileSize: number;
    totalChunks: number;
    receivedChunks: Map<number, ArrayBuffer>;
    stats: TransferStats;
  } | null = null;

  constructor() {
    this.setupWebSocket();
  }

  private setupWebSocket() {
    // This would connect to your signaling server
    // For demo purposes, we'll simulate peer connection
    console.log('WebSocket setup - would connect to signaling server');
  }

  async createSession(sessionId: string): Promise<void> {
    this.sessionId = sessionId;
    this.isInitiator = true;
    
    this.peer = new SimplePeer({
      initiator: true,
      trickle: false,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });

    this.setupPeerEvents();
  }

  async joinSession(sessionId: string): Promise<void> {
    this.sessionId = sessionId;
    this.isInitiator = false;
    
    this.peer = new SimplePeer({
      initiator: false,
      trickle: false,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });

    this.setupPeerEvents();
  }

  private setupPeerEvents() {
    if (!this.peer) return;

    this.peer.on('signal', (data) => {
      console.log('Signal data:', data);
      // In a real app, this would be sent through the signaling server
      // For demo, we'll simulate connection after a delay
      setTimeout(() => {
        if (this.onPeerConnected) {
          this.onPeerConnected();
        }
      }, 2000);
    });

    this.peer.on('connect', () => {
      console.log('Peer connected');
      if (this.onPeerConnected) {
        this.onPeerConnected();
      }
    });

    this.peer.on('data', (data) => {
      this.handleIncomingData(data);
    });

    this.peer.on('close', () => {
      console.log('Peer disconnected');
      if (this.onPeerDisconnected) {
        this.onPeerDisconnected();
      }
    });

    this.peer.on('error', (err) => {
      console.error('Peer error:', err);
    });
  }

  private handleIncomingData(data: ArrayBuffer) {
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
        direction: 'receiving'
      }
    };

    if (this.onTransferProgress) {
      this.onTransferProgress(this.currentTransfer.stats);
    }
  }

  private handleFileChunk(chunk: FileTransferData) {
    if (!this.currentTransfer) return;

    this.currentTransfer.receivedChunks.set(chunk.chunkIndex!, chunk.data!);
    this.currentTransfer.stats.bytesTransferred += chunk.data!.byteLength;

    // Calculate speed
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

    const fileData = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0));
    let offset = 0;
    
    chunks.forEach(chunk => {
      fileData.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    });

    this.currentTransfer.stats.isActive = false;
    
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

    const CHUNK_SIZE = 64 * 1024; // 64KB chunks
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    const stats: TransferStats = {
      bytesTransferred: 0,
      totalBytes: file.size,
      speed: 0,
      startTime: Date.now(),
      isActive: true,
      direction: 'sending'
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
      
      const chunkMessage: FileTransferData = {
        type: 'file-chunk',
        chunkIndex: i,
        data: arrayBuffer
      };

      this.peer.send(JSON.stringify(chunkMessage));
      
      stats.bytesTransferred += arrayBuffer.byteLength;
      const elapsedTime = (Date.now() - stats.startTime) / 1000;
      stats.speed = stats.bytesTransferred / elapsedTime;

      if (this.onTransferProgress) {
        this.onTransferProgress(stats);
      }

      // Small delay to prevent overwhelming the connection
      await new Promise(resolve => setTimeout(resolve, 1));
    }

    // Send completion message
    const completeMessage: FileTransferData = {
      type: 'file-complete'
    };

    this.peer.send(JSON.stringify(completeMessage));
    
    stats.isActive = false;
    if (this.onTransferProgress) {
      this.onTransferProgress(stats);
    }
  }

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

  disconnect() {
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}