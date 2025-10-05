import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import telegramService from './telegramService';
import databaseService from './databaseService';

export interface QueuedUpload {
  id: string;
  file: {
    uri: string;
    name: string;
    type: string;
    size: number;
  };
  metadata: {
    tags: string;
    category: string;
    uploader: string;
    chatId: string;
  };
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  attempts: number;
  lastAttempt?: string;
  error?: string;
  createdAt: string;
}

class OfflineQueueService {
  private readonly QUEUE_KEY = 'upload_queue';
  private readonly MAX_RETRIES = 3;
  private isProcessing = false;
  private listeners: ((queue: QueuedUpload[]) => void)[] = [];

  constructor() {
    this.setupNetworkListener();
  }

  /**
   * Listen for network changes and process queue when online
   */
  private setupNetworkListener() {
    NetInfo.addEventListener(state => {
      if (state.isConnected && !this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Add upload to queue
   */
  async addToQueue(
    file: any,
    tags: string,
    category: string,
    uploader: string,
    chatId: string
  ): Promise<string> {
    const upload: QueuedUpload = {
      id: this.generateId(),
      file: {
        uri: file.uri,
        name: file.name,
        type: file.type,
        size: file.size,
      },
      metadata: {
        tags,
        category,
        uploader,
        chatId,
      },
      status: 'pending',
      attempts: 0,
      createdAt: new Date().toISOString(),
    };

    const queue = await this.getQueue();
    queue.push(upload);
    await this.saveQueue(queue);
    this.notifyListeners(queue);

    // Try to process immediately if online
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected) {
      this.processQueue();
    }

    return upload.id;
  }

  /**
   * Get current queue
   */
  async getQueue(): Promise<QueuedUpload[]> {
    try {
      const queueJson = await AsyncStorage.getItem(this.QUEUE_KEY);
      return queueJson ? JSON.parse(queueJson) : [];
    } catch (error) {
      console.error('Error getting queue:', error);
      return [];
    }
  }

  /**
   * Save queue to storage
   */
  private async saveQueue(queue: QueuedUpload[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Error saving queue:', error);
    }
  }

  /**
   * Process pending uploads in queue
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      console.log('No internet connection, skipping queue processing');
      return;
    }

    this.isProcessing = true;
    const queue = await this.getQueue();
    const pendingUploads = queue.filter(
      upload => upload.status === 'pending' || 
      (upload.status === 'failed' && upload.attempts < this.MAX_RETRIES)
    );

    console.log(`Processing ${pendingUploads.length} uploads from queue`);

    for (const upload of pendingUploads) {
      try {
        await this.processUpload(upload);
        await this.delay(1000); // Wait 1 second between uploads
      } catch (error) {
        console.error(`Failed to process upload ${upload.id}:`, error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Process a single upload
   */
  private async processUpload(upload: QueuedUpload): Promise<void> {
    const queue = await this.getQueue();
    const uploadIndex = queue.findIndex(u => u.id === upload.id);
    
    if (uploadIndex === -1) return;

    // Update status to uploading
    queue[uploadIndex].status = 'uploading';
    queue[uploadIndex].attempts += 1;
    queue[uploadIndex].lastAttempt = new Date().toISOString();
    await this.saveQueue(queue);
    this.notifyListeners(queue);

    try {
      // Create FormData for upload
      const formData = new FormData();
      formData.append('document', {
        uri: upload.file.uri,
        type: upload.file.type,
        name: upload.file.name,
      });

      const caption = `📁 ${upload.file.name}\n🏷️ Tags: ${upload.metadata.tags}\n📂 Category: ${upload.metadata.category}\n👤 Uploaded by: ${upload.metadata.uploader}`;

      // Upload to Telegram
      const response = await telegramService.sendDocument(
        upload.metadata.chatId,
        formData,
        caption
      );

      // Save to database
      const metadata = {
        fileId: response.result.document.file_id,
        fileName: upload.file.name,
        mimeType: upload.file.type,
        fileSize: upload.file.size,
        tags: upload.metadata.tags,
        category: upload.metadata.category,
        uploadedAt: new Date().toISOString(),
        uploader: upload.metadata.uploader,
        chatId: upload.metadata.chatId,
      };

      await databaseService.openDatabase();
      await databaseService.insertFile(metadata);

      // Mark as completed
      queue[uploadIndex].status = 'completed';
      queue[uploadIndex].error = undefined;
      
      console.log(`Successfully uploaded ${upload.file.name} from queue`);

    } catch (error: any) {
      console.error(`Upload failed for ${upload.file.name}:`, error);
      
      if (upload.attempts >= this.MAX_RETRIES) {
        queue[uploadIndex].status = 'failed';
        queue[uploadIndex].error = error.message || 'Upload failed after max retries';
      } else {
        queue[uploadIndex].status = 'pending';
        queue[uploadIndex].error = error.message || 'Upload failed, will retry';
      }
    }

    await this.saveQueue(queue);
    this.notifyListeners(queue);
  }

  /**
   * Remove upload from queue
   */
  async removeFromQueue(uploadId: string): Promise<void> {
    const queue = await this.getQueue();
    const filteredQueue = queue.filter(upload => upload.id !== uploadId);
    await this.saveQueue(filteredQueue);
    this.notifyListeners(filteredQueue);
  }

  /**
   * Clear completed uploads from queue
   */
  async clearCompleted(): Promise<void> {
    const queue = await this.getQueue();
    const activeQueue = queue.filter(upload => upload.status !== 'completed');
    await this.saveQueue(activeQueue);
    this.notifyListeners(activeQueue);
  }

  /**
   * Clear all uploads from queue
   */
  async clearQueue(): Promise<void> {
    await this.saveQueue([]);
    this.notifyListeners([]);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    total: number;
    pending: number;
    uploading: number;
    completed: number;
    failed: number;
  }> {
    const queue = await this.getQueue();
    return {
      total: queue.length,
      pending: queue.filter(u => u.status === 'pending').length,
      uploading: queue.filter(u => u.status === 'uploading').length,
      completed: queue.filter(u => u.status === 'completed').length,
      failed: queue.filter(u => u.status === 'failed').length,
    };
  }

  /**
   * Retry failed uploads
   */
  async retryFailedUploads(): Promise<void> {
    const queue = await this.getQueue();
    queue.forEach(upload => {
      if (upload.status === 'failed' && upload.attempts < this.MAX_RETRIES) {
        upload.status = 'pending';
        upload.error = undefined;
      }
    });
    
    await this.saveQueue(queue);
    this.notifyListeners(queue);
    this.processQueue();
  }

  /**
   * Subscribe to queue changes
   */
  subscribe(listener: (queue: QueuedUpload[]) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of queue changes
   */
  private notifyListeners(queue: QueuedUpload[]): void {
    this.listeners.forEach(listener => {
      try {
        listener(queue);
      } catch (error) {
        console.error('Error in queue listener:', error);
      }
    });
  }

  /**
   * Generate unique ID for uploads
   */
  private generateId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if device is online
   */
  async isOnline(): Promise<boolean> {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected || false;
  }
}

export default new OfflineQueueService();
