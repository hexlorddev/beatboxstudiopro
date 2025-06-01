import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  TextInput,
  Modal,
  Animated,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';

const { width, height } = Dimensions.get('window');

interface BeatPattern {
  id: string;
  name: string;
  pattern: Array<{ padIndex: number; timestamp: number }>;
  duration: number;
}

interface Sound {
  name: string;
  icon: string;
  gradient: string[];
  audio?: Audio.Sound;
}

const SOUNDS: Sound[] = [
  { name: 'Kick', icon: 'radio-button-on', gradient: ['#FF6B6B', '#FF8E8E'] },
  { name: 'Snare', icon: 'ellipse', gradient: ['#4ECDC4', '#44C6BD'] },
  { name: 'HiHat', icon: 'triangle', gradient: ['#45B7D1', '#4A90E2'] },
  { name: 'Crash', icon: 'star', gradient: ['#F7B733', '#FFC93C'] },
  { name: 'Bass', icon: 'square', gradient: ['#A855F7', '#C084FC'] },
  { name: 'Synth', icon: 'diamond', gradient: ['#EC4899', '#F472B6'] },
  { name: 'Vocal', icon: 'mic', gradient: ['#EF4444', '#F87171'] },
  { name: 'FX', icon: 'flash', gradient: ['#10B981', '#34D399'] },
];

export default function HomeScreen() {
  const [sounds, setSounds] = useState<Sound[]>(SOUNDS);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedPattern, setRecordedPattern] = useState<Array<{ padIndex: number; timestamp: number }>>([]);
  const [recordStartTime, setRecordStartTime] = useState<number>(0);
  const [savedPatterns, setSavedPatterns] = useState<BeatPattern[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [patternName, setPatternName] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPage, setCurrentPage] = useState('beatbox');
  
  // Animation refs
  const padAnimations = useRef(SOUNDS.map(() => new Animated.Value(1))).current;
  const recordingPulse = useRef(new Animated.Value(1)).current;
  const beatVisualization = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadSounds();
    loadSavedPatterns();
    startRecordingAnimation();
  }, []);

  const loadSounds = async () => {
    try {
      const updatedSounds = await Promise.all(
        SOUNDS.map(async (sound, index) => {
          // Using placeholder audio URLs for demo
          const { sound: audioSound } = await Audio.Sound.createAsync(
            { uri: `https://api.a0.dev/assets/audio/${sound.name.toLowerCase()}.mp3` },
            { shouldPlay: false }
          );
          return { ...sound, audio: audioSound };
        })
      );
      setSounds(updatedSounds);
    } catch (error) {
      // Fallback for demo - sounds will still work with visual feedback
      console.log('Audio loading skipped for demo');
    }
  };

  const loadSavedPatterns = async () => {
    try {
      const patterns = await AsyncStorage.getItem('beatPatterns');
      if (patterns) {
        setSavedPatterns(JSON.parse(patterns));
      }
    } catch (error) {
      console.log('Error loading patterns:', error);
    }
  };

  const startRecordingAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(recordingPulse, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(recordingPulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const playSound = async (index: number) => {
    try {
      // Haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Visual animation
      Animated.sequence([
        Animated.timing(padAnimations[index], {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(padAnimations[index], {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Beat visualization
      Animated.timing(beatVisualization, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start(() => {
        Animated.timing(beatVisualization, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start();
      });

      // Play audio if available
      const sound = sounds[index];
      if (sound.audio) {
        await sound.audio.replayAsync();
      }

      // Record if recording is active
      if (isRecording) {
        const timestamp = Date.now() - recordStartTime;
        setRecordedPattern(prev => [...prev, { padIndex: index, timestamp }]);
      }

    } catch (error) {
      console.log('Error playing sound:', error);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      if (recordedPattern.length > 0) {
        setShowSaveModal(true);
      } else {
        toast.success('Recording stopped');
      }
    } else {
      setIsRecording(true);
      setRecordedPattern([]);
      setRecordStartTime(Date.now());
      toast.success('Recording started! Tap pads to record pattern');
    }
  };

  const savePattern = async () => {
    if (!patternName.trim()) {
      toast.error('Please enter a pattern name');
      return;
    }

    const newPattern: BeatPattern = {
      id: Date.now().toString(),
      name: patternName.trim(),
      pattern: recordedPattern,
      duration: recordedPattern.length > 0 ? 
        recordedPattern[recordedPattern.length - 1].timestamp + 1000 : 1000,
    };

    try {
      const updatedPatterns = [...savedPatterns, newPattern];
      await AsyncStorage.setItem('beatPatterns', JSON.stringify(updatedPatterns));
      setSavedPatterns(updatedPatterns);
      setShowSaveModal(false);
      setPatternName('');
      toast.success(`Pattern "${newPattern.name}" saved!`);
    } catch (error) {
      toast.error('Error saving pattern');
    }
  };

  const playPattern = async (pattern: BeatPattern) => {
    if (isPlaying) return;
    
    setIsPlaying(true);
    toast.success(`Playing "${pattern.name}"`);

    for (const beat of pattern.pattern) {
      setTimeout(() => {
        playSound(beat.padIndex);
      }, beat.timestamp);
    }

    setTimeout(() => {
      setIsPlaying(false);
    }, pattern.duration);
  };

  const deletePattern = async (patternId: string) => {
    try {
      const updatedPatterns = savedPatterns.filter(p => p.id !== patternId);
      await AsyncStorage.setItem('beatPatterns', JSON.stringify(updatedPatterns));
      setSavedPatterns(updatedPatterns);
      toast.success('Pattern deleted');
    } catch (error) {
      toast.error('Error deleting pattern');
    }
  };

  const renderBeatBox = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>BeatBox</Text>
        <Text style={styles.headerSubtitle}>Create amazing beats</Text>
        
        {/* Beat Visualization */}
        <Animated.View 
          style={[
            styles.beatVisualization,
            {
              opacity: beatVisualization,
              transform: [{ scaleX: beatVisualization.interpolate({
                inputRange: [0, 1],
                outputRange: [0.1, 1],
              })}]
            }
          ]}
        />
      </View>

      {/* Sound Pads */}
      <View style={styles.padsContainer}>
        {sounds.map((sound, index) => (
          <Animated.View
            key={index}
            style={[
              styles.padWrapper,
              { transform: [{ scale: padAnimations[index] }] }
            ]}
          >
            <TouchableOpacity
              onPress={() => playSound(index)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={sound.gradient}
                style={styles.pad}
              >
                <Ionicons 
                  name={sound.icon as any} 
                  size={32} 
                  color="white" 
                />
                <Text style={styles.padText}>{sound.name}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          onPress={toggleRecording}
          style={styles.controlButton}
        >
          <Animated.View
            style={[
              styles.recordButton,
              isRecording && { transform: [{ scale: recordingPulse }] }
            ]}
          >
            <Ionicons 
              name={isRecording ? "stop" : "radio-button-on"} 
              size={24} 
              color="white" 
            />
          </Animated.View>
          <Text style={styles.controlText}>
            {isRecording ? 'STOP' : 'REC'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCurrentPage('patterns')}
          style={styles.controlButton}
        >
          <View style={styles.patternsButton}>
            <Ionicons name="library" size={24} color="white" />
          </View>
          <Text style={styles.controlText}>PATTERNS</Text>
        </TouchableOpacity>
      </View>

      {/* Saved Patterns Preview */}
      {savedPatterns.length > 0 && (
        <View style={styles.patternsPreview}>
          <Text style={styles.sectionTitle}>Recent Patterns</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {savedPatterns.slice(-3).map((pattern) => (
              <TouchableOpacity
                key={pattern.id}
                onPress={() => playPattern(pattern)}
                style={styles.patternCard}
                disabled={isPlaying}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.patternCardGradient}
                >
                  <Ionicons name="play" size={16} color="white" />
                  <Text style={styles.patternCardText}>{pattern.name}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );

  const renderPatterns = () => (
    <View style={styles.container}>
      <View style={styles.patternsHeader}>
        <TouchableOpacity
          onPress={() => setCurrentPage('beatbox')}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.patternsTitle}>Saved Patterns</Text>
      </View>

      <ScrollView style={styles.patternsList}>
        {savedPatterns.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="musical-notes-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No patterns saved yet</Text>
            <Text style={styles.emptySubtext}>Record some beats to get started!</Text>
          </View>
        ) : (
          savedPatterns.map((pattern) => (
            <View key={pattern.id} style={styles.patternItem}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.patternItemGradient}
              >
                <View style={styles.patternInfo}>
                  <Text style={styles.patternName}>{pattern.name}</Text>
                  <Text style={styles.patternDetails}>
                    {pattern.pattern.length} beats • {Math.round(pattern.duration / 1000)}s
                  </Text>
                </View>
                <View style={styles.patternActions}>
                  <TouchableOpacity
                    onPress={() => playPattern(pattern)}
                    style={styles.playButton}
                    disabled={isPlaying}
                  >
                    <Ionicons name="play" size={20} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => deletePattern(pattern.id)}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      {currentPage === 'beatbox' ? renderBeatBox() : renderPatterns()}

      {/* Save Pattern Modal */}
      <Modal
        visible={showSaveModal}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Save Beat Pattern</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter pattern name..."
              value={patternName}
              onChangeText={setPatternName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setShowSaveModal(false)}
                style={[styles.modalButton, styles.cancelButton]}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={savePattern}
                style={[styles.modalButton, styles.saveButton]}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 20,
  },
  beatVisualization: {
    width: width * 0.8,
    height: 4,
    backgroundColor: '#667eea',
    borderRadius: 2,
  },
  padsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  padWrapper: {
    width: width * 0.4,
    marginBottom: 20,
  },
  pad: {
    width: '100%',
    height: 100,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  padText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
    marginTop: 30,
  },
  controlButton: {
    alignItems: 'center',
  },
  recordButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  patternsButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#9b59b6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  controlText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  patternsPreview: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  patternCard: {
    marginRight: 15,
  },
  patternCardGradient: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  patternCardText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  patternsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'white',
  },
  backButton: {
    marginRight: 15,
  },
  patternsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  patternsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  patternItem: {
    marginBottom: 15,
  },
  patternItemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 15,
  },
  patternInfo: {
    flex: 1,
  },
  patternName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  patternDetails: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  patternActions: {
    flexDirection: 'row',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(231,76,60,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    width: width * 0.8,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  modalInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f8f8',
    marginRight: 10,
  },
  saveButton: {
    backgroundColor: '#667eea',
    marginLeft: 10,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});