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
  Dimensions,
  Modal,
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
  const [isRecordingSheetVisible, setIsRecordingSheetVisible] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState('00:00');
  
  // Animation values
  const buttonScale = useRef(new Animated.Value(1)).current;
  const buttonRotation = useRef(new Animated.Value(0)).current;
  const sheetAnimation = useRef(new Animated.Value(0)).current;
  
  // Timer reference
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get screen dimensions
  const { height } = Dimensions.get('window');
  
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
  
  // Show recording sheet
  const showRecordingSheet = () => {
    setIsRecordingSheetVisible(true);
    Animated.timing(sheetAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };
  
  // Hide recording sheet
  const hideRecordingSheet = () => {
    Animated.timing(sheetAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsRecordingSheetVisible(false);
    });
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
      setRecordingDuration('00:00');
      
      // Start timer to update duration
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      const startTime = Date.now();
      setRecordingStartTime(startTime);
      
      timerRef.current = setInterval(() => {
        const duration = Date.now() - startTime;
        setRecordingDuration(formatTime(duration));
      }, 500);
      
      // Show the recording sheet
      showRecordingSheet();
      
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
      
      // Save the current duration before clearing the timer
      const finalDuration = recordingDuration;
      
      // Clear the timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Hide the recording sheet
      hideRecordingSheet();
      
      // Stop animation
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();
      
      // Use the saved duration value
      let duration = finalDuration;
      setRecordingStartTime(null);
      
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
    // Stop any existing animation
    buttonScale.stopAnimation();
    
    // Reset to initial value
    buttonScale.setValue(1);
    
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
  
  // Calculate sheet translation based on animation value
  const sheetTranslateY = sheetAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [height, 0],
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recordings</Text>
      
      {isLoading && !isRecording && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Processing...</Text>
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
      
      {/* Recording Sheet */}
      {isRecordingSheetVisible && (
        <View style={styles.sheetOverlay}>
          <Animated.View 
            style={[
              styles.recordingSheet,
              { transform: [{ translateY: sheetTranslateY }] }
            ]}
          >
            <View style={styles.sheetHandle} />
            
            <View style={styles.recordingContent}>
              <View style={styles.waveformContainer}>
                <View style={styles.waveform} />
              </View>
              
              <Text style={styles.recordingTime}>
                {recordingDuration}
              </Text>
              
              <View style={styles.recordingControls}>
                <TouchableOpacity 
                  style={styles.stopRecordingButton}
                  onPress={stopRecording}
                >
                  <View style={styles.stopRecordingIcon} />
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      )}
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
  // Recording sheet styles
  sheetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  recordingSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: 300,
    padding: 20,
    alignItems: 'center',
  },
  sheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#ddd',
    borderRadius: 3,
    marginBottom: 20,
  },
  recordingContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  waveformContainer: {
    width: '100%',
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveform: {
    width: '100%',
    height: 60,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
  },
  recordingTime: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 20,
  },
  recordingControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  stopRecordingButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#ff4c4c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopRecordingIcon: {
    width: 30,
    height: 30,
    backgroundColor: 'white',
    borderRadius: 5,
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