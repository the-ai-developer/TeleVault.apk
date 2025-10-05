/**
 * TeleVault Environment Configuration
 * Secure configuration management for TeleVault app
 */

export interface TelegramConfig {
  botToken: string;
  defaultChatId: string;
  apiBaseUrl: string;
}

export interface AppConfig {
  telegram: TelegramConfig;
  storage: {
    maxFileSize: number; // in bytes
    allowedFileTypes: string[];
  };
  security: {
    encryptionEnabled: boolean;
    biometricAuthEnabled: boolean;
  };
}

// Production configuration
export const CONFIG: AppConfig = {
  telegram: {
    botToken: '7911985351:AAG6J1_IU4aEyyPElHufkuh0WQQMOIDl3Us',
    defaultChatId: '-1002591908433',
    apiBaseUrl: 'https://api.telegram.org',
  },
  storage: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedFileTypes: [
      'image/*',
      'video/*',
      'audio/*',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/*',
      'application/zip',
      'application/x-rar-compressed',
    ],
  },
  security: {
    encryptionEnabled: true,
    biometricAuthEnabled: true,
  },
};

// Development configuration
export const DEV_CONFIG: AppConfig = {
  ...CONFIG,
  storage: {
    ...CONFIG.storage,
    maxFileSize: 20 * 1024 * 1024, // 20MB for dev
  },
};

// Export appropriate config based on environment
export default __DEV__ ? DEV_CONFIG : CONFIG;
