import axios from 'axios';
import CONFIG from '../config/environment';

const BOT_TOKEN = CONFIG.telegram.botToken;
const BASE_URL = `${CONFIG.telegram.apiBaseUrl}/bot${BOT_TOKEN}`;

export interface TelegramFile {
  file_id: string;
  file_unique_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
  file_path?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: {
    id: number;
    username?: string;
    first_name?: string;
  };
  document?: TelegramFile;
  photo?: TelegramFile[];
  video?: TelegramFile;
  audio?: TelegramFile;
  caption?: string;
  date: number;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

class TelegramService {
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;

  /**
   * Send a text message to a chat
   */
  async sendMessage(chatId: string, text: string): Promise<any> {
    try {
      const response = await axios.post(`${BASE_URL}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      });
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Upload document to Telegram with progress tracking
   */
  async sendDocument(
    chatId: string, 
    document: any, 
    caption?: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('document', document);
      if (caption) formData.append('caption', caption);

      const response = await axios.post(`${BASE_URL}/sendDocument`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress: UploadProgress = {
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
            };
            onProgress(progress);
          }
        },
        timeout: 60000, // 60 second timeout for large files
      });

      return response.data;
    } catch (error) {
      console.error('Error sending document:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get updates from Telegram bot
   */
  async getUpdates(offset?: number, timeout = 30): Promise<TelegramUpdate[]> {
    try {
      const response = await axios.get(`${BASE_URL}/getUpdates`, {
        params: { 
          offset,
          timeout,
          allowed_updates: ['message'] 
        },
      });
      return response.data.result;
    } catch (error) {
      console.error('Error getting updates:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get file information from Telegram
   */
  async getFile(fileId: string): Promise<TelegramFile> {
    try {
      const response = await axios.get(`${BASE_URL}/getFile`, {
        params: { file_id: fileId },
      });
      return response.data.result;
    } catch (error) {
      console.error('Error getting file:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get direct download URL for a file
   */
  getFileUrl(filePath: string): string {
    return `${CONFIG.telegram.apiBaseUrl}/file/bot${BOT_TOKEN}/${filePath}`;
  }

  /**
   * Download file from Telegram
   */
  async downloadFile(fileId: string): Promise<Blob> {
    try {
      const fileInfo = await this.getFile(fileId);
      if (!fileInfo.file_path) {
        throw new Error('File path not available');
      }

      const fileUrl = this.getFileUrl(fileInfo.file_path);
      const response = await axios.get(fileUrl, {
        responseType: 'blob',
      });

      return response.data;
    } catch (error) {
      console.error('Error downloading file:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Check bot status
   */
  async getBotInfo(): Promise<any> {
    try {
      const response = await axios.get(`${BASE_URL}/getMe`);
      return response.data.result;
    } catch (error) {
      console.error('Error getting bot info:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get chat information
   */
  async getChatInfo(chatId: string): Promise<any> {
    try {
      const response = await axios.get(`${BASE_URL}/getChat`, {
        params: { chat_id: chatId },
      });
      return response.data.result;
    } catch (error) {
      console.error('Error getting chat info:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Upload file with retry mechanism
   */
  async uploadWithRetry(
    chatId: string, 
    document: any, 
    caption?: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<any> {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.sendDocument(chatId, document, caption, onProgress);
      } catch (error) {
        lastError = error;
        if (attempt < this.maxRetries) {
          console.log(`Upload attempt ${attempt} failed, retrying in ${this.retryDelay}ms...`);
          await this.delay(this.retryDelay * attempt);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Validate file before upload
   */
  validateFile(file: any): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: 'No file selected' };
    }

    if (file.size > CONFIG.storage.maxFileSize) {
      const maxSizeMB = CONFIG.storage.maxFileSize / (1024 * 1024);
      return { 
        valid: false, 
        error: `File too large. Maximum size is ${maxSizeMB}MB` 
      };
    }

    const isValidType = CONFIG.storage.allowedFileTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type?.startsWith(type.replace('/*', '/'));
      }
      return file.type === type;
    });

    if (!isValidType) {
      return { 
        valid: false, 
        error: 'File type not supported' 
      };
    }

    return { valid: true };
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): Error {
    if (error.response) {
      const { status, data } = error.response;
      const message = data?.description || `HTTP ${status} error`;
      return new Error(message);
    }
    
    if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED') {
      return new Error('Network error. Please check your connection.');
    }
    
    return new Error(error.message || 'Unknown error occurred');
  }

  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get default chat ID from config
   */
  getDefaultChatId(): string {
    return CONFIG.telegram.defaultChatId;
  }
}

export default new TelegramService();
