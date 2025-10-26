import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import Sound from 'react-native-nitro-sound';

interface AudioResponseSheetProps {
  visible: boolean;
  audioPath: string | null;
  onClose: () => void;
}

const AudioResponseSheet: React.FC<AudioResponseSheetProps> = ({
  visible,
  audioPath,
  onClose,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const sheetAnimation = useRef(new Animated.Value(0)).current;
  const playButtonScale = useRef(new Animated.Value(1)).current;
  
  // Waveform animation values for visual effect
  const waveformValues = useRef(
    Array.from({ length: 20 }, () => new Animated.Value(0))
  ).current;
  const waveAnimationRef = useRef<NodeJS.Timeout | null>(null);

  const { height } = Dimensions.get('window');

  useEffect(() => {
    if (visible) {
      showSheet();
    } else {
      hideSheet();
    }
  }, [visible]);

  useEffect(() => {
    if (isPlaying) {
      startWaveformAnimation();
    } else {
      stopWaveformAnimation();
    }
  }, [isPlaying]);

  const showSheet = () => {
    Animated.timing(sheetAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const hideSheet = () => {
    Animated.timing(sheetAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const startWaveformAnimation = () => {
    if (waveAnimationRef.current) {
      clearInterval(waveAnimationRef.current);
    }

    waveAnimationRef.current = setInterval(() => {
      waveformValues.forEach((value) => {
        Animated.timing(value, {
          toValue: Math.random() * 30 + 5,
          duration: 200,
          useNativeDriver: false,
        }).start();
      });
    }, 200);
  };

  const stopWaveformAnimation = () => {
    if (waveAnimationRef.current) {
      clearInterval(waveAnimationRef.current);
      waveAnimationRef.current = null;

      waveformValues.forEach((value) => {
        Animated.timing(value, {
          toValue: 5,
          duration: 200,
          useNativeDriver: false,
        }).start();
      });
    }
  };

  const playAudio = async () => {
    if (!audioPath) {
      Alert.alert('Error', 'No audio response available');
      return;
    }

    try {
      setIsLoading(true);

      if (isPlaying) {
        // Stop playing
        await Sound.stopPlayer();
        Sound.removePlayBackListener();
        setIsPlaying(false);
      } else {
        // Start playing
        await Sound.startPlayer(audioPath);
        setIsPlaying(true);

        // Set up player event listener
        Sound.addPlayBackListener((e) => {
          if (e.currentPosition === e.duration) {
            Sound.stopPlayer();
            Sound.removePlayBackListener();
            setIsPlaying(false);
          }
        });

        // Animate play button
        Animated.loop(
          Animated.sequence([
            Animated.timing(playButtonScale, {
              toValue: 1.1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(playButtonScale, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }
    } catch (error) {
      console.error('Audio playback error:', error);
      Alert.alert('Error', 'Failed to play audio response');
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = async () => {
    if (isPlaying) {
      await Sound.stopPlayer();
      Sound.removePlayBackListener();
      setIsPlaying(false);
    }
    stopWaveformAnimation();
    onClose();
  };

  // Calculate sheet translation
  const sheetTranslateY = sheetAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [height, 0],
  });

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY: sheetTranslateY }] }
        ]}
      >
        <View style={styles.handle} />
        
        <View style={styles.content}>
          <Text style={styles.title}>🎵 Audio Response</Text>
          
          {/* Waveform visualization */}
          <View style={styles.waveformContainer}>
            {waveformValues.map((value, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.waveBar,
                  {
                    height: value,
                    backgroundColor: `rgba(52, 152, 219, ${0.6 + (index % 3) * 0.15})`,
                  }
                ]}
              />
            ))}
          </View>

          {/* Play/Stop button */}
          <Animated.View style={{ transform: [{ scale: playButtonScale }] }}>
            <TouchableOpacity
              style={[styles.playButton, isPlaying && styles.playButtonActive]}
              onPress={playAudio}
              disabled={isLoading}
            >
              <Text style={styles.playButtonIcon}>
                {isLoading ? '⏳' : isPlaying ? '⏸️' : '▶️'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.instruction}>
            {isPlaying ? 'Playing response...' : 'Tap to play response'}
          </Text>

          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 2000,
  },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: 350,
    padding: 20,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#ddd',
    borderRadius: 3,
    marginBottom: 20,
  },
  content: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  waveformContainer: {
    width: '80%',
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 30,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: '#3498db',
    marginHorizontal: 1,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  playButtonActive: {
    backgroundColor: '#F44336',
  },
  playButtonIcon: {
    fontSize: 30,
    color: 'white',
  },
  instruction: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AudioResponseSheet;