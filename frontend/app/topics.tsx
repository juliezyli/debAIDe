/**
 * Topics screen - Browse and select debate topics
 */
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient, Topic } from '@/lib/api';
import { useSessionStore } from '@/lib/store';
import { useThemeStore } from '@/lib/theme';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Ionicons } from '@expo/vector-icons';

export default function TopicsScreen() {
  const router = useRouter();
  const setSession = useSessionStore((state) => state.setSession);
  const reset = useSessionStore((state) => state.reset);
  const theme = useThemeStore((state) => state.theme);

  const { data: topics, isLoading, error } = useQuery({
    queryKey: ['topics'],
    queryFn: apiClient.getTopics,
  });

  const { data: dailyTopic } = useQuery({
    queryKey: ['dailyTopic'],
    queryFn: apiClient.getDailyTopic,
  });

  const handleStartSession = async (topicId: number) => {
    try {
      reset();
      const response = await apiClient.startSession(topicId);
      setSession({
        sessionId: response.session_id,
        topicTitle: response.topic_title,
        topicDescription: response.topic_description || '',
        stance: response.stance,
      });
      router.push('/session');
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Failed to start session. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>Loading topics...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <Ionicons name="alert-circle" size={64} color={theme.error} />
        <Text style={[styles.errorText, { color: theme.text }]}>Failed to load topics</Text>
        <Text style={[styles.errorSubtext, { color: theme.textSecondary }]}>Please check your connection</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>debAIDe</Text>
        <ThemeToggle />
      </View>

      {dailyTopic && (
        <View style={[styles.dailyTopicCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.dailyTopicHeader}>
            <Ionicons name="star" size={24} color="#fbbf24" />
            <Text style={[styles.dailyTopicLabel, { color: theme.text }]}>Topic of the Day</Text>
          </View>
          <Text style={[styles.dailyTopicTitle, { color: theme.text }]}>{dailyTopic.title}</Text>
          {dailyTopic.description && (
            <Text style={[styles.dailyTopicDescription, { color: theme.textSecondary }]}>{dailyTopic.description}</Text>
          )}
          <TouchableOpacity
            style={[styles.dailyTopicButton, { backgroundColor: theme.primary }]}
            onPress={() => handleStartSession(dailyTopic.id)}
          >
            <Text style={styles.dailyTopicButtonText}>Start This Topic</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: theme.text }]}>All Topics</Text>

      <FlatList
        data={topics}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TopicCard topic={item} onSelect={() => handleStartSession(item.id)} />
        )}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

function TopicCard({ topic, onSelect }: { topic: Topic; onSelect: () => void }) {
  const theme = useThemeStore((state) => state.theme);
  
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return '#10b981';
      case 'hard':
        return '#ef4444';
      default:
        return '#f59e0b';
    }
  };

  return (
    <TouchableOpacity style={[styles.topicCard, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={onSelect}>
      <View style={styles.topicHeader}>
        <Text style={[styles.topicTitle, { color: theme.text }]}>{topic.title}</Text>
        <View
          style={[
            styles.difficultyBadge,
            { backgroundColor: getDifficultyColor(topic.difficulty) },
          ]}
        >
          <Text style={styles.difficultyText}>{topic.difficulty}</Text>
        </View>
      </View>
      {topic.description && (
        <Text style={[styles.topicDescription, { color: theme.textSecondary }]}>{topic.description}</Text>
      )}
      {topic.category && (
        <Text style={[styles.topicCategory, { color: theme.textSecondary }]}>Category: {topic.category}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
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
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 14,
  },
  dailyTopicCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  dailyTopicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dailyTopicLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
    textTransform: 'uppercase',
  },
  dailyTopicTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  dailyTopicDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  dailyTopicButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  dailyTopicButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  topicCard: {
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  topicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  topicTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  difficultyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  topicDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  topicCategory: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
