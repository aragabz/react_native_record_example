import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import * as RNFS from 'react-native-fs';
import Sound, {
  AudioEncoderAndroidType,
  AudioSourceAndroidType,
  AVEncoderAudioQualityIOSType,
  AVEncodingOption,
  RecordBackType,
  PlayBackType,
} from 'react-native-nitro-sound';

interface RecordingItem {
  id: string;
  name: string;
  duration: string;
  path: string;
  date: string;
  isPlaying?: boolean;
}

const RecordingsScreen = () => {
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentRecordingPath, setCurrentRecordingPath] = useState<string | null>(null);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  
  // Animation values
  const buttonScale = useRef(new Animated.Value(1)).current;
  const buttonRotation = useRef(new Animated.Value(0)).current;
  
  // Request recording permissions
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        ]);
        
        if (
          grants['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED &&
          grants['android.permission.WRITE_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED
        ) {
          return true;
        } else {
          Alert.alert('Permissions Required', 'Audio recording permissions are required');
          return false;
        }
      } catch (err) {
        console.error('Permission request error:', err);
        return false;
      }
    }
    return true; // iOS handles permissions through Info.plist
  };
  
  // Start recording function
  const startRecording = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;
    
    try {
      setIsLoading(true);
      const timestamp = Date.now();
      // Use the app's document directory which is writable
      const recordingPath = Platform.OS === 'ios' 
        ? `${RNFS.DocumentDirectoryPath}/recording_${timestamp}.m4a`
        : `${RNFS.ExternalDirectoryPath}/recording_${timestamp}.m4a`;
      
      console.log('Recording to path:', recordingPath);
      
      // Set up recording options
      const audioSet = {
        AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
        AudioSourceAndroid: AudioSourceAndroidType.MIC,
        AVEncoderAudioQualityKeyIOS: AVEncoderAudioQualityIOSType.high,
        AVNumberOfChannelsKeyIOS: 2,
        // AVFormatIDKeyIOS: AVEncodingOption.aac,
      };
      
      // Start recording with options
      await Sound.startRecorder(recordingPath, audioSet);
      setIsRecording(true);
      setCurrentRecordingPath(recordingPath);
      setRecordingStartTime(Date.now());
      
      // Start animation
      startPulseAnimation();
    } catch (error) {
      Alert.alert('Error', 'Failed to start recording');
      console.error('Recording error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to format time in mm:ss
  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Stop recording function
  const stopRecording = async () => {
    if (!isRecording || !currentRecordingPath) return;
    
    try {
      setIsLoading(true);
      const result = await Sound.stopRecorder();
      setIsRecording(false);
      
      // Stop animation
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();
      
      // Calculate actual recording duration based on start time
      let duration = '00:00';
      if (recordingStartTime) {
        const recordingDuration = Date.now() - recordingStartTime;
        duration = formatTime(recordingDuration);
        setRecordingStartTime(null);
      }
      
      // Add the recording to the list
      const newRecording: RecordingItem = {
        id: Date.now().toString(),
        name: `Recording ${recordings.length + 1}`,
        duration: duration,
        path: currentRecordingPath,
        date: new Date().toLocaleString(),
        isPlaying: false
      };
      
      setRecordings([...recordings, newRecording]);
      setCurrentRecordingPath(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to stop recording');
      console.error('Stop recording error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Play a recording
  const playRecording = async (item: RecordingItem) => {
    try {
      setIsLoading(true);
      
      // If already playing, stop it
      if (currentlyPlayingId) {
        await Sound.stopPlayer();
        Sound.removePlayBackListener();
        
        // If clicking the same item that's playing, just stop it
        if (currentlyPlayingId === item.id) {
          setCurrentlyPlayingId(null);
          setIsLoading(false);
          return;
        }
      }
      
      // Mark this item as playing
      setCurrentlyPlayingId(item.id);
      
      await Sound.startPlayer(item.path);
      
      // Set up player event listener
      Sound.addPlayBackListener((e) => {
        // Update duration in real-time if needed
        
        if (e.currentPosition === e.duration) {
          Sound.stopPlayer();
          Sound.removePlayBackListener();
          setCurrentlyPlayingId(null);
        }
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to play recording');
      console.error('Play error:', error);
      setCurrentlyPlayingId(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Animation for the recording button
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(buttonScale, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    Animated.timing(buttonRotation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };
  
  // Map to store animation values for each recording item
  const playButtonScales = useRef<{[key: string]: Animated.Value}>({}).current;
  
  // Function to get or create an animation value for an item
  const getPlayButtonScale = (id: string) => {
    if (!playButtonScales[id]) {
      playButtonScales[id] = new Animated.Value(1);
    }
    return playButtonScales[id];
  };
  
  // Handle animation for playing items
  useEffect(() => {
    // Stop all animations first
    Object.keys(playButtonScales).forEach(id => {
      playButtonScales[id].stopAnimation();
      playButtonScales[id].setValue(1);
    });
    
    // Start animation for the currently playing item
    if (currentlyPlayingId) {
      const playingScale = playButtonScales[currentlyPlayingId];
      if (playingScale) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(playingScale, {
              toValue: 1.2,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(playingScale, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }
    }
  }, [currentlyPlayingId]);
  
  // Render each recording item
  const renderItem = ({ item }: { item: RecordingItem }) => {
    // Get the animation value for this item
    const playButtonScale = getPlayButtonScale(item.id);
    
    return (
      <View style={styles.recordingItem}>
        <TouchableOpacity 
          style={styles.recordingInfo}
          onPress={() => playRecording(item)}
        >
          <Text style={styles.recordingName}>{item.name}</Text>
          <Text style={styles.recordingDate}>{item.date}</Text>
        </TouchableOpacity>
        
        <View style={styles.rightContainer}>
          <Text style={styles.recordingDuration}>{item.duration}</Text>
          
          <TouchableOpacity 
            style={styles.playButton}
            onPress={() => playRecording(item)}
          >
            <Animated.View style={[
              styles.playButtonInner, 
              { transform: [{ scale: playButtonScale }] },
              currentlyPlayingId === item.id ? styles.playButtonPlaying : null
            ]}>
              <Text style={styles.playButtonIcon}>
                {currentlyPlayingId === item.id ? '■' : '▶'}
              </Text>
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  // Calculate rotation for the FAB
  const rotation = buttonRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recordings</Text>
      
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>
            {isRecording ? 'Recording...' : 'Processing...'}
          </Text>
        </View>
      )}
      
      {recordings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No recordings yet</Text>
          <Text style={styles.emptySubText}>Tap the button below to start recording</Text>
        </View>
      ) : (
        <FlatList
          data={recordings}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
      
      <Animated.View 
        style={[
          styles.fabContainer, 
          { 
            transform: [
              { scale: buttonScale },
              { rotate: isRecording ? rotation : '0deg' }
            ] 
          }
        ]}
      >
        <TouchableOpacity
          style={[styles.fab, isRecording && styles.fabRecording]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={isLoading}
        >
          <View style={isRecording ? styles.stopIcon : styles.recordIcon} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    margin: 16,
    color: '#333',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    padding: 10,
    zIndex: 1000,
  },
  loadingText: {
    color: 'white',
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: 100, // Space for FAB
  },
  recordingItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  recordingInfo: {
    flex: 1,
  },
  recordingName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  recordingDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  recordingDuration: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
    marginRight: 10,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonPlaying: {
    backgroundColor: '#F44336',
  },
  playButtonIcon: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  fabContainer: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ff4757',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabRecording: {
    backgroundColor: '#ff6b81',
  },
  recordIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  stopIcon: {
    width: 20,
    height: 20,
    backgroundColor: 'white',
  },
});

export default RecordingsScreen;