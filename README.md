# 🌟 TeleVault - Secure File Storage & Management App

[![React Native](https://img.shields.io/badge/React_Native-0.81.4-blue.svg)](https://reactnative.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **TeleVault** is a powerful React Native mobile app that transforms Telegram into your personal cloud storage vault. Securely store, manage, and access your files from anywhere with military-grade encryption and offline support.

## 🚀 Features

### 🔐 Security & Authentication
- **AES-256 Encryption** for sensitive data and credentials
- **PBKDF2 Password Hashing** with 10,000 iterations
- **Salt-based Security** with unique salt per user
- **Secure Session Management**

### 💾 File Management
- **Advanced File Upload** to Telegram with progress tracking
- **File Organization** with smart categorization (images, documents, videos, etc.)
- **Powerful Search** by filename, tags, categories, and file type
- **Bulk Operations** - select, move, delete, and download multiple files
- **File Preview** for images, PDFs, and documents

### 📊 Analytics & Storage
- **Real Storage Analytics** with detailed usage statistics
- **Storage Limits** monitoring (virtual 10GB limit)
- **File Type Distribution** charts and insights
- **Usage Reports** and storage optimization suggestions

### 🔄 Offline & Sync
- **Offline Queue System** - uploads work without internet connection
- **Smart Queue Management** with retry logic for failed uploads
- **Background Sync** - automatic upload resumption when online
- **Connection-aware UI** with offline indicators

### 🎨 User Experience
- **Modern Material Design** with intuitive navigation
- **Dark Mode Support** with system theming
- **Responsive UI** optimized for various screen sizes
- **Fast Refresh** for development

## 🛠️ Technology Stack

- **Framework**: React Native 0.81.4
- **Language**: TypeScript 5.8.3
- **Navigation**: React Navigation v7
- **State Management**: React Hooks
- **Styling**: Tailwind CSS (NativeWind)
- **Storage**: AsyncStorage + SQLite
- **Encryption**: CryptoJS (AES-256)
- **Backend**: Telegram Bot API
- **Build**: Metro + Gradle

## 📋 Prerequisites

Before running this project, make sure you have:

- **Node.js** 18 or higher
- **React Native CLI**
- **Android Studio** (for Android development)
- **Xcode** (for iOS development, macOS only)
- **Java JDK 11+**
- **Watchman** (optional, improves file watching)

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
<<<<<<< HEAD
git clone https://github.com/the-ai-developer/TeleVault.apk.git
cd TeleVault
=======
git clone https://github.com/your-username/tele-vault.git
cd tele-vault
>>>>>>> 5411959 (Add comprehensive README.md and update .gitignore)
```

### 2. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 3. Install iOS Dependencies (macOS only)
```bash
cd ios
bundle install
bundle exec pod install
cd ..
```

### 4. Configure Environment
Create your Telegram Bot and get required credentials:
- Register a bot with [@BotFather](https://t.me/botfather)
- Create a private supergroup for file storage
- Add your bot as administrator to the group
- Get the supergroup ID (you can use [@userinfobot](https://t.me/userinfobot) or other tools)

Update the configuration in `src/config/environment.ts`:
```typescript
export const CONFIG = {
  TELEGRAM_BOT_TOKEN: 'YOUR_BOT_TOKEN_HERE',
  TELEGRAM_SUPERGROUP_ID: 'YOUR_SUPERGROUP_ID_HERE',
};
```

### 5. Start Metro Development Server
```bash
npm start
```

### 6. Run on Device/Emulator

**Android:**
```bash
npm run android
```

**iOS (macOS only):**
```bash
npm run ios
```

## 📱 Building Production APK

For detailed Android build instructions, see [BUILD_INSTRUCTIONS.md](./BUILD_INSTRUCTIONS.md)

### Quick Release Build:
```bash
cd android
./gradlew assembleRelease
```

The APK will be generated at: `android/app/build/outputs/apk/release/app-release.apk`

## 🔧 Development Scripts

### Running the App
```bash
npm start          # Start Metro bundler
npm run android    # Run on Android
npm run ios        # Run on iOS
```

### Code Quality
```bash
npm run lint      # Run ESLint
npm test          # Run Jest tests
```

### Building
```bash
npm run build-apk # Build debug APK (see build-apk.sh)
```

## 📂 Project Structure

```
TeleVault/
├── android/                 # Android native code
├── ios/                     # iOS native code
├── src/
│   ├── components/          # Reusable UI components
│   ├── config/              # Environment configuration
│   ├── screens/             # App screens/pages
│   │   ├── AuthScreen.tsx   # Login/Signup screen
│   │   ├── HomeScreen.tsx   # Main file management
│   │   ├── UploadScreen.tsx # File upload interface
│   │   ├── ProfileScreen.tsx # Analytics & settings
│   │   └── FileViewerScreen.tsx # File preview
│   ├── services/            # Business logic & APIs
│   │   ├── telegramService.ts    # Telegram API integration
│   │   ├── databaseService.ts    # Local SQLite database
│   │   ├── securityService.ts    # Encryption & auth
│   │   ├── storageService.ts     # Storage analytics
│   │   └── offlineQueueService.ts # Offline functionality
│   ├── utils/               # Utility functions
│   └── types.d.ts           # TypeScript type definitions
├── __tests__/               # Unit tests
├── .eslintrc.js            # ESLint configuration
├── jest.config.js          # Jest configuration
├── metro.config.js         # Metro bundler config
├── tailwind.config.js      # Tailwind CSS config
└── tsconfig.json           # TypeScript configuration
```

## 🔒 Security Features

- **End-to-End Security**: Files stored securely via Telegram's infrastructure
- **AES-256 Encryption**: User credentials and sensitive data are encrypted
- **Password Hashing**: PBKDF2 with 10,000 iterations for secure authentication
- **Secure API Keys**: Environment-based configuration for sensitive credentials
- **Offline Data Protection**: Local data is encrypted and securely stored

## 🎯 Usage Guide

### First Time Setup
1. Launch the app and create your account with a strong password
2. Grant necessary permissions (storage, camera, etc.)
3. You're ready to start uploading files!

### File Management
- **Upload**: Tap the + button or use the Upload screen
- **Browse**: Use filters to find files by type, date, or search
- **Preview**: Tap any file to view details and content
- **Bulk Actions**: Long-press to select multiple files

### Offline Usage
- Upload files while offline - they'll be queued automatically
- View local status in the Profile screen
- Files sync when connection is restored

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Telegram Bot API** for providing powerful messaging infrastructure
- **React Native Community** for amazing development tools
- **Expo** for helpful utilities and libraries
- The open-source community for inspiration and support

## 📞 Support

If you have questions, feature requests, or need help:

<<<<<<< HEAD
- Create an [issue](https://github.com/the-ai-developer/TeleVault.apk/issues) on GitHub
=======
- Create an [issue](https://github.com/your-username/tele-vault/issues) on GitHub
>>>>>>> 5411959 (Add comprehensive README.md and update .gitignore)
- Check the [BUILD_INSTRUCTIONS.md](./BUILD_INSTRUCTIONS.md) for additional setup help
- Review the troubleshooting section in the React Native docs

---

**Made with ❤️ by the development team**

> *Transforming ideas into reality, one commit at a time!*
