/**
 * Results screen - Display AI feedback and scores
 */
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSessionStore } from '@/lib/store';
import { useThemeStore } from '@/lib/theme';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NavBar } from '@/components/NavBar';
import { apiClient } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';

export default function ResultsScreen() {
  const router = useRouter();
  const theme = useThemeStore((state) => state.theme);
  const sessionId = useSessionStore((state) => state.sessionId);
  const topicTitle = useSessionStore((state) => state.topicTitle);
  const reset = useSessionStore((state) => state.reset);

  const { data: results, isLoading, error } = useQuery({
    queryKey: ['sessionHistory', sessionId],
    queryFn: () => apiClient.getSessionHistory(sessionId!),
    enabled: !!sessionId,
  });

  const handleNewSession = () => {
    reset();
    router.push('/topics');
  };

  if (!sessionId) {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>No session data found</Text>
        <TouchableOpacity style={[styles.button, { backgroundColor: theme.primary }]} onPress={handleNewSession}>
          <Text style={styles.buttonText}>Start New Session</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={[styles.loadingText, { color: theme.text }]}>Loading your results...</Text>
      </SafeAreaView>
    );
  }

  if (error || !results?.scorecard) {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <Ionicons name="alert-circle" size={64} color="#ef4444" />
        <Text style={[styles.errorText, { color: theme.text }]}>Failed to load results</Text>
        <TouchableOpacity style={[styles.button, { backgroundColor: theme.primary }]} onPress={handleNewSession}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const { scorecard } = results;
  const { scores, feedback, highlights, drills } = scorecard;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <NavBar title="Results" showBack showHome showThemeToggle />
      <ScrollView 
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
      
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <Text style={[styles.topicTitle, { color: theme.text }]}>{topicTitle}</Text>
        <View style={[styles.scoreCircle, { backgroundColor: theme.primary }]}>
          <Text style={styles.totalScore}>{scores.total.toFixed(1)}</Text>
          <Text style={styles.maxScore}>/ 20</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Score Breakdown */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Score Breakdown</Text>
          <ScoreBar label="Structure" score={scores.structure} maxScore={5} />
          <ScoreBar label="Logic" score={scores.logic} maxScore={5} />
          <ScoreBar label="Delivery" score={scores.delivery} maxScore={5} />
          <ScoreBar label="Time Use" score={scores.time_use} maxScore={5} />
        </View>

        {/* Feedback */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Feedback</Text>
          <View style={styles.feedbackCard}>
            <Text style={[styles.feedbackSummary, { color: theme.text }]}>{feedback.summary}</Text>

            <View style={styles.feedbackSection}>
              <Text style={[styles.feedbackLabel, { color: theme.text }]}>💪 Strengths:</Text>
              {feedback.strengths?.map((strength: string, index: number) => (
                <Text key={index} style={styles.feedbackItem}>
                  • {strength}
                </Text>
              ))}
            </View>

            <View style={styles.feedbackSection}>
              <Text style={styles.feedbackLabel}>📈 Areas to Improve:</Text>
              {feedback.improvements?.map((improvement: string, index: number) => (
                <Text key={index} style={styles.feedbackItem}>
                  • {improvement}
                </Text>
              ))}
            </View>
          </View>
        </View>

        {/* Highlights */}
        {highlights && highlights.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Moments</Text>
            {highlights.map((highlight: any, index: number) => (
              <View key={index} style={styles.highlightCard}>
                <View style={styles.highlightHeader}>
                  <Ionicons name="star" size={16} color="#fbbf24" />
                  <Text style={styles.highlightTime}>
                    {Math.floor(highlight.timestamp)}s
                  </Text>
                </View>
                <Text style={styles.highlightText}>{highlight.text}</Text>
                <Text style={styles.highlightReason}>{highlight.reason}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Practice Drills */}
        {drills && drills.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Recommended Drills</Text>
            {drills.map((drill: any, index: number) => {
              // Handle both string format and object format
              const drillText = typeof drill === 'string' 
                ? drill 
                : drill.drill_name 
                  ? `${drill.drill_name}: ${drill.description}`
                  : drill.description || String(drill);
              
              return (
                <View key={index} style={[styles.drillCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Ionicons name="fitness" size={20} color={theme.primary} />
                  <Text style={[styles.drillText, { color: theme.text }]}>{drillText}</Text>
                </View>
              );
            })}
          </View>
        )}

        <TouchableOpacity style={[styles.newSessionButton, { backgroundColor: theme.primary }]} onPress={handleNewSession}>
          <Text style={styles.newSessionButtonText}>Start New Session</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

function ScoreBar({ label, score, maxScore }: { label: string; score: number; maxScore: number }) {
  const theme = useThemeStore((state) => state.theme);
  const percentage = (score / maxScore) * 100;

  return (
    <View style={styles.scoreBarContainer}>
      <View style={styles.scoreBarHeader}>
        <Text style={[styles.scoreBarLabel, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.scoreBarValue, { color: theme.textSecondary }]}>
          {score.toFixed(1)} / {maxScore}
        </Text>
      </View>
      <View style={[styles.scoreBarTrack, { backgroundColor: theme.border }]}>
        <View style={[styles.scoreBarFill, { width: `${percentage}%`, backgroundColor: theme.primary }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  topicTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  scoreCircle: {
    alignItems: 'center',
  },
  totalScore: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  maxScore: {
    fontSize: 24,
    color: '#9ca3af',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  scoreBarContainer: {
    marginBottom: 16,
  },
  scoreBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  scoreBarLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  scoreBarValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  scoreBarTrack: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 4,
  },
  feedbackCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  feedbackSummary: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 16,
    lineHeight: 24,
  },
  feedbackSection: {
    marginBottom: 12,
  },
  feedbackLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  feedbackItem: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
    marginBottom: 4,
    lineHeight: 20,
  },
  highlightCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#fbbf24',
  },
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  highlightTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  highlightText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  highlightReason: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  drillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  drillText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  newSessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  newSessionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    textAlign: 'center',
  },
});
