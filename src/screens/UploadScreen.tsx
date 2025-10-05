import React, { useState, useEffect } from 'react';
import { View, Text, Alert, ScrollView } from 'react-native';
import { Button, TextInput, ProgressBar, Chip, Card } from 'react-native-paper';
import DocumentPicker from 'react-native-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';
import telegramService, { UploadProgress } from '../services/telegramService';
import databaseService from '../services/databaseService';

const UploadScreen = ({ navigation }: any) => {
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('General');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentUser, setCurrentUser] = useState('');
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const categories = [
    'General', 'Work', 'Personal', 'Photos', 'Videos', 
    'Documents', 'Music', 'Archives', 'Projects'
  ];

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const user = await AsyncStorage.getItem('currentUser');
    if (user) setCurrentUser(user);
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
      });
      
      const file = result[0];
      
      // Validate file before setting
      const validation = telegramService.validateFile(file);
      if (!validation.valid) {
        Alert.alert('Invalid File', validation.error);
        return;
      }
      
      setSelectedFile(file);
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        // User cancelled
      } else {
        Alert.alert('Error', 'Failed to pick document');
      }
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a file first');
      return;
    }

    if (!tags.trim()) {
      Alert.alert('Error', 'Please add at least one tag');
      return;
    }

    setUploading(true);
    let startTime = Date.now();

    try {
      // Create form data for upload
      const formData = new FormData();
      formData.append('document', {
        uri: selectedFile.uri,
        type: selectedFile.type,
        name: selectedFile.name,
      });

      // Use default chat ID from config
      const chatId = telegramService.getDefaultChatId();
      
      // Create caption with metadata
      const caption = `📁 ${selectedFile.name}\n🏷️ Tags: ${tags}\n📂 Category: ${category}\n👤 Uploaded by: ${currentUser}`;

      // Upload with progress tracking
      const response = await telegramService.uploadWithRetry(
        chatId, 
        formData, 
        caption,
        (progressInfo: UploadProgress) => {
          setProgress(progressInfo.percentage / 100);
          
          // Calculate upload speed and time remaining
          const elapsed = (Date.now() - startTime) / 1000;
          const speed = progressInfo.loaded / elapsed;
          const remaining = (progressInfo.total - progressInfo.loaded) / speed;
          
          setUploadSpeed(speed);
          setTimeRemaining(remaining);
        }
      );

      // Save metadata to local DB
      const metadata = {
        fileId: response.result.document.file_id,
        fileName: selectedFile.name,
        mimeType: selectedFile.type,
        fileSize: selectedFile.size,
        tags,
        category,
        uploadedAt: new Date().toISOString(),
        uploader: currentUser,
        chatId,
      };

      await databaseService.openDatabase();
      await databaseService.insertFile(metadata);

      setProgress(1);
      
      Alert.alert(
        'Success! 🎉', 
        `File "${selectedFile.name}" uploaded successfully to TeleVault!`,
        [
          { text: 'Upload Another', onPress: resetForm },
          { text: 'View Files', onPress: () => navigation.navigate('Home') }
        ]
      );
      
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert(
        'Upload Failed', 
        error.message || 'Failed to upload file. Please check your internet connection and try again.'
      );
    } finally {
      setUploading(false);
      setProgress(0);
      setUploadSpeed(0);
      setTimeRemaining(0);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setTags('');
    setCategory('General');
    setProgress(0);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number) => {
    return formatBytes(bytesPerSecond) + '/s';
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <ScrollView style={tw`flex-1 bg-blue-50 dark:bg-blue-950 p-4`}>
      <Text style={tw`text-2xl font-bold text-blue-700 dark:text-blue-300 mb-6`}>
        📤 Upload to TeleVault
      </Text>

      {/* File Selection */}
      <Card style={tw`mb-4 p-4`}>
        <Text style={tw`text-lg font-semibold mb-4`}>Select File</Text>
        
        <Button mode="outlined" onPress={pickDocument} style={tw`mb-4`} disabled={uploading}>
          {selectedFile ? 'Change File' : 'Select File'}
        </Button>

        {selectedFile && (
          <View style={tw`p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200`}>
            <Text style={tw`font-semibold text-lg`}>📄 {selectedFile.name}</Text>
            <Text style={tw`text-sm text-gray-600 dark:text-gray-400`}>
              Size: {formatBytes(selectedFile.size)}
            </Text>
            <Text style={tw`text-sm text-gray-600 dark:text-gray-400`}>
              Type: {selectedFile.type || 'Unknown'}
            </Text>
          </View>
        )}
      </Card>

      {/* File Metadata */}
      <Card style={tw`mb-4 p-4`}>
        <Text style={tw`text-lg font-semibold mb-4`}>File Information</Text>
        
        <TextInput
          label="Tags (comma separated) *"
          value={tags}
          onChangeText={setTags}
          style={tw`mb-4`}
          placeholder="e.g., work, important, pdf, project"
          disabled={uploading}
        />

        <Text style={tw`text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2`}>
          Category
        </Text>
        <View style={tw`flex-row flex-wrap mb-4`}>
          {categories.map((cat) => (
            <Chip
              key={cat}
              selected={category === cat}
              onPress={() => !uploading && setCategory(cat)}
              style={tw`mr-2 mb-2 ${category === cat ? 'bg-blue-600' : 'bg-gray-200'}`}
              textStyle={tw`${category === cat ? 'text-white' : 'text-black'}`}
            >
              {cat}
            </Chip>
          ))}
        </View>
      </Card>

      {/* Upload Progress */}
      {uploading && (
        <Card style={tw`mb-4 p-4`}>
          <Text style={tw`text-lg font-semibold mb-4`}>Uploading...</Text>
          
          <ProgressBar progress={progress} style={tw`mb-2`} />
          
          <View style={tw`flex-row justify-between mb-2`}>
            <Text style={tw`text-sm text-gray-600`}>
              {Math.round(progress * 100)}%
            </Text>
            <Text style={tw`text-sm text-gray-600`}>
              {uploadSpeed > 0 && `${formatSpeed(uploadSpeed)}`}
            </Text>
          </View>
          
          {timeRemaining > 0 && (
            <Text style={tw`text-sm text-gray-600 text-center`}>
              ⏱️ Time remaining: {formatTime(timeRemaining)}
            </Text>
          )}
        </Card>
      )}

      {/* Upload Button */}
      <Card style={tw`mb-4 p-4`}>
        <Button
          mode="contained"
          onPress={uploadFile}
          disabled={!selectedFile || uploading || !tags.trim()}
          style={tw`bg-blue-600 py-2`}
          contentStyle={tw`py-2`}
        >
          {uploading ? '⏳ Uploading...' : '🚀 Upload to TeleVault'}
        </Button>
        
        {!uploading && (
          <Button
            mode="text"
            onPress={resetForm}
            style={tw`mt-2`}
            disabled={!selectedFile}
          >
            Clear Form
          </Button>
        )}
      </Card>

      {/* Upload Tips */}
      <Card style={tw`mb-4 p-4`}>
        <Text style={tw`text-lg font-semibold mb-2`}>💡 Upload Tips</Text>
        <Text style={tw`text-sm text-gray-600 dark:text-gray-400 mb-2`}>
          • Maximum file size: 50MB
        </Text>
        <Text style={tw`text-sm text-gray-600 dark:text-gray-400 mb-2`}>
          • Use descriptive tags for easier searching
        </Text>
        <Text style={tw`text-sm text-gray-600 dark:text-gray-400 mb-2`}>
          • Files are securely stored in your Telegram group
        </Text>
        <Text style={tw`text-sm text-gray-600 dark:text-gray-400`}>
          • You can download files anytime from any device
        </Text>
      </Card>
    </ScrollView>
  );
};

export default UploadScreen;
