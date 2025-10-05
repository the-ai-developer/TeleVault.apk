fff#!/bin/bash

echo "🚀 Building TeleVault APK for Android! 🔥"
echo "========================================="

# Set Java version to JDK 21
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk
export PATH=$JAVA_HOME/bin:$PATH

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf android/app/build/outputs/apk/

# Build release APK
echo "🔨 Building release APK..."
cd android
./gradlew clean
./gradlew assembleRelease

# Check if build was successful
if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
    echo "🎉 SUCCESS! APK built successfully!"
    echo "📱 Location: android/app/build/outputs/apk/release/app-release.apk"
    echo "📊 APK Size: $(du -h app/build/outputs/apk/release/app-release.apk | cut -f1)"
    echo ""
    echo "🚀 Ready for mobile testing with your mobile data!"
    echo "📲 Install this APK on your Android device and test!"
else
    echo "❌ Build failed! Check the logs above."
    exit 1
fi
