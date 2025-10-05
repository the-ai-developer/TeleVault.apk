import React, { useState, useEffect } from 'react';
import { View, Text, Alert, ScrollView, Linking, Dimensions } from 'react-native';
import { Button, Card, Chip, FAB, Appbar, ActivityIndicator } from 'react-native-paper';
import { WebView } from 'react-native-webview';
import tw from 'twrnc';
import telegramService from '../services/telegramService';
import databaseService, { FileMetadata } from '../services/databaseService';

const { width, height } = Dimensions.get('window');

interface FileViewerScreenProps {
  route: {
    params: {
      file: FileMetadata;
    };
  };
  navigation: any;
}

const FileViewerScreen = ({ route, navigation }: FileViewerScreenProps) => {
  const { file } = route.params;
  const [loading, setLoading] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFileInfo();
  }, []);

  const loadFileInfo = async () => {
    setLoading(true);
    try {
      const fileInfo = await telegramService.getFile(file.fileId);
      if (fileInfo.file_path) {
        setFileUrl(telegramService.getFileUrl(fileInfo.file_path));
      }
    } catch (error) {
      console.error('Error loading file info:', error);
      setError('Failed to load file information');
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async () => {
    if (!fileUrl) {
      Alert.alert('Error', 'File URL not available');
      return;
    }

    try {
      await Linking.openURL(fileUrl);
    } catch (error) {
      Alert.alert('Error', 'Failed to open file');
    }
  };

  const shareFile = () => {
    if (!fileUrl) {
      Alert.alert('Error', 'File URL not available');
      return;
    }
    
    // Implementation for sharing functionality
    Alert.alert('Share', `File URL: ${fileUrl}`, [
      { text: 'Copy URL', onPress: () => {
        // Copy to clipboard implementation
        Alert.alert('Copied', 'File URL copied to clipboard');
      }},
      { text: 'Cancel', style: 'cancel' }
    ]);
  };

  const deleteFile = () => {
    Alert.alert(
      'Delete File',
      'Are you sure you want to delete this file? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.deleteFile(file.fileId);
              Alert.alert('Success', 'File deleted successfully');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete file');
            }
          },
        },
      ]
    );
  };

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return '📄';
    
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('sheet')) return '📊';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '🗜️';
    return '📄';
  };

  const isPreviewable = (mimeType?: string) => {
    if (!mimeType) return false;
    return mimeType.startsWith('image/') || 
           mimeType.startsWith('text/') || 
           mimeType.includes('pdf');
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  return (
    <View style={tw`flex-1 bg-blue-50 dark:bg-blue-950`}>
      <Appbar.Header style={tw`bg-blue-600`}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={file.fileName} />
        <Appbar.Action icon="share" onPress={shareFile} />
        <Appbar.Action icon="delete" onPress={deleteFile} />
      </Appbar.Header>

      <ScrollView style={tw`flex-1 p-4`}>
        {/* File Information Card */}
        <Card style={tw`mb-4 p-4`}>
          <View style={tw`flex-row items-center mb-4`}>
            <Text style={tw`text-4xl mr-4`}>{getFileIcon(file.mimeType)}</Text>
            <View style={tw`flex-1`}>
              <Text style={tw`text-lg font-bold text-gray-900 dark:text-gray-100`}>
                {file.fileName}
              </Text>
              <Text style={tw`text-sm text-gray-600 dark:text-gray-400`}>
                {formatFileSize(file.fileSize)}
              </Text>
            </View>
          </View>

          <View style={tw`mb-4`}>
            <Text style={tw`text-sm text-gray-600 dark:text-gray-400 mb-2`}>
              <Text style={tw`font-semibold`}>Uploaded:</Text> {new Date(file.uploadedAt).toLocaleString()}
            </Text>
            <Text style={tw`text-sm text-gray-600 dark:text-gray-400 mb-2`}>
              <Text style={tw`font-semibold`}>Category:</Text> {file.category}
            </Text>
            <Text style={tw`text-sm text-gray-600 dark:text-gray-400 mb-2`}>
              <Text style={tw`font-semibold`}>Uploader:</Text> {file.uploader}
            </Text>
            {file.mimeType && (
              <Text style={tw`text-sm text-gray-600 dark:text-gray-400 mb-2`}>
                <Text style={tw`font-semibold`}>Type:</Text> {file.mimeType}
              </Text>
            )}
          </View>

          {/* Tags */}
          {file.tags && (
            <View style={tw`mb-4`}>
              <Text style={tw`text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2`}>
                Tags:
              </Text>
              <View style={tw`flex-row flex-wrap`}>
                {file.tags.split(',').map((tag, index) => (
                  <Chip key={index} style={tw`mr-1 mb-1`}>
                    {tag.trim()}
                  </Chip>
                ))}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={tw`flex-row flex-wrap gap-2`}>
            <Button 
              mode="contained" 
              onPress={downloadFile}
              style={tw`bg-blue-600 mr-2 mb-2`}
              disabled={!fileUrl}
            >
              Download
            </Button>
            <Button 
              mode="outlined" 
              onPress={shareFile}
              style={tw`mr-2 mb-2`}
              disabled={!fileUrl}
            >
              Share
            </Button>
          </View>
        </Card>

        {/* File Preview */}
        {loading ? (
          <Card style={tw`p-8`}>
            <ActivityIndicator size="large" />
            <Text style={tw`text-center mt-4 text-gray-600 dark:text-gray-400`}>
              Loading preview...
            </Text>
          </Card>
        ) : error ? (
          <Card style={tw`p-4`}>
            <Text style={tw`text-center text-red-500`}>{error}</Text>
            <Button mode="outlined" onPress={loadFileInfo} style={tw`mt-2`}>
              Retry
            </Button>
          </Card>
        ) : fileUrl && isPreviewable(file.mimeType) ? (
          <Card style={tw`mb-4 overflow-hidden`}>
            <Text style={tw`p-4 font-semibold text-gray-700 dark:text-gray-300`}>
              Preview
            </Text>
            <WebView
              source={{ uri: fileUrl }}
              style={{ height: height * 0.4 }}
              scalesPageToFit={true}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={tw`flex-1 justify-center items-center`}>
                  <ActivityIndicator size="large" />
                </View>
              )}
            />
          </Card>
        ) : (
          <Card style={tw`p-4`}>
            <Text style={tw`text-center text-gray-600 dark:text-gray-400`}>
              Preview not available for this file type
            </Text>
          </Card>
        )}

        {/* File Details */}
        <Card style={tw`mb-4 p-4`}>
          <Text style={tw`font-semibold text-gray-700 dark:text-gray-300 mb-4`}>
            File Details
          </Text>
          <View style={tw`space-y-2`}>
            <View style={tw`flex-row justify-between`}>
              <Text style={tw`text-gray-600 dark:text-gray-400`}>File ID:</Text>
              <Text style={tw`text-gray-800 dark:text-gray-200 font-mono text-xs`}>
                {file.fileId.substring(0, 20)}...
              </Text>
            </View>
            <View style={tw`flex-row justify-between`}>
              <Text style={tw`text-gray-600 dark:text-gray-400`}>Chat ID:</Text>
              <Text style={tw`text-gray-800 dark:text-gray-200`}>{file.chatId}</Text>
            </View>
          </View>
        </Card>
      </ScrollView>

      {/* Floating Action Button for Quick Actions */}
      <FAB
        icon="download"
        style={tw`absolute bottom-4 right-4 bg-blue-600`}
        onPress={downloadFile}
        disabled={!fileUrl}
      />
    </View>
  );
};

export default FileViewerScreen;
