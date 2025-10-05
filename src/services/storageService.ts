import databaseService, { FileMetadata } from './databaseService';

export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  usedPercentage: number;
  remainingSpace: number;
  categoriesBreakdown: { [category: string]: { count: number; size: number } };
  recentActivity: {
    thisWeek: number;
    thisMonth: number;
    last3Months: number;
  };
  topTags: { tag: string; count: number }[];
  fileTypes: { [type: string]: { count: number; size: number } };
}

class StorageService {
  private readonly MAX_STORAGE = 10 * 1024 * 1024 * 1024; // 10GB default

  /**
   * Calculate comprehensive storage statistics
   */
  async calculateStorageStats(): Promise<StorageStats> {
    await databaseService.openDatabase();
    const files = await databaseService.getFiles();

    const totalSize = files.reduce((sum, file) => sum + (file.fileSize || 0), 0);
    const categoriesBreakdown = this.calculateCategoriesBreakdown(files);
    const recentActivity = this.calculateRecentActivity(files);
    const topTags = this.calculateTopTags(files);
    const fileTypes = this.calculateFileTypes(files);

    return {
      totalFiles: files.length,
      totalSize,
      usedPercentage: (totalSize / this.MAX_STORAGE) * 100,
      remainingSpace: this.MAX_STORAGE - totalSize,
      categoriesBreakdown,
      recentActivity,
      topTags,
      fileTypes,
    };
  }

  /**
   * Calculate storage breakdown by category
   */
  private calculateCategoriesBreakdown(
    files: FileMetadata[]
  ): { [category: string]: { count: number; size: number } } {
    const breakdown: { [category: string]: { count: number; size: number } } = {};

    files.forEach(file => {
      const category = file.category || 'Uncategorized';
      if (!breakdown[category]) {
        breakdown[category] = { count: 0, size: 0 };
      }
      breakdown[category].count += 1;
      breakdown[category].size += file.fileSize || 0;
    });

    return breakdown;
  }

  /**
   * Calculate recent activity statistics
   */
  private calculateRecentActivity(files: FileMetadata[]): {
    thisWeek: number;
    thisMonth: number;
    last3Months: number;
  } {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    return {
      thisWeek: files.filter(file => new Date(file.uploadedAt) >= oneWeekAgo).length,
      thisMonth: files.filter(file => new Date(file.uploadedAt) >= oneMonthAgo).length,
      last3Months: files.filter(file => new Date(file.uploadedAt) >= threeMonthsAgo).length,
    };
  }

  /**
   * Calculate top tags by usage
   */
  private calculateTopTags(files: FileMetadata[], limit = 10): { tag: string; count: number }[] {
    const tagCounts: { [tag: string]: number } = {};

    files.forEach(file => {
      if (file.tags) {
        const tags = file.tags.split(',').map(tag => tag.trim().toLowerCase());
        tags.forEach(tag => {
          if (tag && tag.length > 0) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          }
        });
      }
    });

    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Calculate file types breakdown
   */
  private calculateFileTypes(
    files: FileMetadata[]
  ): { [type: string]: { count: number; size: number } } {
    const fileTypes: { [type: string]: { count: number; size: number } } = {};

    files.forEach(file => {
      const type = this.getFileTypeCategory(file.mimeType);
      if (!fileTypes[type]) {
        fileTypes[type] = { count: 0, size: 0 };
      }
      fileTypes[type].count += 1;
      fileTypes[type].size += file.fileSize || 0;
    });

    return fileTypes;
  }

  /**
   * Get file type category from MIME type
   */
  private getFileTypeCategory(mimeType?: string): string {
    if (!mimeType) return 'Unknown';

    if (mimeType.startsWith('image/')) return 'Images';
    if (mimeType.startsWith('video/')) return 'Videos';
    if (mimeType.startsWith('audio/')) return 'Audio';
    if (mimeType.includes('pdf')) return 'PDF Documents';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'Word Documents';
    if (mimeType.includes('excel') || mimeType.includes('sheet')) return 'Spreadsheets';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'Presentations';
    if (mimeType.startsWith('text/')) return 'Text Files';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) return 'Archives';
    if (mimeType.includes('json') || mimeType.includes('xml')) return 'Data Files';

    return 'Other';
  }

  /**
   * Get storage usage by date range
   */
  async getStorageUsageByDateRange(startDate: Date, endDate: Date): Promise<{
    totalFiles: number;
    totalSize: number;
    dailyBreakdown: { date: string; files: number; size: number }[];
  }> {
    await databaseService.openDatabase();
    const files = await databaseService.getFiles();

    const filteredFiles = files.filter(file => {
      const fileDate = new Date(file.uploadedAt);
      return fileDate >= startDate && fileDate <= endDate;
    });

    // Create daily breakdown
    const dailyBreakdown: { [date: string]: { files: number; size: number } } = {};
    
    filteredFiles.forEach(file => {
      const date = new Date(file.uploadedAt).toISOString().split('T')[0];
      if (!dailyBreakdown[date]) {
        dailyBreakdown[date] = { files: 0, size: 0 };
      }
      dailyBreakdown[date].files += 1;
      dailyBreakdown[date].size += file.fileSize || 0;
    });

    return {
      totalFiles: filteredFiles.length,
      totalSize: filteredFiles.reduce((sum, file) => sum + (file.fileSize || 0), 0),
      dailyBreakdown: Object.entries(dailyBreakdown).map(([date, data]) => ({
        date,
        ...data,
      })).sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  /**
   * Get largest files
   */
  async getLargestFiles(limit = 10): Promise<FileMetadata[]> {
    await databaseService.openDatabase();
    const files = await databaseService.getFiles();

    return files
      .filter(file => file.fileSize && file.fileSize > 0)
      .sort((a, b) => (b.fileSize || 0) - (a.fileSize || 0))
      .slice(0, limit);
  }

  /**
   * Get files by uploader
   */
  async getFilesByUploader(): Promise<{ [uploader: string]: { count: number; size: number } }> {
    await databaseService.openDatabase();
    const files = await databaseService.getFiles();

    const uploaderStats: { [uploader: string]: { count: number; size: number } } = {};

    files.forEach(file => {
      const uploader = file.uploader || 'Unknown';
      if (!uploaderStats[uploader]) {
        uploaderStats[uploader] = { count: 0, size: 0 };
      }
      uploaderStats[uploader].count += 1;
      uploaderStats[uploader].size += file.fileSize || 0;
    });

    return uploaderStats;
  }

  /**
   * Clean up old files (for maintenance)
   */
  async cleanupOldFiles(olderThanDays: number = 365): Promise<{
    deletedCount: number;
    freedSpace: number;
  }> {
    await databaseService.openDatabase();
    const files = await databaseService.getFiles();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const oldFiles = files.filter(file => new Date(file.uploadedAt) < cutoffDate);
    
    let freedSpace = 0;
    for (const file of oldFiles) {
      try {
        await databaseService.deleteFile(file.fileId);
        freedSpace += file.fileSize || 0;
      } catch (error) {
        console.error(`Failed to delete file ${file.fileName}:`, error);
      }
    }

    return {
      deletedCount: oldFiles.length,
      freedSpace,
    };
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get storage limit
   */
  getStorageLimit(): number {
    return this.MAX_STORAGE;
  }

  /**
   * Check if storage is nearly full
   */
  async isStorageNearlyFull(threshold = 0.9): Promise<boolean> {
    const stats = await this.calculateStorageStats();
    return stats.usedPercentage / 100 >= threshold;
  }

  /**
   * Get storage health status
   */
  async getStorageHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    message: string;
    usedPercentage: number;
  }> {
    const stats = await this.calculateStorageStats();
    const usedPercentage = stats.usedPercentage;

    if (usedPercentage < 70) {
      return {
        status: 'healthy',
        message: 'Storage usage is healthy',
        usedPercentage,
      };
    } else if (usedPercentage < 90) {
      return {
        status: 'warning',
        message: 'Storage is getting full, consider cleaning up old files',
        usedPercentage,
      };
    } else {
      return {
        status: 'critical',
        message: 'Storage is nearly full! Please delete some files',
        usedPercentage,
      };
    }
  }
}

export default new StorageService();
