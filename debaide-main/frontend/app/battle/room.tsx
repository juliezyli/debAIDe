import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/authStore';
import { useThemeStore } from '@/lib/store';
import { Audio } from 'expo-av';
import { NavBar } from '@/components/NavBar';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

type SegmentKind = 'opening' | 'rebuttal' | 'closing';

interface BattleStatus {
  battle_id: string;
  status: string;
  current_turn: string;
  current_segment: SegmentKind;
  topic: {
    id: number;
    title: string;
    description: string;
  };
  player1: {
    id: string;
    username: string;
    stance: string;
    segments: Record<SegmentKind, boolean>;
  };
  player2: {
    id: string;
    username: string;
    stance: string;
    segments: Record<SegmentKind, boolean>;
  } | null;
  is_your_turn: boolean;
  winner_id: string | null;
  judgment: any;
}

interface SegmentData {
  kind: SegmentKind;
  transcript: string;
  player_id: string;
}

export default function BattleRoomScreen() {
  const routerInstance = useRouter();
  const { battleId } = useLocalSearchParams<{ battleId: string }>();
  const [textInput, setTextInput] = useState('');
  const [battleStatus, setBattleStatus] = useState<BattleStatus | null>(null);
  const [opponentTranscripts, setOpponentTranscripts] = useState<SegmentData[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isJudging, setIsJudging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const isMounted = useRef(false);
  
  const token = useAuthStore((state) => state.token);
  const currentUserId = useAuthStore((state) => state.user?.id);
  const isDark = useThemeStore((state) => state.isDark);
  
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Poll for battle status every 2 seconds
  useEffect(() => {
    fetchBattleStatus();
    const interval = setInterval(fetchBattleStatus, 2000);
    return () => clearInterval(interval);
  }, [battleId]);
  
  const fetchBattleStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/battle/${battleId}/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setBattleStatus(data);
        
        // If battle is completed and has judgment, go to results
        if (data.status === 'completed' && data.judgment && isMounted.current) {
          setTimeout(() => {
            if (isMounted.current) {
              routerInstance.replace({
                pathname: '/battle/results',
                params: { 
                  battleId,
                  judgmentData: JSON.stringify(data.judgment),
                },
              });
            }
          }, 100);
        }
      }
    } catch (error) {
      console.error('Failed to fetch battle status:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchOpponentSegments = async () => {
    try {
      const response = await fetch(`${API_URL}/battle/${battleId}/segments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const segments = await response.json();
        // Filter to only show opponent's segments
        const opponentSegs = segments.filter((seg: SegmentData) => seg.player_id !== currentUserId);
        setOpponentTranscripts(opponentSegs);
      }
    } catch (error) {
      console.error('Failed to fetch opponent segments:', error);
    }
  };
  
  useEffect(() => {
    if (battleStatus && battleStatus.status === 'in_progress') {
      fetchOpponentSegments();
      const interval = setInterval(fetchOpponentSegments, 3000);
      return () => clearInterval(interval);
    }
  }, [battleStatus]);
  
  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please grant microphone permissions');
        return;
      }
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };
  
  const stopRecording = async () => {
    if (!recording) return;
    
    setIsRecording(false);
    setIsTranscribing(true);
    
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      if (uri) {
        await transcribeAudio(uri);
      }
      
      setRecording(null);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
    } finally {
      setIsTranscribing(false);
    }
  };
  
  const transcribeAudio = async (audioUri: string) => {
    try {
      console.log('Starting transcription for:', audioUri);
      const formData = new FormData();
      formData.append('file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any);
      
      console.log('Sending transcription request to:', `${API_URL}/stt/transcribe`);
      const response = await fetch(`${API_URL}/stt/transcribe`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      
      console.log('Transcription response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Transcription result:', data.text);
        setTextInput((prev) => prev + (prev ? ' ' : '') + data.text);
        Alert.alert('✅ Success', 'Audio transcribed successfully');
      } else {
        const errorText = await response.text();
        console.error('Transcription error response:', errorText);
        Alert.alert('Error', `Failed to transcribe audio: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to transcribe:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Failed to transcribe audio: ${errorMessage}`);
    }
  };
  
  const submitSegment = async () => {
    if (!textInput.trim()) {
      Alert.alert('Error', 'Please enter your argument');
      return;
    }
    
    if (!battleStatus?.is_your_turn) {
      Alert.alert('Error', "It's not your turn");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `${API_URL}/battle/${battleId}/segment?kind=${battleStatus.current_segment}&text=${encodeURIComponent(textInput)}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      if (response.ok) {
        setTextInput('');
        Alert.alert('Success', 'Segment submitted! Waiting for opponent...');
        await fetchBattleStatus();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to submit segment');
      }
    } catch (error) {
      console.error('Failed to submit segment:', error);
      Alert.alert('Error', 'Failed to submit segment');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const requestJudgment = async () => {
    setIsJudging(true);
    try {
      const response = await fetch(`${API_URL}/battle/${battleId}/judge`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        // Don't navigate immediately - let the polling detect the status change
        // and navigate naturally to avoid double navigation
        Alert.alert('Success', 'AI is analyzing the debate. Results will appear shortly...');
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to judge battle');
      }
    } catch (error) {
      console.error('Failed to judge battle:', error);
      Alert.alert('Error', 'Failed to judge battle');
    } finally {
      setIsJudging(false);
    }
  };
  
  const bgColor = isDark ? '#000' : '#fff';
  const textColor = isDark ? '#fff' : '#000';
  const cardBg = isDark ? '#1a1a1a' : '#f5f5f5';
  const borderColor = isDark ? '#333' : '#ddd';
  
  if (loading || !battleStatus) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={[styles.loadingText, { color: textColor }]}>Loading battle...</Text>
      </SafeAreaView>
    );
  }
  
  const isPlayer1 = currentUserId === battleStatus.player1.id;
  const mySegments = isPlayer1 ? battleStatus.player1.segments : (battleStatus.player2?.segments || {} as Record<SegmentKind, boolean>);
  const opponentSegments = isPlayer1 ? (battleStatus.player2?.segments || {} as Record<SegmentKind, boolean>) : battleStatus.player1.segments;
  const opponentName = isPlayer1 ? battleStatus.player2?.username : battleStatus.player1.username;
  
  // Check if both players have submitted all segments
  const allSegmentsComplete = 
    Object.values(mySegments).filter(Boolean).length === 3 &&
    Object.values(opponentSegments || {}).filter(Boolean).length === 3;
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }}>
      <NavBar title="Battle Room" showBack showHome showThemeToggle />
      <ScrollView style={[styles.container, { backgroundColor: bgColor }]}>
        <View style={styles.content}>
        
          {/* Waiting for opponent message */}
          {!battleStatus.player2 && (
            <View style={[styles.waitingCard, { backgroundColor: '#fbbf24' }]}>
              <Text style={styles.waitingText}>⏳ Waiting for opponent to join...</Text>
            </View>
          )}
        
          {/* Topic */}
          <View style={[styles.topicCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.topicTitle, { color: textColor }]}>{battleStatus.topic.title}</Text>
          <Text style={[styles.topicDesc, { color: textColor, opacity: 0.7 }]}>
            {battleStatus.topic.description}
          </Text>
        </View>
        
        {/* Turn Indicator */}
        <View style={[
          styles.turnIndicator,
          { backgroundColor: battleStatus.is_your_turn ? '#10b981' : '#ef4444' }
        ]}>
          <Text style={styles.turnText}>
            {battleStatus.player2 
              ? (battleStatus.is_your_turn ? '🟢 YOUR TURN' : '🔴 OPPONENT\'S TURN')
              : '⏸️ WAITING FOR OPPONENT'}
          </Text>
          <Text style={styles.turnSubtext}>
            Current: {battleStatus.current_segment.toUpperCase()}
          </Text>
        </View>
        
        {/* Players Progress */}
        <View style={styles.playersContainer}>
          <View style={[styles.playerCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.playerName, { color: textColor }]}>You</Text>
            <Text style={[styles.playerStance, { color: textColor, opacity: 0.7 }]}>
              {isPlayer1 ? battleStatus.player1.stance.toUpperCase() : battleStatus.player2?.stance.toUpperCase()}
            </Text>
            <View style={styles.segmentIcons}>
              {(['opening', 'rebuttal', 'closing'] as SegmentKind[]).map((kind) => (
                <View
                  key={kind}
                  style={[
                    styles.segmentIcon,
                    mySegments?.[kind] ? styles.segmentIconComplete : { borderColor, borderWidth: 2 }
                  ]}
                >
                  <Text style={styles.segmentIconText}>
                    {mySegments?.[kind] ? '✓' : kind[0].toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          
          <View style={[styles.playerCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.playerName, { color: textColor }]}>{opponentName || 'Waiting...'}</Text>
            <Text style={[styles.playerStance, { color: textColor, opacity: 0.7 }]}>
              {isPlayer1 ? battleStatus.player2?.stance.toUpperCase() : battleStatus.player1.stance.toUpperCase()}
            </Text>
            <View style={styles.segmentIcons}>
              {(['opening', 'rebuttal', 'closing'] as SegmentKind[]).map((kind) => (
                <View
                  key={kind}
                  style={[
                    styles.segmentIcon,
                    opponentSegments?.[kind] ? styles.segmentIconComplete : { borderColor, borderWidth: 2 }
                  ]}
                >
                  <Text style={styles.segmentIconText}>
                    {opponentSegments?.[kind] ? '✓' : kind[0].toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
        
        {/* Text Input */}
        {!allSegmentsComplete && (
          <View style={[styles.inputCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.inputLabel, { color: textColor }]}>
              Your {battleStatus.current_segment} statement:
            </Text>
            
            {/* Recording Button */}
            <View style={styles.recordingContainer}>
              <TouchableOpacity
                style={[
                  styles.recordButton,
                  isRecording && styles.recordButtonActive,
                  (!battleStatus.is_your_turn || mySegments?.[battleStatus.current_segment]) && styles.recordButtonDisabled
                ]}
                onPress={isRecording ? stopRecording : startRecording}
                disabled={!battleStatus.is_your_turn || mySegments?.[battleStatus.current_segment] || isTranscribing}
              >
                {isTranscribing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.recordButtonText}>
                    {isRecording ? '⏹ Stop Recording' : '🎤 Record Audio'}
                  </Text>
                )}
              </TouchableOpacity>
              {isTranscribing && (
                <Text style={[styles.transcribingText, { color: textColor, opacity: 0.7 }]}>
                  Transcribing...
                </Text>
              )}
            </View>
            
            <TextInput
              style={[styles.textInput, { color: textColor, borderColor }]}
              placeholder={`Write or record your ${battleStatus.current_segment} argument...`}
              placeholderTextColor={isDark ? '#666' : '#999'}
              value={textInput}
              onChangeText={setTextInput}
              multiline
              numberOfLines={10}
              textAlignVertical="top"
              editable={battleStatus.is_your_turn && !mySegments?.[battleStatus.current_segment]}
            />
            
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!battleStatus.is_your_turn || isSubmitting || mySegments?.[battleStatus.current_segment]) && styles.submitButtonDisabled
              ]}
              onPress={submitSegment}
              disabled={!battleStatus.is_your_turn || isSubmitting || mySegments?.[battleStatus.current_segment]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : mySegments?.[battleStatus.current_segment] ? (
                <Text style={styles.submitButtonText}>Waiting for opponent...</Text>
              ) : !battleStatus.is_your_turn ? (
                <Text style={styles.submitButtonText}>Opponent's turn</Text>
              ) : (
                <Text style={styles.submitButtonText}>Submit {battleStatus.current_segment}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
        
        {/* Opponent's Transcripts */}
        {opponentTranscripts.length > 0 && (
          <View style={[styles.transcriptsCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.transcriptsTitle, { color: textColor }]}>
              {opponentName}'s Arguments
            </Text>
            {opponentTranscripts.map((segment, index) => (
              <View key={index} style={[styles.transcriptItem, { borderColor }]}>
                <Text style={[styles.transcriptKind, { color: textColor }]}>
                  {segment.kind.toUpperCase()}
                </Text>
                <Text style={[styles.transcriptText, { color: textColor, opacity: 0.8 }]}>
                  {segment.transcript}
                </Text>
              </View>
            ))}
          </View>
        )}
        
        {/* Judge Button */}
        {allSegmentsComplete && (
          <TouchableOpacity
            style={[styles.judgeButton, isJudging && styles.judgeButtonDisabled]}
            onPress={requestJudgment}
            disabled={isJudging}
          >
            {isJudging ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.judgeButtonText}>Request AI Judgment</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  waitingCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  waitingText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  topicCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  topicTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  topicDesc: {
    fontSize: 14,
  },
  turnIndicator: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  turnText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  turnSubtext: {
    color: '#fff',
    fontSize: 14,
    marginTop: 4,
    opacity: 0.9,
  },
  playersContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  playerCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  playerStance: {
    fontSize: 14,
    marginBottom: 12,
  },
  segmentIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentIconComplete: {
    backgroundColor: '#10b981',
  },
  segmentIconText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  inputCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  recordingContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  recordButton: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    minWidth: 200,
  },
  recordButtonActive: {
    backgroundColor: '#dc2626',
  },
  recordButtonDisabled: {
    opacity: 0.4,
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  transcribingText: {
    marginTop: 8,
    fontSize: 14,
    fontStyle: 'italic',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 200,
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  transcriptsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  transcriptsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  transcriptItem: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    marginBottom: 12,
    paddingVertical: 8,
  },
  transcriptKind: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
    opacity: 0.7,
  },
  transcriptText: {
    fontSize: 14,
    lineHeight: 20,
  },
  judgeButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  judgeButtonDisabled: {
    opacity: 0.6,
  },
  judgeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
