import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { 
  Searchbar, 
  FAB, 
  Appbar, 
  Card, 
  Chip, 
  Menu, 
  Button, 
  Checkbox,
  SegmentedButtons,
  ActivityIndicator
} from 'react-native-paper';
import tw from 'twrnc';
import databaseService from '../services/databaseService';
import telegramService from '../services/telegramService';
import storageService from '../services/storageService';
import { FileMetadata } from '../services/databaseService';

const HomeScreen = ({ navigation }: any) => {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFiles, setFilteredFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [filterBy, setFilterBy] = useState('all');
  const [menuVisible, setMenuVisible] = useState(false);

  const sortOptions = [
    { value: 'date', label: 'Date' },
    { value: 'name', label: 'Name' },
    { value: 'size', label: 'Size' },
    { value: 'type', label: 'Type' },
  ];

  const filterOptions = [
    { value: 'all', label: 'All Files' },
    { value: 'images', label: 'Images' },
    { value: 'documents', label: 'Documents' },
    { value: 'videos', label: 'Videos' },
    { value: 'audio', label: 'Audio' },
  ];

  useEffect(() => {
    loadFiles();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [searchQuery, files, sortBy, filterBy]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      await databaseService.openDatabase();
      const loadedFiles = await databaseService.getFiles();
      setFiles(loadedFiles);
    } catch (error) {
      Alert.alert('Error', 'Failed to load files');
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let result = [...files];

    // Apply search filter
    if (searchQuery) {
      result = result.filter(file =>
        file.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.tags.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    if (filterBy !== 'all') {
      result = result.filter(file => {
        const mimeType = file.mimeType?.toLowerCase() || '';
        switch (filterBy) {
          case 'images':
            return mimeType.startsWith('image/');
          case 'documents':
            return mimeType.includes('pdf') || mimeType.includes('document') || 
                   mimeType.includes('text') || mimeType.includes('sheet');
          case 'videos':
            return mimeType.startsWith('video/');
          case 'audio':
            return mimeType.startsWith('audio/');
          default:
            return true;
        }
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.fileName.localeCompare(b.fileName);
        case 'size':
          return (b.fileSize || 0) - (a.fileSize || 0);
        case 'type':
          return (a.mimeType || '').localeCompare(b.mimeType || '');
        case 'date':
        default:
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      }
    });

    setFilteredFiles(result);
  };

  const toggleFileSelection = (fileId: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedFiles(new Set());
  };

  const selectAllFiles = () => {
    const allFileIds = new Set(filteredFiles.map(file => file.fileId));
    setSelectedFiles(allFileIds);
  };

  const clearSelection = () => {
    setSelectedFiles(new Set());
  };

  const bulkDelete = () => {
    Alert.alert(
      'Delete Files',
      `Are you sure you want to delete ${selectedFiles.size} selected files? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const fileId of selectedFiles) {
                await databaseService.deleteFile(fileId);
              }
              Alert.alert('Success', `${selectedFiles.size} files deleted successfully`);
              loadFiles();
              setSelectionMode(false);
              setSelectedFiles(new Set());
            } catch (error) {
              Alert.alert('Error', 'Failed to delete some files');
            }
          },
        },
      ]
    );
  };

  const bulkDownload = () => {
    Alert.alert('Download Files', 'Opening download links for selected files...');
    selectedFiles.forEach(async (fileId) => {
      try {
        const file = files.find(f => f.fileId === fileId);
        if (file) {
          const fileInfo = await telegramService.getFile(fileId);
          if (fileInfo.file_path) {
            const downloadUrl = telegramService.getFileUrl(fileInfo.file_path);
            // In a real app, you'd open each URL or create a download manager
            console.log(`Download URL for ${file.fileName}: ${downloadUrl}`);
          }
        }
      } catch (error) {
        console.error(`Failed to get download URL for file ${fileId}:`, error);
      }
    });
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

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    return storageService.formatBytes(bytes);
  };

  const renderFile = ({ item }: { item: FileMetadata }) => {
    const isSelected = selectedFiles.has(item.fileId);
    
    return (
      <Card style={tw`mb-2 ${isSelected ? 'border-2 border-blue-500' : ''}`}>
        <TouchableOpacity 
          onPress={() => {
            if (selectionMode) {
              toggleFileSelection(item.fileId);
            } else {
              navigation.navigate('FileViewer', { file: item });
            }
          }}
          onLongPress={() => {
            if (!selectionMode) {
              setSelectionMode(true);
              toggleFileSelection(item.fileId);
            }
          }}
        >
          <View style={tw`p-4`}>
            <View style={tw`flex-row items-center`}>
              {selectionMode && (
                <Checkbox
                  status={isSelected ? 'checked' : 'unchecked'}
                  onPress={() => toggleFileSelection(item.fileId)}
                />
              )}
              
              <Text style={tw`text-2xl mr-3`}>{getFileIcon(item.mimeType)}</Text>
              
              <View style={tw`flex-1`}>
                <Text style={tw`font-semibold text-lg text-gray-900 dark:text-gray-100`} numberOfLines={1}>
                  {item.fileName}
                </Text>
                <Text style={tw`text-sm text-gray-600 dark:text-gray-400`}>
                  {formatFileSize(item.fileSize)} • {new Date(item.uploadedAt).toLocaleDateString()}
                </Text>
                <Text style={tw`text-sm text-gray-600 dark:text-gray-400`} numberOfLines={1}>
                  {item.category} • By {item.uploader}
                </Text>
              </View>
            </View>
            
            {/* Tags */}
            {item.tags && (
              <View style={tw`flex-row flex-wrap mt-2`}>
                {item.tags.split(',').slice(0, 3).map((tag, index) => (
                  <Chip key={index} style={tw`mr-1 mb-1`} compact>
                    {tag.trim()}
                  </Chip>
                ))}
                {item.tags.split(',').length > 3 && (
                  <Chip style={tw`mr-1 mb-1`} compact>
                    +{item.tags.split(',').length - 3} more
                  </Chip>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Card>
    );
  };

  return (
    <View style={tw`flex-1 bg-blue-50 dark:bg-blue-950`}>
      {/* Header */}
      <Appbar.Header style={tw`bg-blue-600`}>
        {selectionMode ? (
          <>
            <Appbar.BackAction onPress={toggleSelectionMode} />
            <Appbar.Content title={`${selectedFiles.size} selected`} />
            <Appbar.Action icon="select-all" onPress={selectAllFiles} />
            <Appbar.Action icon="close" onPress={clearSelection} />
          </>
        ) : (
          <>
            <Appbar.Content title="TeleVault" />
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={<Appbar.Action icon="dots-vertical" onPress={() => setMenuVisible(true)} />}
            >
              <Menu.Item onPress={() => { setMenuVisible(false); toggleSelectionMode(); }} title="Select Files" />
              <Menu.Item onPress={() => { setMenuVisible(false); loadFiles(); }} title="Refresh" />
              <Menu.Item onPress={() => { setMenuVisible(false); navigation.navigate('Profile'); }} title="Profile" />
            </Menu>
          </>
        )}
      </Appbar.Header>

      {/* Selection Mode Actions */}
      {selectionMode && selectedFiles.size > 0 && (
        <View style={tw`bg-blue-100 dark:bg-blue-900 p-4 flex-row justify-around`}>
          <Button mode="outlined" onPress={bulkDownload} icon="download">
            Download ({selectedFiles.size})
          </Button>
          <Button mode="outlined" onPress={bulkDelete} icon="delete" textColor="red">
            Delete ({selectedFiles.size})
          </Button>
        </View>
      )}

      {/* Search Bar */}
      <Searchbar
        placeholder="Search files, tags, categories..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={tw`m-4`}
      />

      {/* Filters and Sorting */}
      <View style={tw`px-4 pb-2`}>
        <Text style={tw`text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300`}>Filter by:</Text>
        <SegmentedButtons
          value={filterBy}
          onValueChange={setFilterBy}
          buttons={filterOptions}
        />
        
        <Text style={tw`text-sm font-semibold mb-2 mt-4 text-gray-700 dark:text-gray-300`}>Sort by:</Text>
        <SegmentedButtons
          value={sortBy}
          onValueChange={setSortBy}
          buttons={sortOptions}
        />
      </View>

      {/* File List */}
      {loading ? (
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" />
          <Text style={tw`mt-4 text-gray-600 dark:text-gray-400`}>Loading files...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredFiles}
          renderItem={renderFile}
          keyExtractor={(item) => item.id?.toString() || item.fileId}
          contentContainerStyle={tw`p-4 pb-20`}
          ListEmptyComponent={
            <View style={tw`items-center mt-8`}>
              <Text style={tw`text-6xl mb-4`}>📁</Text>
              <Text style={tw`text-center text-gray-600 dark:text-gray-400 text-lg font-semibold`}>
                {searchQuery || filterBy !== 'all' 
                  ? 'No files match your criteria' 
                  : 'No files yet'
                }
              </Text>
              <Text style={tw`text-center text-gray-500 dark:text-gray-500 mt-2`}>
                {!searchQuery && filterBy === 'all'
                  ? 'Upload your first file to get started!'
                  : 'Try adjusting your search or filters'
                }
              </Text>
              {(!searchQuery && filterBy === 'all') && (
                <Button 
                  mode="contained" 
                  onPress={() => navigation.navigate('Upload')}
                  style={tw`mt-4 bg-blue-600`}
                >
                  📤 Upload Files
                </Button>
              )}
            </View>
          }
          refreshing={loading}
          onRefresh={loadFiles}
        />
      )}

      {/* Floating Action Button */}
      {!selectionMode && (
        <FAB
          icon="plus"
          style={tw`absolute bottom-4 right-4 bg-blue-600`}
          onPress={() => navigation.navigate('Upload')}
        />
      )}
    </View>
  );
};

export default HomeScreen;
