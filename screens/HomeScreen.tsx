import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  TextInput,
  Modal,
  Alert,
  StatusBar,
  Animated,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

interface BeatPattern {
  id: string;
  name: string;
  pattern: Array<{ padIndex: number; timestamp: number }>;
  duration: number;
  bpm: number;
}

interface Sound {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: string[];
  sound?: Audio.Sound;
  category: string;
}

const SOUNDS: Sound[] = [
  // Drums
  { name: 'Kick', icon: 'radio', colors: ['#FF6B6B', '#FF8E8E'], category: 'drums' },
  { name: 'Snare', icon: 'disc', colors: ['#4ECDC4', '#44C6BD'], category: 'drums' },
  { name: 'HiHat', icon: 'flash', colors: ['#45B7D1', '#4A90E2'], category: 'drums' },
  { name: 'Crash', icon: 'pulse', colors: ['#F7B733', '#FFC93C'], category: 'drums' },
  { name: 'Tom', icon: 'radio-outline', colors: ['#8B5CF6', '#A78BFA'], category: 'drums' },
  { name: 'Ride', icon: 'disc-outline', colors: ['#06B6D4', '#67E8F9'], category: 'drums' },
  
  // Bass & Synth
  { name: 'Bass', icon: 'volume-high', colors: ['#A855F7', '#C084FC'], category: 'bass' },
  { name: 'SubBass', icon: 'pulse-outline', colors: ['#7C3AED', '#8B5CF6'], category: 'bass' },
  { name: 'Synth', icon: 'musical-notes', colors: ['#EC4899', '#F472B6'], category: 'synth' },
  { name: 'Lead', icon: 'flash-outline', colors: ['#F59E0B', '#FBBF24'], category: 'synth' },
  { name: 'Pad', icon: 'pulse', colors: ['#10B981', '#34D399'], category: 'synth' },
  { name: 'Arp', icon: 'musical-note', colors: ['#EF4444', '#F87171'], category: 'synth' },
  
  // Vocal & FX
  { name: 'Vocal', icon: 'mic', colors: ['#EF4444', '#F87171'], category: 'vocal' },
  { name: 'Choir', icon: 'headset', colors: ['#8B5CF6', '#A78BFA'], category: 'vocal' },
  { name: 'FX', icon: 'flash', colors: ['#10B981', '#34D399'], category: 'fx' },
  { name: 'Sweep', icon: 'pulse', colors: ['#06B6D4', '#67E8F9'], category: 'fx' },
];

export default function EnhancedBeatBox() {
  const [sounds, setSounds] = useState<Sound[]>(SOUNDS);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedPattern, setRecordedPattern] = useState<Array<{ padIndex: number; timestamp: number }>>([]);
  const [recordStartTime, setRecordStartTime] = useState<number>(0);
  const [savedPatterns, setSavedPatterns] = useState<BeatPattern[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [patternName, setPatternName] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPage, setCurrentPage] = useState('beatbox');
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Animation states
  const [activePads, setActivePads] = useState<Set<number>>(new Set());
  const beatVisualization = useRef(new Animated.Value(0)).current;
  const recordingPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setupAudio();
    loadSavedPatterns();
    startRecordingAnimation();
    
    return () => {
      // Cleanup audio resources
      sounds.forEach(sound => {
        if (sound.sound) {
          sound.sound.unloadAsync();
        }
      });
    };
  }, []);

  const setupAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // In a real app, load actual sound files here
      // For demo purposes, we'll use system sounds or generate tones
      console.log('Audio system initialized');
    } catch (error) {
      console.error('Error setting up audio:', error);
    }
  };

  const loadSavedPatterns = async () => {
    try {
      const patterns = await AsyncStorage.getItem('beatPatterns');
      if (patterns) {
        setSavedPatterns(JSON.parse(patterns));
      }
    } catch (error) {
      console.error('Error loading patterns:', error);
    }
  };

  const startRecordingAnimation = () => {
    if (isRecording) {
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
    } else {
      recordingPulse.setValue(1);
    }
  };

  useEffect(() => {
    startRecordingAnimation();
  }, [isRecording]);

  const playSound = async (index: number) => {
    // Visual feedback
    setActivePads(prev => new Set([...prev, index]));
    setTimeout(() => {
      setActivePads(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }, 150);

    // Beat visualization
    Animated.sequence([
      Animated.timing(beatVisualization, {
        toValue: 1,
        duration: 100,
        useNativeDriver: false,
      }),
      Animated.timing(beatVisualization, {
        toValue: 0,
        duration: 400,
        useNativeDriver: false,
      }),
    ]).start();

    // Play sound (in a real app, you would play actual audio files)
    if (!isMuted) {
      try {
        // For demo purposes, we'll use system sounds or vibration
        // In a real app, load and play actual sound files
        console.log(`Playing ${sounds[index].name} at volume ${volume}`);
        
        // You would load and play actual sound files like this:
        // const { sound } = await Audio.Sound.createAsync(
        //   require('./assets/sounds/kick.wav')
        // );
        // await sound.setVolumeAsync(volume);
        // await sound.playAsync();
      } catch (error) {
        console.error('Error playing sound:', error);
      }
    }

    // Record if recording is active
    if (isRecording) {
      const timestamp = Date.now() - recordStartTime;
      setRecordedPattern(prev => [...prev, { padIndex: index, timestamp }]);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      if (recordedPattern.length > 0) {
        setShowSaveModal(true);
      }
    } else {
      setIsRecording(true);
      setRecordedPattern([]);
      setRecordStartTime(Date.now());
    }
  };

  const savePattern = async () => {
    if (!patternName.trim()) {
      Alert.alert('Error', 'Please enter a pattern name');
      return;
    }

    const newPattern: BeatPattern = {
      id: Date.now().toString(),
      name: patternName.trim(),
      pattern: recordedPattern,
      duration: recordedPattern.length > 0 ? 
        recordedPattern[recordedPattern.length - 1].timestamp + 1000 : 1000,
      bpm: bpm,
    };

    try {
      const updatedPatterns = [...savedPatterns, newPattern];
      await AsyncStorage.setItem('beatPatterns', JSON.stringify(updatedPatterns));
      setSavedPatterns(updatedPatterns);
      setShowSaveModal(false);
      setPatternName('');
      Alert.alert('Success', 'Pattern saved successfully!');
    } catch (error) {
      console.error('Error saving pattern:', error);
      Alert.alert('Error', 'Failed to save pattern');
    }
  };

  const playPattern = async (pattern: BeatPattern) => {
    if (isPlaying) return;
    
    setIsPlaying(true);

    for (const beat of pattern.pattern) {
      setTimeout(() => {
        playSound(beat.padIndex);
      }, beat.timestamp * (120 / pattern.bpm));
    }

    setTimeout(() => {
      setIsPlaying(false);
    }, pattern.duration * (120 / pattern.bpm));
  };

  const deletePattern = async (patternId: string) => {
    Alert.alert(
      'Delete Pattern',
      'Are you sure you want to delete this pattern?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedPatterns = savedPatterns.filter(p => p.id !== patternId);
              await AsyncStorage.setItem('beatPatterns', JSON.stringify(updatedPatterns));
              setSavedPatterns(updatedPatterns);
            } catch (error) {
              console.error('Error deleting pattern:', error);
            }
          },
        },
      ]
    );
  };

  const exportPattern = async (pattern: BeatPattern) => {
    try {
      const patternData = JSON.stringify(pattern, null, 2);
      const fileName = `${pattern.name.replace(/\s+/g, '_')}_pattern.json`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(fileUri, patternData);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Success', `Pattern exported to ${fileName}`);
      }
    } catch (error) {
      console.error('Error exporting pattern:', error);
      Alert.alert('Error', 'Failed to export pattern');
    }
  };

  const filteredSounds = selectedCategory === 'all' 
    ? sounds 
    : sounds.filter(s => s.category === selectedCategory);

  const categories = ['all', 'drums', 'bass', 'synth', 'vocal', 'fx'];

  const renderBeatBox = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1b4b" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>BeatBox Pro</Text>
        <Text style={styles.subtitle}>by Dineth Nethsara</Text>
        <Text style={styles.description}>Create amazing beats with professional tools</Text>
        
        {/* Beat Visualization */}
        <View style={styles.visualizationContainer}>
          <Animated.View
            style={[
              styles.visualizationBar,
              {
                width: beatVisualization.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <View style={styles.controlGroup}>
          <TouchableOpacity
            onPress={() => setIsMuted(!isMuted)}
            style={styles.controlButton}
          >
            <Ionicons
              name={isMuted ? 'volume-mute' : 'volume-high'}
              size={20}
              color="white"
            />
          </TouchableOpacity>
          <Text style={styles.controlLabel}>Vol: {Math.round(volume * 100)}</Text>
        </View>
        
        <View style={styles.controlGroup}>
          <Text style={styles.controlLabel}>BPM: {bpm}</Text>
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryContainer}
        contentContainerStyle={styles.categoryContent}
      >
        {categories.map(category => (
          <TouchableOpacity
            key={category}
            onPress={() => setSelectedCategory(category)}
            style={[
              styles.categoryButton,
              selectedCategory === category && styles.categoryButtonActive
            ]}
          >
            <Text style={[
              styles.categoryText,
              selectedCategory === category && styles.categoryTextActive
            ]}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Sound Pads */}
      <ScrollView style={styles.padsContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.padsGrid}>
          {filteredSounds.map((sound, index) => {
            const originalIndex = sounds.findIndex(s => s.name === sound.name);
            const isActive = activePads.has(originalIndex);
            
            return (
              <TouchableOpacity
                key={sound.name}
                onPress={() => playSound(originalIndex)}
                style={[styles.pad, isActive && styles.padActive]}
              >
                <LinearGradient
                  colors={sound.colors}
                  style={styles.padGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.padContent}>
                    <Ionicons name={sound.icon} size={24} color="white" />
                    <Text style={styles.padText}>{sound.name}</Text>
                  </View>
                  {isActive && <View style={styles.padOverlay} />}
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Recording Controls */}
      <View style={styles.recordingControls}>
        <Animated.View style={{ transform: [{ scale: recordingPulse }] }}>
          <TouchableOpacity
            onPress={toggleRecording}
            style={[
              styles.recordButton,
              isRecording ? styles.recordButtonStop : styles.recordButtonRecord
            ]}
          >
            <Ionicons
              name={isRecording ? 'stop' : 'mic'}
              size={24}
              color="white"
            />
            <Text style={styles.recordButtonText}>
              {isRecording ? 'STOP' : 'RECORD'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          onPress={() => setCurrentPage('patterns')}
          style={styles.patternsButton}
        >
          <Ionicons name="library" size={24} color="white" />
          <Text style={styles.recordButtonText}>PATTERNS</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Patterns Preview */}
      {savedPatterns.length > 0 && (
        <View style={styles.recentPatterns}>
          <Text style={styles.recentTitle}>Recent Patterns</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {savedPatterns.slice(-5).map((pattern) => (
              <TouchableOpacity
                key={pattern.id}
                onPress={() => playPattern(pattern)}
                disabled={isPlaying}
                style={[styles.recentPattern, isPlaying && styles.disabled]}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#6366F1']}
                  style={styles.recentPatternGradient}
                >
                  <Ionicons name="play" size={16} color="white" />
                  <Text style={styles.recentPatternText}>{pattern.name}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Powered by A0 Assets • © 2025 Dineth Nethsara</Text>
        <Text style={styles.footerSubText}>Professional Beat Making Experience</Text>
      </View>
    </SafeAreaView>
  );

  const renderPatterns = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1b4b" />
      
      {/* Header */}
      <View style={styles.patternsHeader}>
        <TouchableOpacity
          onPress={() => setCurrentPage('beatbox')}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.patternsTitle}>Saved Patterns</Text>
        <View style={styles.patternCount}>
          <Text style={styles.patternCountText}>{savedPatterns.length} patterns</Text>
        </View>
      </View>

      {/* Patterns List */}
      <ScrollView style={styles.patternsList}>
        {savedPatterns.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="musical-notes" size={64} color="#64748b" />
            <Text style={styles.emptyTitle}>No patterns saved yet</Text>
            <Text style={styles.emptySubtitle}>Record some beats to get started!</Text>
          </View>
        ) : (
          savedPatterns.map((pattern) => (
            <View key={pattern.id} style={styles.patternCard}>
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.2)', 'rgba(99, 102, 241, 0.2)']}
                style={styles.patternCardGradient}
              >
                <View style={styles.patternInfo}>
                  <Text style={styles.patternName}>{pattern.name}</Text>
                  <Text style={styles.patternDetails}>
                    {pattern.pattern.length} beats • {Math.round(pattern.duration / 1000)}s • {pattern.bpm} BPM
                  </Text>
                </View>
                <View style={styles.patternActions}>
                  <TouchableOpacity
                    onPress={() => playPattern(pattern)}
                    disabled={isPlaying}
                    style={[styles.patternAction, styles.playAction, isPlaying && styles.disabled]}
                  >
                    <Ionicons name="play" size={20} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => exportPattern(pattern)}
                    style={[styles.patternAction, styles.exportAction]}
                  >
                    <Ionicons name="download" size={20} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => deletePattern(pattern.id)}
                    style={[styles.patternAction, styles.deleteAction]}
                  >
                    <Ionicons name="trash" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );

  return (
    <View style={styles.app}>
      {currentPage === 'beatbox' ? renderBeatBox() : renderPatterns()}

      {/* Save Pattern Modal */}
      <Modal
        visible={showSaveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSaveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Save Beat Pattern</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter pattern name..."
              placeholderTextColor="#94a3b8"
              value={patternName}
              onChangeText={setPatternName}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setShowSaveModal(false)}
                style={[styles.modalButton, styles.cancelButton]}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={savePattern}
                style={[styles.modalButton, styles.saveButton]}
              >
                <Text style={styles.modalButtonText}>Save Pattern</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#a855f7',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#c084fc',
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 24,
    textAlign: 'center',
  },
  visualizationContainer: {
    width: screenWidth * 0.8,
    height: 4,
    backgroundColor: '#374151',
    borderRadius: 2,
    overflow: 'hidden',
  },
  visualizationBar: {
    height: '100%',
    backgroundColor: '#a855f7',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  controlGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    padding: 8,
    backgroundColor: '#1e293b',
    borderRadius: 20,
  },
  controlLabel: {
    color: 'white',
    fontSize: 12,
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categoryContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1e293b',
    borderRadius: 20,
  },
  categoryButtonActive: {
    backgroundColor: '#8B5CF6',
  },
  categoryText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: 'white',
  },
  padsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  padsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  pad: {
    width: (screenWidth - 48) / 2,
    height: 96,
    borderRadius: 16,
    marginBottom: 16,
  },
  padActive: {
    transform: [{ scale: 0.95 }],
  },
  padGradient: {
    flex: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  padContent: {
    alignItems: 'center',
  },
  padText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  padOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
  },
  recordingControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  recordButton: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    minWidth: 100,
  },
  recordButtonRecord: {
    backgroundColor: '#8B5CF6',
  },
  recordButtonStop: {
    backgroundColor: '#EF4444',
  },
  patternsButton: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    minWidth: 100,
  },
  recordButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  recentPatterns: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
  },
  recentPattern: {
    marginRight: 12,
  },
  recentPatternGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
  },
  recentPatternText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  disabled: {
    opacity: 0.5,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    color: '#64748b',
    fontSize: 12,
  },
  footerSubText: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 4,
  },
  patternsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    gap: 16,
  },
  backButton: {
    padding: 8,
    backgroundColor: '#1e293b',
    borderRadius: 20,
  },
  patternsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  patternCount: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  patternCountText: {
    color: 'white',
    fontSize: 12,
  },
  patternsList: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    color: '#94a3b8',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  patternCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  patternCardGradient: {
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  patternInfo: {
    flex: 1,
  },
  patternName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  patternDetails: {
    fontSize: 12,
    color: '#94a3b8',
  },
  patternActions: {
    flexDirection: 'row',
    gap: 8,
  },
  patternAction: {
    padding: 12,
    borderRadius: 12,
  },
  playAction: {
    backgroundColor: '#10B981',
  },
  exportAction: {
    backgroundColor: '#3B82F6',
  },
  deleteAction: {
    backgroundColor: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 12,
    color: 'white',
    fontSize: 16,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#4b5563',
  },
  saveButton: {
    backgroundColor: '#8B5CF6',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});
