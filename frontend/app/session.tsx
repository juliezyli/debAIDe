/**
 * Session screen - Record debate segments
 */
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { useSessionStore } from '@/lib/store';
import { useThemeStore } from '@/lib/theme';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NavBar } from '@/components/NavBar';
import { apiClient } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

type SegmentKind = 'opening' | 'rebuttal' | 'closing';

export default function SessionScreen() {
  const router = useRouter();
  const theme = useThemeStore((state) => state.theme);
  const sessionId = useSessionStore((state) => state.sessionId);
  const topicTitle = useSessionStore((state) => state.topicTitle);
  const stance = useSessionStore((state) => state.stance);
  const segments = useSessionStore((state) => state.segments);
  const setSegment = useSessionStore((state) => state.setSegment);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [currentSegment, setCurrentSegment] = useState<SegmentKind | null>(null);
  const [uploadingSegment, setUploadingSegment] = useState<SegmentKind | null>(null);
  const [isScoringSession, setIsScoringSession] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

  const startRecording = async (kind: SegmentKind) => {
    try {
      // Request permissions
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setCurrentSegment(kind);
      
      // Start timer
      setRecordingTime(0);
      const interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      setTimerInterval(interval);
    } catch (err) {
      Alert.alert('Error', 'Failed to start recording');
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording || !currentSegment || !sessionId) return;

    try {
      // Stop timer
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
      
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (!uri) {
        Alert.alert('Error', 'No recording found');
        return;
      }

      // Upload segment
      setUploadingSegment(currentSegment);
      
      // For React Native, we need to create a file blob properly
      // Instead of using fetch, use the URI directly with FormData
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        type: 'audio/webm',
        name: 'audio.webm',
      } as any);

      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
      const uploadResponse = await fetch(
        `${API_URL}/segment/upload?session_id=${sessionId}&kind=${currentSegment}`,
        {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      const result = await uploadResponse.json();
      
      setSegment(currentSegment, {
        transcript: result.transcript,
        audioUrl: result.audio_url,
      });

      setCurrentSegment(null);
      setUploadingSegment(null);

      Alert.alert('Success', 'Segment uploaded and transcribed!');
    } catch (err) {
      setUploadingSegment(null);
      Alert.alert('Error', 'Failed to upload segment');
      console.error('Failed to stop recording', err);
    }
  };

  const handleTextSubmit = async (kind: SegmentKind, text: string) => {
    if (!sessionId) return;
    
    try {
      setUploadingSegment(kind);
      
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
      const url = `${API_URL}/segment/text?session_id=${sessionId}&kind=${kind}&text=${encodeURIComponent(text)}`;
      console.log('Submitting text to:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Text submission response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Text submission error response:', errorText);
        throw new Error(`Text submission failed: ${errorText}`);
      }

      const result = await response.json();
      console.log('Text submission result:', result);
      
      setSegment(kind, {
        transcript: result.transcript,
        audioUrl: null,
      });

      setUploadingSegment(null);
      Alert.alert('Success', 'Text submitted successfully!');
    } catch (err) {
      setUploadingSegment(null);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Error', `Failed to submit text: ${errorMessage}`);
      console.error('Failed to submit text', err);
    }
  };

  const handleFinish = async () => {
    if (!sessionId) return;

    const completedSegments = Object.keys(segments).length;
    if (completedSegments < 3) {
      Alert.alert(
        'Incomplete Session',
        'Please complete all three segments before finishing.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setIsScoringSession(true);
      await apiClient.scoreSession(sessionId);
      setIsScoringSession(false);
      router.push('/results');
    } catch (err) {
      setIsScoringSession(false);
      Alert.alert('Error', 'Failed to score session');
      console.error('Failed to score session', err);
    }
  };

  if (!sessionId) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>No active session</Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={() => router.push('/topics')}
        >
          <Text style={styles.buttonText}>Choose a Topic</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isRecording = recording !== null;
  const allSegmentsComplete = Object.keys(segments).length === 3;
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <NavBar title="Practice Session" showBack showHome showThemeToggle />
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <Text style={[styles.topicTitle, { color: theme.text }]}>{topicTitle}</Text>
        <View style={[styles.stanceBadge, stance === 'pro' ? styles.proBadge : styles.conBadge]}>
          <Text style={styles.stanceText}>You are: {stance.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={[styles.instructions, { color: theme.textSecondary }]}>
          Record your three debate segments. Each segment will be transcribed and analyzed.
        </Text>

        <SegmentCard
          title="Opening Statement"
          kind="opening"
          isComplete={!!segments.opening}
          isRecording={isRecording && currentSegment === 'opening'}
          isUploading={uploadingSegment === 'opening'}
          onStart={() => startRecording('opening')}
          onStop={stopRecording}
          transcript={segments.opening?.transcript}
          sessionId={sessionId}
          onTextSubmit={handleTextSubmit}
          recordingTime={currentSegment === 'opening' ? recordingTime : 0}
        />

        <SegmentCard
          title="Rebuttal"
          kind="rebuttal"
          isComplete={!!segments.rebuttal}
          isRecording={isRecording && currentSegment === 'rebuttal'}
          isUploading={uploadingSegment === 'rebuttal'}
          onStart={() => startRecording('rebuttal')}
          onStop={stopRecording}
          transcript={segments.rebuttal?.transcript}
          sessionId={sessionId}
          onTextSubmit={handleTextSubmit}
          recordingTime={currentSegment === 'rebuttal' ? recordingTime : 0}
        />

        <SegmentCard
          title="Closing Argument"
          kind="closing"
          isComplete={!!segments.closing}
          isRecording={isRecording && currentSegment === 'closing'}
          isUploading={uploadingSegment === 'closing'}
          onStart={() => startRecording('closing')}
          onStop={stopRecording}
          transcript={segments.closing?.transcript}
          sessionId={sessionId}
          onTextSubmit={handleTextSubmit}
          recordingTime={currentSegment === 'closing' ? recordingTime : 0}
        />

        {allSegmentsComplete && (
          <TouchableOpacity
            style={[styles.finishButton, isScoringSession && styles.disabledButton]}
            onPress={handleFinish}
            disabled={isScoringSession}
          >
            <Text style={styles.finishButtonText}>
              {isScoringSession ? 'Scoring...' : 'Finish & Get Results'}
            </Text>
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

function SegmentCard({
  title,
  kind,
  isComplete,
  isRecording,
  isUploading,
  onStart,
  onStop,
  transcript,
  sessionId,
  onTextSubmit,
  recordingTime,
}: {
  title: string;
  kind: SegmentKind;
  isComplete: boolean;
  isRecording: boolean;
  isUploading: boolean;
  onStart: () => void;
  onStop: () => void;
  transcript?: string;
  sessionId: string;
  onTextSubmit: (kind: SegmentKind, text: string) => Promise<void>;
  recordingTime?: number;
}) {
  const theme = useThemeStore((state) => state.theme);
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const [textInput, setTextInput] = useState('');
  const [showTextModal, setShowTextModal] = useState(false);
  const [canRerecord, setCanRerecord] = useState(true);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) {
      Alert.alert('Error', 'Please enter some text');
      return;
    }
    
    await onTextSubmit(kind, textInput);
    setTextInput('');
    setShowTextModal(false);
  };

  return (
    <View style={[styles.segmentCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.segmentHeader}>
        <Text style={[styles.segmentTitle, { color: theme.text }]}>{title}</Text>
        {isComplete && <Ionicons name="checkmark-circle" size={24} color="#10b981" />}
      </View>

      {/* Mode Toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[
            styles.modeButton,
            inputMode === 'voice' && styles.modeButtonActive,
            { borderColor: theme.border }
          ]}
          onPress={() => setInputMode('voice')}
        >
          <Ionicons name="mic" size={20} color={inputMode === 'voice' ? theme.primary : theme.textSecondary} />
          <Text style={[
            styles.modeButtonText,
            { color: inputMode === 'voice' ? theme.primary : theme.textSecondary }
          ]}>
            Voice
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.modeButton,
            inputMode === 'text' && styles.modeButtonActive,
            { borderColor: theme.border }
          ]}
          onPress={() => setInputMode('text')}
        >
          <Ionicons name="create" size={20} color={inputMode === 'text' ? theme.primary : theme.textSecondary} />
          <Text style={[
            styles.modeButtonText,
            { color: inputMode === 'text' ? theme.primary : theme.textSecondary }
          ]}>
            Text
          </Text>
        </TouchableOpacity>
      </View>

      {isUploading ? (
        <View style={[styles.recordButton, { backgroundColor: theme.primary }]}>
          <Text style={styles.recordButtonText}>Uploading...</Text>
        </View>
      ) : inputMode === 'voice' ? (
        isRecording ? (
          <View>
            <View style={[styles.timerDisplay, { backgroundColor: theme.background }]}>
              <Ionicons name="time" size={20} color={theme.primary} />
              <Text style={[styles.timerText, { color: theme.text }]}>
                {formatTime(recordingTime || 0)}
              </Text>
            </View>
            <TouchableOpacity style={[styles.recordButton, styles.recordingButton]} onPress={onStop}>
              <Ionicons name="stop-circle" size={32} color="#fff" />
              <Text style={styles.recordButtonText}>Stop Recording</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.recordButton,
              isComplete && !canRerecord && styles.disabledButton,
            ]}
            onPress={isComplete && !canRerecord ? undefined : onStart}
            disabled={isComplete && !canRerecord}
          >
            <Ionicons name="mic" size={32} color="#fff" />
            <Text style={styles.recordButtonText}>
              {isComplete ? (canRerecord ? 'Re-record (1x left)' : 'Re-record used') : 'Start Recording'}
            </Text>
          </TouchableOpacity>
        )
      ) : (
        <TouchableOpacity
          style={[
            styles.recordButton,
            isComplete && styles.completeButton,
          ]}
          onPress={() => setShowTextModal(true)}
        >
          <Ionicons name="create" size={32} color="#fff" />
          <Text style={styles.recordButtonText}>
            {isComplete ? 'Edit Text' : 'Type Argument'}
          </Text>
        </TouchableOpacity>
      )}

      {transcript && (
        <View style={[styles.transcriptBox, { backgroundColor: theme.background }]}>
          <Text style={[styles.transcriptLabel, { color: theme.textSecondary }]}>Transcript:</Text>
          <Text style={[styles.transcriptText, { color: theme.text }]} numberOfLines={3}>
            {transcript}
          </Text>
        </View>
      )}

      {/* Text Input Modal */}
      <Modal
        visible={showTextModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTextModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{title}</Text>
              <TouchableOpacity onPress={() => setShowTextModal(false)}>
                <Ionicons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={[styles.textInputLarge, { 
                backgroundColor: theme.background, 
                color: theme.text,
                borderColor: theme.border 
              }]}
              placeholder="Type your argument here..."
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={10}
              value={textInput}
              onChangeText={setTextInput}
              textAlignVertical="top"
            />
            
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: theme.primary }]}
              onPress={handleTextSubmit}
            >
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  topicTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  stanceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  proBadge: {
    backgroundColor: '#10b981',
  },
  conBadge: {
    backgroundColor: '#ef4444',
  },
  stanceText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  instructions: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  segmentCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  segmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  segmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  timerDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  timerText: {
    fontSize: 18,
    fontWeight: '600',
  },
  recordingButton: {
    backgroundColor: '#ef4444',
  },
  completeButton: {
    backgroundColor: '#10b981',
  },
  disabledButton: {
    opacity: 0.5,
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  transcriptBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  transcriptLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    padding: 18,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modeToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  modeButtonActive: {
    backgroundColor: '#eef2ff',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  textInputLarge: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 200,
    marginBottom: 16,
  },
  submitButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
