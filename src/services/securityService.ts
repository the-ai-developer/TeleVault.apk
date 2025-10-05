import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';

export interface UserCredentials {
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  lastLogin?: string;
}

class SecurityService {
  private readonly ENCRYPTION_KEY = 'TeleVault_Security_Key_2024';
  private readonly SALT_LENGTH = 32;

  /**
   * Generate a random salt
   */
  private generateSalt(): string {
    return CryptoJS.lib.WordArray.random(this.SALT_LENGTH).toString();
  }

  /**
   * Hash password with salt
   */
  private hashPassword(password: string, salt: string): string {
    return CryptoJS.PBKDF2(password, salt, {
      keySize: 256/32,
      iterations: 10000
    }).toString();
  }

  /**
   * Encrypt sensitive data
   */
  encryptData(data: string): string {
    try {
      return CryptoJS.AES.encrypt(data, this.ENCRYPTION_KEY).toString();
    } catch (error) {
      console.error('Encryption error:', error);
      return data; // Fallback to plain text
    }
  }

  /**
   * Decrypt sensitive data
   */
  decryptData(encryptedData: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.ENCRYPTION_KEY);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption error:', error);
      return encryptedData; // Fallback to encrypted text
    }
  }

  /**
   * Register a new user with secure password storage
   */
  async registerUser(email: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if user already exists
      const existingUser = await AsyncStorage.getItem(`secure_user_${email}`);
      if (existingUser) {
        return { success: false, message: 'User already exists' };
      }

      // Validate password strength
      if (!this.validatePasswordStrength(password)) {
        return { 
          success: false, 
          message: 'Password must be at least 8 characters with uppercase, lowercase, number and special character' 
        };
      }

      // Generate salt and hash password
      const salt = this.generateSalt();
      const passwordHash = this.hashPassword(password, salt);

      const credentials: UserCredentials = {
        email,
        passwordHash,
        salt,
        createdAt: new Date().toISOString(),
      };

      // Store encrypted credentials
      const encryptedCredentials = this.encryptData(JSON.stringify(credentials));
      await AsyncStorage.setItem(`secure_user_${email}`, encryptedCredentials);

      return { success: true, message: 'User registered successfully' };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Registration failed' };
    }
  }

  /**
   * Authenticate user with secure password verification
   */
  async authenticateUser(email: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
      // Get stored credentials
      const encryptedCredentials = await AsyncStorage.getItem(`secure_user_${email}`);
      if (!encryptedCredentials) {
        return { success: false, message: 'User not found' };
      }

      // Decrypt and parse credentials
      const credentialsJson = this.decryptData(encryptedCredentials);
      const credentials: UserCredentials = JSON.parse(credentialsJson);

      // Verify password
      const inputHash = this.hashPassword(password, credentials.salt);
      if (inputHash !== credentials.passwordHash) {
        return { success: false, message: 'Invalid password' };
      }

      // Update last login
      credentials.lastLogin = new Date().toISOString();
      const updatedCredentials = this.encryptData(JSON.stringify(credentials));
      await AsyncStorage.setItem(`secure_user_${email}`, updatedCredentials);

      // Set current user session
      await AsyncStorage.setItem('currentUser', email);

      return { success: true, message: 'Authentication successful' };
    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, message: 'Authentication failed' };
    }
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): boolean {
    if (password.length < 8) return false;
    
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return hasUppercase && hasLowercase && hasNumbers && hasSpecialChar;
  }

  /**
   * Get password strength score
   */
  getPasswordStrength(password: string): { score: number; feedback: string[] } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) {
      score += 20;
    } else {
      feedback.push('Password should be at least 8 characters');
    }

    if (/[A-Z]/.test(password)) {
      score += 20;
    } else {
      feedback.push('Add uppercase letters');
    }

    if (/[a-z]/.test(password)) {
      score += 20;
    } else {
      feedback.push('Add lowercase letters');
    }

    if (/\d/.test(password)) {
      score += 20;
    } else {
      feedback.push('Add numbers');
    }

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 20;
    } else {
      feedback.push('Add special characters');
    }

    return { score, feedback };
  }

  /**
   * Change user password
   */
  async changePassword(email: string, oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      // Verify current password
      const authResult = await this.authenticateUser(email, oldPassword);
      if (!authResult.success) {
        return { success: false, message: 'Current password is incorrect' };
      }

      // Validate new password
      if (!this.validatePasswordStrength(newPassword)) {
        return { 
          success: false, 
          message: 'New password does not meet strength requirements' 
        };
      }

      // Get existing credentials
      const encryptedCredentials = await AsyncStorage.getItem(`secure_user_${email}`);
      if (!encryptedCredentials) {
        return { success: false, message: 'User not found' };
      }

      const credentialsJson = this.decryptData(encryptedCredentials);
      const credentials: UserCredentials = JSON.parse(credentialsJson);

      // Update with new password
      const newSalt = this.generateSalt();
      credentials.passwordHash = this.hashPassword(newPassword, newSalt);
      credentials.salt = newSalt;
      credentials.lastLogin = new Date().toISOString();

      // Save updated credentials
      const updatedCredentials = this.encryptData(JSON.stringify(credentials));
      await AsyncStorage.setItem(`secure_user_${email}`, updatedCredentials);

      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      console.error('Password change error:', error);
      return { success: false, message: 'Failed to change password' };
    }
  }

  /**
   * Get user info
   */
  async getUserInfo(email: string): Promise<{ email: string; createdAt: string; lastLogin?: string } | null> {
    try {
      const encryptedCredentials = await AsyncStorage.getItem(`secure_user_${email}`);
      if (!encryptedCredentials) return null;

      const credentialsJson = this.decryptData(encryptedCredentials);
      const credentials: UserCredentials = JSON.parse(credentialsJson);

      return {
        email: credentials.email,
        createdAt: credentials.createdAt,
        lastLogin: credentials.lastLogin,
      };
    } catch (error) {
      console.error('Get user info error:', error);
      return null;
    }
  }

  /**
   * Logout user
   */
  async logoutUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem('currentUser');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(email: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
      // Verify password before deletion
      const authResult = await this.authenticateUser(email, password);
      if (!authResult.success) {
        return { success: false, message: 'Password verification failed' };
      }

      // Remove user data
      await AsyncStorage.removeItem(`secure_user_${email}`);
      await AsyncStorage.removeItem('currentUser');

      return { success: true, message: 'Account deleted successfully' };
    } catch (error) {
      console.error('Account deletion error:', error);
      return { success: false, message: 'Failed to delete account' };
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const currentUser = await AsyncStorage.getItem('currentUser');
      return !!currentUser;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('currentUser');
    } catch (error) {
      return null;
    }
  }
}

export default new SecurityService();
