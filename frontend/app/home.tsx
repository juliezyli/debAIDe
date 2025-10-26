/**
 * Home screen with navigation
 */
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../lib/theme';
import { useAuthStore } from '../lib/authStore';
import { ThemeToggle } from '../components/ThemeToggle';
import { useState, useEffect } from 'react';

interface UserStats {
  total_practice_sessions: number;
  completed_practice_sessions: number;
  average_practice_score: number;
  total_battles: number;
  battles_won: number;
  battles_lost: number;
  win_rate: number;
  current_win_streak: number;
  best_win_streak: number;
  skill_scores: {
    structure: number;
    logic: number;
    delivery: number;
    time_use: number;
  };
  total_debate_time: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const theme = useThemeStore((state) => state.theme);
  const { user, logout, token } = useAuthStore();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/user/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/auth/login');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Navigation Bar */}
      <View style={[styles.navbar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.navLeft}>
          <Ionicons name="chatbubbles" size={32} color={theme.primary} />
          <Text style={[styles.navTitle, { color: theme.text }]}>debAIDe</Text>
        </View>
        <View style={styles.navRight}>
          <ThemeToggle />
          <Text style={[styles.username, { color: theme.textSecondary }]}>
            {user?.username || 'User'}
          </Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeTitle, { color: theme.text }]}>
            Welcome back, {user?.username}! 👋
          </Text>
          <Text style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}>
            Ready to practice your debate skills?
          </Text>
        </View>

        {/* Main Features */}
        <View style={styles.featuresGrid}>
          {/* Practice Mode */}
          <TouchableOpacity
            style={[styles.featureCard, styles.featureCardLarge, { backgroundColor: theme.primary }]}
            onPress={() => router.push('/topics')}
          >
            <View style={styles.featureIcon}>
              <Ionicons name="mic" size={48} color="#fff" />
            </View>
            <Text style={styles.featureTitle}>Practice Mode</Text>
            <Text style={styles.featureDescription}>
              Practice with AI coaching and get instant feedback
            </Text>
            <View style={styles.featureArrow}>
              <Ionicons name="arrow-forward" size={24} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* 1v1 Battle Mode */}
          <TouchableOpacity
            style={[styles.featureCard, styles.featureCardLarge, { backgroundColor: '#E53E3E' }]}
            onPress={() => router.push('/battle/lobby')}
          >
            <View style={styles.featureIcon}>
              <Ionicons name="people" size={48} color="#fff" />
            </View>
            <Text style={styles.featureTitle}>1v1 Battle</Text>
            <Text style={styles.featureDescription}>
              Challenge others in competitive debates
            </Text>
            <View style={styles.featureArrow}>
              <Ionicons name="arrow-forward" size={24} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Stats</Text>
          {loading ? (
            <ActivityIndicator size="large" color={theme.primary} style={{ marginVertical: 20 }} />
          ) : (
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Ionicons name="trophy" size={32} color={theme.primary} />
                <Text style={[styles.statValue, { color: theme.text }]}>{stats?.battles_won || 0}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Wins</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Ionicons name="flame" size={32} color="#F59E0B" />
                <Text style={[styles.statValue, { color: theme.text }]}>{stats?.current_win_streak || 0}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Streak</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Ionicons name="bar-chart" size={32} color="#10B981" />
                <Text style={[styles.statValue, { color: theme.text }]}>{stats?.completed_practice_sessions || 0}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Sessions</Text>
              </View>
            </View>
          )}
        </View>

        {/* Features List */}
        <View style={styles.featuresSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>What You Can Do</Text>
          <FeatureItem
            icon="analytics"
            title="AI Scoring"
            description="Get detailed feedback from Gemini AI"
            theme={theme}
          />
          <FeatureItem
            icon="trending-up"
            title="Track Progress"
            description="Monitor your improvement over time"
            theme={theme}
          />
          <FeatureItem
            icon="school"
            title="Learn Techniques"
            description="Master debate strategies and skills"
            theme={theme}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function FeatureItem({
  icon,
  title,
  description,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  theme: any;
}) {
  return (
    <View style={[styles.featureItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Ionicons name={icon} size={28} color={theme.primary} />
      <View style={styles.featureItemText}>
        <Text style={[styles.featureItemTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.featureItemDescription, { color: theme.textSecondary }]}>
          {description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  username: {
    fontSize: 15,
    fontWeight: '500',
  },
  logoutButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  featuresGrid: {
    gap: 16,
    marginBottom: 32,
  },
  featureCard: {
    borderRadius: 16,
    padding: 24,
    position: 'relative',
    minHeight: 180,
  },
  featureCardLarge: {
    minHeight: 200,
  },
  featureIcon: {
    marginBottom: 16,
  },
  featureTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  featureDescription: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 16,
  },
  featureArrow: {
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
  statsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  featuresSection: {
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 16,
  },
  featureItemText: {
    flex: 1,
  },
  featureItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureItemDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
});
