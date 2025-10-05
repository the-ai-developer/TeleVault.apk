#!/bin/bash

# Set Java 21 for this session
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk
export PATH=$JAVA_HOME/bin:$PATH

echo "🚀 Building TeleVault Release APK! 🔥"
echo "Java Version: $(java -version 2>&1 | head -n1)"
echo "========================================="

# Navigate to android directory
cd android

# Clean previous builds
echo "🧹 Cleaning previous builds..."
./gradlew clean

# Build release APK
echo "🔨 Building release APK..."
./gradlew assembleRelease

# Check if build was successful and show results
if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
    echo ""
    echo "🎉 SUCCESS! APK built successfully!"
    echo "📱 APK Location: android/app/build/outputs/apk/release/app-release.apk"
    
    # Get file size
    apk_size=$(du -h app/build/outputs/apk/release/app-release.apk | cut -f1)
    echo "📊 APK Size: $apk_size"
    
    # Copy APK to root directory for easy access
    cp app/build/outputs/apk/release/app-release.apk ../TeleVault-release.apk
    echo "📋 Copied to: TeleVault-release.apk"
    
    echo ""
    echo "🚀 Ready for mobile installation!"
    echo "📲 Transfer TeleVault-release.apk to your Android device and install!"
    echo "💡 Remember to enable 'Install from unknown sources' in Android settings"
else
    echo "❌ Build failed! Check the logs above."
    exit 1
fi
