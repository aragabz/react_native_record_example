import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ProgressBarAndroid,
  Platform,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useAudioUpload } from '../hooks/useAudioUpload';
import { AudioFile } from '../services/audioService';

const AudioUploader: React.FC = () => {
  const { uploading, progress, error, uploadedFile, uploadAudio, reset } = useAudioUpload();
  const [selectedFile, setSelectedFile] = useState<AudioFile | null>(null);

  const selectAudioFile = () => {
    const options = {
      mediaType: 'mixed' as const,
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel || response.errorMessage) {
        return;
      }

      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        
        // Check if it's an audio file
        if (!asset.type?.startsWith('audio/')) {
          Alert.alert('Error', 'Please select an audio file');
          return;
        }

        const audioFile: AudioFile = {
          uri: asset.uri!,
          name: asset.fileName || `audio_${Date.now()}.wav`,
          type: asset.type || 'audio/mpeg',
          size: asset.fileSize,
        };

        setSelectedFile(audioFile);
      }
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select an audio file first');
      return;
    }

    try {
      await uploadAudio(selectedFile);
      Alert.alert('Success', 'Audio uploaded successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to upload audio');
    }
  };

  const handleReset = () => {
    reset();
    setSelectedFile(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audio Uploader</Text>

      {!selectedFile && (
        <TouchableOpacity style={styles.selectButton} onPress={selectAudioFile}>
          <Text style={styles.buttonText}>Select Audio File</Text>
        </TouchableOpacity>
      )}

      {selectedFile && (
        <View style={styles.fileInfo}>
          <Text style={styles.fileName}>Selected: {selectedFile.name}</Text>
          <Text style={styles.fileSize}>
            Size: {selectedFile.size ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown'}
          </Text>
          
          {!uploading && !uploadedFile && (
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.uploadButton} onPress={handleUpload}>
                <Text style={styles.buttonText}>Upload Audio</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={handleReset}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {uploading && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>Uploading... {progress}%</Text>
          {Platform.OS === 'android' ? (
            <ProgressBarAndroid
              styleAttr="Horizontal"
              indeterminate={false}
              progress={progress / 100}
              color="#0066cc"
            />
          ) : (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          )}
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleUpload}>
            <Text style={styles.buttonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {uploadedFile && (
        <View style={styles.successContainer}>
          <Text style={styles.successText}>✅ Upload Successful!</Text>
          <Text style={styles.uploadInfo}>File ID: {uploadedFile.id}</Text>
          <Text style={styles.uploadInfo}>URL: {uploadedFile.url}</Text>
          <TouchableOpacity style={styles.newUploadButton} onPress={handleReset}>
            <Text style={styles.buttonText}>Upload Another</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  selectButton: {
    backgroundColor: '#0066cc',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadButton: {
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  cancelButton: {
    backgroundColor: '#dc3545',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginLeft: 10,
  },
  retryButton: {
    backgroundColor: '#ffc107',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  newUploadButton: {
    backgroundColor: '#0066cc',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fileInfo: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  fileName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  fileSize: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  buttonRow: {
    flexDirection: 'row',
  },
  progressContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  progressText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0066cc',
  },
  errorContainer: {
    backgroundColor: '#f8d7da',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#721c24',
    fontSize: 16,
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: '#d4edda',
    padding: 15,
    borderRadius: 8,
  },
  successText: {
    color: '#155724',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  uploadInfo: {
    color: '#155724',
    fontSize: 14,
    marginBottom: 5,
  },
});

export default AudioUploader;