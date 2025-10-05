import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Button, Switch, Card, ProgressBar, Chip, ActivityIndicator } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';
import storageService, { StorageStats } from '../services/storageService';

const ProfileScreen = ({ navigation }: any) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('Cosmic Blue');
  const [currentUser, setCurrentUser] = useState('');
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);

  const themes = [
    { name: 'Cosmic Blue', colors: { primary: '#3B82F6', secondary: '#1E40AF' } },
    { name: 'Neon Green', colors: { primary: '#10B981', secondary: '#059669' } },
    { name: 'Purple Haze', colors: { primary: '#8B5CF6', secondary: '#7C3AED' } },
  ];

  useEffect(() => {
    loadUserData();
    loadStorageStats();
  }, []);

  const loadUserData = async () => {
    const user = await AsyncStorage.getItem('currentUser');
    if (user) setCurrentUser(user);
  };

  const loadStorageStats = async () => {
    setLoading(true);
    try {
      const stats = await storageService.calculateStorageStats();
      setStorageStats(stats);
    } catch (error) {
      console.error('Error loading storage stats:', error);
      Alert.alert('Error', 'Failed to load storage statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            await AsyncStorage.removeItem('currentUser');
            navigation.replace('Auth');
          },
        },
      ]
    );
  };

  const cleanupOldFiles = () => {
    Alert.alert(
      'Cleanup Old Files',
      'This will delete files older than 1 year. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await storageService.cleanupOldFiles(365);
              Alert.alert(
                'Cleanup Complete',
                `Deleted ${result.deletedCount} files and freed ${storageService.formatBytes(result.freedSpace)}`
              );
              loadStorageStats(); // Refresh stats
            } catch (error) {
              Alert.alert('Error', 'Failed to cleanup files');
            }
          },
        },
      ]
    );
  };

  const getStorageColor = (percentage: number) => {
    if (percentage < 50) return 'bg-green-500';
    if (percentage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-blue-50 dark:bg-blue-950`}>
        <ActivityIndicator size="large" />
        <Text style={tw`mt-4 text-gray-600 dark:text-gray-400`}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={tw`flex-1 bg-blue-50 dark:bg-blue-950 p-4`}>
      <Text style={tw`text-2xl font-bold text-blue-700 dark:text-blue-300 mb-6`}>
        👤 Profile
      </Text>

      {/* Account Information */}
      <Card style={tw`p-4 mb-4`}>
        <Text style={tw`text-lg font-semibold mb-4`}>Account Information</Text>
        <View style={tw`flex-row items-center mb-4`}>
          <Text style={tw`text-4xl mr-4`}>👤</Text>
          <View>
            <Text style={tw`text-lg font-semibold text-gray-800 dark:text-gray-200`}>
              {currentUser}
            </Text>
            <Text style={tw`text-sm text-gray-600 dark:text-gray-400`}>
              TeleVault User
            </Text>
          </View>
        </View>
        <Button mode="outlined" onPress={handleLogout} style={tw`border-red-500`}>
          <Text style={tw`text-red-500`}>Logout</Text>
        </Button>
      </Card>

      {/* Storage Analytics */}
      {storageStats && (
        <Card style={tw`p-4 mb-4`}>
          <Text style={tw`text-lg font-semibold mb-4`}>📊 Storage Analytics</Text>
          
          {/* Storage Usage */}
          <View style={tw`mb-4`}>
            <View style={tw`flex-row justify-between mb-2`}>
              <Text style={tw`text-sm text-gray-600 dark:text-gray-400`}>
                Used: {storageService.formatBytes(storageStats.totalSize)}
              </Text>
              <Text style={tw`text-sm text-gray-600 dark:text-gray-400`}>
                {storageStats.usedPercentage.toFixed(1)}%
              </Text>
            </View>
            <ProgressBar 
              progress={storageStats.usedPercentage / 100} 
              style={tw`h-2`}
            />
            <Text style={tw`text-xs text-gray-500 dark:text-gray-500 mt-1`}>
              Total: {storageService.formatBytes(storageService.getStorageLimit())}
            </Text>
          </View>

          {/* File Statistics */}
          <View style={tw`flex-row flex-wrap mb-4`}>
            <View style={tw`w-1/2 pr-2 mb-2`}>
              <Text style={tw`text-2xl font-bold text-blue-600`}>
                {storageStats.totalFiles}
              </Text>
              <Text style={tw`text-xs text-gray-600 dark:text-gray-400`}>Total Files</Text>
            </View>
            <View style={tw`w-1/2 pl-2 mb-2`}>
              <Text style={tw`text-2xl font-bold text-green-600`}>
                {storageStats.recentActivity.thisWeek}
              </Text>
              <Text style={tw`text-xs text-gray-600 dark:text-gray-400`}>This Week</Text>
            </View>
          </View>

          {/* Categories Breakdown */}
          <Text style={tw`font-semibold mb-2`}>Categories</Text>
          <View style={tw`flex-row flex-wrap mb-4`}>
            {Object.entries(storageStats.categoriesBreakdown).map(([category, stats]) => (
              <Chip key={category} style={tw`mr-2 mb-1`} compact>
                {category}: {stats.count}
              </Chip>
            ))}
          </View>

          {/* Top Tags */}
          {storageStats.topTags.length > 0 && (
            <>
              <Text style={tw`font-semibold mb-2`}>Most Used Tags</Text>
              <View style={tw`flex-row flex-wrap mb-4`}>
                {storageStats.topTags.slice(0, 8).map((tag, index) => (
                  <Chip key={index} style={tw`mr-1 mb-1`} compact>
                    #{tag.tag} ({tag.count})
                  </Chip>
                ))}
              </View>
            </>
          )}

          <Button mode="text" onPress={loadStorageStats}>
            🔄 Refresh Stats
          </Button>
        </Card>
      )}

      {/* Theme Settings */}
      <Card style={tw`p-4 mb-4`}>
        <Text style={tw`text-lg font-semibold mb-4`}>🎨 Theme Settings</Text>
        
        <View style={tw`flex-row items-center justify-between mb-4`}>
          <Text>Dark Mode</Text>
          <Switch value={isDarkMode} onValueChange={setIsDarkMode} />
        </View>
        
        <Text style={tw`mb-2`}>Color Theme</Text>
        <View style={tw`flex-row flex-wrap`}>
          {themes.map((theme) => (
            <TouchableOpacity
              key={theme.name}
              style={tw`mr-2 mb-2 px-4 py-2 rounded-full ${
                selectedTheme === theme.name ? 'bg-blue-600' : 'bg-gray-200'
              }`}
              onPress={() => setSelectedTheme(theme.name)}
            >
              <Text style={tw`${selectedTheme === theme.name ? 'text-white' : 'text-black'}`}>
                {theme.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* File Types Breakdown */}
      {storageStats && Object.keys(storageStats.fileTypes).length > 0 && (
        <Card style={tw`p-4 mb-4`}>
          <Text style={tw`text-lg font-semibold mb-4`}>📁 File Types</Text>
          {Object.entries(storageStats.fileTypes).map(([type, stats]) => (
            <View key={type} style={tw`flex-row justify-between items-center mb-2`}>
              <Text style={tw`flex-1 text-gray-700 dark:text-gray-300`}>{type}</Text>
              <View style={tw`flex-row items-center`}>
                <Text style={tw`text-sm text-gray-600 dark:text-gray-400 mr-2`}>
                  {stats.count} files
                </Text>
                <Text style={tw`text-sm text-gray-600 dark:text-gray-400`}>
                  {storageService.formatBytes(stats.size)}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* Storage Management */}
      <Card style={tw`p-4 mb-4`}>
        <Text style={tw`text-lg font-semibold mb-4`}>🧹 Storage Management</Text>
        
        <Button 
          mode="outlined" 
          onPress={cleanupOldFiles}
          style={tw`mb-2`}
          icon="delete-sweep"
        >
          Cleanup Old Files
        </Button>
        
        <Button 
          mode="outlined" 
          onPress={() => navigation.navigate('Home')}
          icon="folder-search"
        >
          Browse Files
        </Button>
      </Card>

      {/* App Information */}
      <Card style={tw`p-4 mb-8`}>
        <Text style={tw`text-lg font-semibold mb-4`}>ℹ️ App Information</Text>
        <Text style={tw`text-sm text-gray-600 dark:text-gray-400 mb-2`}>
          <Text style={tw`font-semibold`}>Version:</Text> 1.0.0
        </Text>
        <Text style={tw`text-sm text-gray-600 dark:text-gray-400 mb-2`}>
          <Text style={tw`font-semibold`}>Build:</Text> {new Date().toLocaleDateString()}
        </Text>
        <Text style={tw`text-sm text-gray-600 dark:text-gray-400`}>
          <Text style={tw`font-semibold`}>Storage Backend:</Text> Telegram Cloud
        </Text>
      </Card>
    </ScrollView>
  );
};

export default ProfileScreen;
