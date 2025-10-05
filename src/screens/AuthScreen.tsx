import React, { useState } from 'react';
import { View, Text, Alert, ScrollView } from 'react-native';
import { Button, TextInput, Card, ProgressBar, HelperText } from 'react-native-paper';
import tw from 'twrnc';
import securityService from '../services/securityService';

const AuthScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: [] });

  const handlePasswordChange = (newPassword: string) => {
    setPassword(newPassword);
    if (!isLogin) {
      const strength = securityService.getPasswordStrength(newPassword);
      setPasswordStrength(strength);
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!isLogin) {
      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }
      
      if (passwordStrength.score < 100) {
        Alert.alert('Weak Password', 'Please create a stronger password:\n• ' + passwordStrength.feedback.join('\n• '));
        return;
      }
    }

    setLoading(true);

    try {
      let result;
      
      if (isLogin) {
        result = await securityService.authenticateUser(email, password);
      } else {
        result = await securityService.registerUser(email, password);
      }

      if (result.success) {
        if (!isLogin) {
          // Auto-login after successful registration
          await securityService.authenticateUser(email, password);
        }
        
        Alert.alert(
          'Success! 🎉',
          result.message,
          [{ text: 'Continue', onPress: () => navigation.replace('Home') }]
        );
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthColor = (score: number) => {
    if (score < 40) return 'bg-red-500';
    if (score < 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = (score: number) => {
    if (score < 40) return 'Weak';
    if (score < 80) return 'Medium';
    return 'Strong';
  };

  return (
    <ScrollView style={tw`flex-1 bg-blue-50 dark:bg-blue-950`}>
      <View style={tw`flex-1 justify-center items-center p-6`}>
        {/* Header */}
        <View style={tw`mb-8 items-center`}>
          <Text style={tw`text-5xl mb-4`}>🔐</Text>
          <Text style={tw`text-3xl font-bold text-blue-700 dark:text-blue-300 mb-2`}>
            TeleVault
          </Text>
          <Text style={tw`text-center text-gray-600 dark:text-gray-400`}>
            {isLogin ? 'Welcome back!' : 'Create your secure vault'}
          </Text>
        </View>

        {/* Auth Form */}
        <Card style={tw`p-6 rounded-2xl shadow-xl w-full max-w-sm`}>
          <Text style={tw`text-xl font-bold text-center mb-6`}>
            {isLogin ? '🔓 Sign In' : '🆕 Create Account'}
          </Text>

          {/* Email Input */}
          <TextInput
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={tw`mb-4`}
            disabled={loading}
            error={email && !validateEmail(email)}
          />
          {email && !validateEmail(email) && (
            <HelperText type="error" visible={true}>
              Please enter a valid email address
            </HelperText>
          )}

          {/* Password Input */}
          <TextInput
            label="Password"
            value={password}
            onChangeText={handlePasswordChange}
            secureTextEntry
            style={tw`mb-4`}
            disabled={loading}
          />

          {/* Password Strength Indicator (Sign Up only) */}
          {!isLogin && password && (
            <View style={tw`mb-4`}>
              <View style={tw`flex-row items-center justify-between mb-2`}>
                <Text style={tw`text-sm text-gray-600 dark:text-gray-400`}>
                  Password Strength:
                </Text>
                <Text style={tw`text-sm font-semibold ${
                  passwordStrength.score < 40 ? 'text-red-600' :
                  passwordStrength.score < 80 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {getPasswordStrengthText(passwordStrength.score)}
                </Text>
              </View>
              <ProgressBar 
                progress={passwordStrength.score / 100} 
                style={tw`h-2`}
              />
              {passwordStrength.feedback.length > 0 && (
                <View style={tw`mt-2`}>
                  {passwordStrength.feedback.map((feedback, index) => (
                    <Text key={index} style={tw`text-xs text-gray-500 dark:text-gray-400`}>
                      • {feedback}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Confirm Password (Sign Up only) */}
          {!isLogin && (
            <TextInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              style={tw`mb-4`}
              disabled={loading}
              error={confirmPassword && password !== confirmPassword}
            />
          )}
          {!isLogin && confirmPassword && password !== confirmPassword && (
            <HelperText type="error" visible={true}>
              Passwords do not match
            </HelperText>
          )}

          {/* Loading Indicator */}
          {loading && (
            <View style={tw`mb-4`}>
              <ProgressBar indeterminate />
              <Text style={tw`text-center text-sm text-gray-600 dark:text-gray-400 mt-2`}>
                {isLogin ? 'Signing you in...' : 'Creating your account...'}
              </Text>
            </View>
          )}

          {/* Submit Button */}
          <Button
            mode="contained"
            onPress={handleAuth}
            style={tw`bg-blue-600 mb-4`}
            contentStyle={tw`py-2`}
            disabled={loading || !email || !password || (!isLogin && password !== confirmPassword)}
          >
            {loading ? '⏳ Please wait...' : (isLogin ? '🔓 Sign In' : '🚀 Create Account')}
          </Button>

          {/* Toggle Mode Button */}
          <Button
            mode="text"
            onPress={() => {
              setIsLogin(!isLogin);
              setPassword('');
              setConfirmPassword('');
              setPasswordStrength({ score: 0, feedback: [] });
            }}
            disabled={loading}
          >
            {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
          </Button>
        </Card>

        {/* Security Features */}
        <View style={tw`mt-8 items-center`}>
          <Text style={tw`text-center text-gray-600 dark:text-gray-400 mb-2`}>
            🔐 Secured with
          </Text>
          <View style={tw`flex-row items-center`}>
            <Text style={tw`text-xs text-gray-500 dark:text-gray-500 mr-4`}>
              🔒 AES Encryption
            </Text>
            <Text style={tw`text-xs text-gray-500 dark:text-gray-500 mr-4`}>
              🧂 Salted Passwords
            </Text>
            <Text style={tw`text-xs text-gray-500 dark:text-gray-500`}>
              ☁️ Telegram Storage
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default AuthScreen;
