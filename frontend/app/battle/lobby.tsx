import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/lib/authStore';
import { useThemeStore } from '@/lib/store';
import { NavBar } from '@/components/NavBar';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface Battle {
  battle_id: string;
  topic: {
    id: number;
    title: string;
    difficulty: string;
  };
  player1: {
    username: string;
    stance: string;
  };
  created_at: string;
}

interface Topic {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  category: string;
}

export default function BattleLobbyScreen() {
  const [battles, setBattles] = useState<Battle[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const [selectedStance, setSelectedStance] = useState<'pro' | 'con'>('pro');
  const [myBattleId, setMyBattleId] = useState<string | null>(null);
  const isMounted = useRef(false);
  
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const isDark = useThemeStore((state) => state.isDark);
  
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  useEffect(() => {
    if (!token) {
      router.replace('/auth/login');
      return;
    }
    loadBattles();
    loadTopics();
    
    // Poll for battles every 3 seconds
    const interval = setInterval(() => {
      loadBattles();
    }, 3000);
    
    return () => clearInterval(interval);
  }, [token]);
  
  const loadBattles = async () => {
    try {
      const response = await fetch(`${API_URL}/battle/available`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setBattles(data);
      }
    } catch (error) {
      console.error('Failed to load battles:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadTopics = async () => {
    try {
      const response = await fetch(`${API_URL}/topics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setTopics(data);
      }
    } catch (error) {
      console.error('Failed to load topics:', error);
    }
  };
  
  const openTopicSelection = () => {
    setShowTopicModal(true);
  };
  
  const createBattle = async () => {
    if (!selectedTopic) {
      Alert.alert('Select Topic', 'Please select a topic first');
      return;
    }
    
    setIsCreating(true);
    try {
      const response = await fetch(
        `${API_URL}/battle/create?topic_id=${selectedTopic}&stance=${selectedStance}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setMyBattleId(data.battle_id);
        setShowTopicModal(false);
        
        // Navigate creator to battle room immediately
        setTimeout(() => {
          if (isMounted.current) {
            router.push(`/battle/room?battleId=${data.battle_id}`);
          }
        }, 100);
      } else {
        Alert.alert('Error', 'Failed to create battle');
      }
    } catch (error) {
      console.error('Failed to create battle:', error);
      Alert.alert('Error', 'Failed to create battle');
    } finally {
      setIsCreating(false);
    }
  };
  
  const joinBattle = async (battleId: string) => {
    try {
      const response = await fetch(`${API_URL}/battle/${battleId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        Alert.alert('✅ Joined Battle!', 'Get ready to debate!', [
          {
            text: 'Start',
            onPress: () => {
              setTimeout(() => {
                router.push(`/battle/room?battleId=${battleId}`);
              }, 100);
            },
          },
        ]);
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to join battle');
        loadBattles(); // Refresh list
      }
    } catch (error) {
      console.error('Failed to join battle:', error);
      Alert.alert('Error', 'Failed to join battle');
    }
  };
  
  const renderBattle = ({ item }: { item: Battle }) => (
    <TouchableOpacity
      style={[styles.battleCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}
      onPress={() => joinBattle(item.battle_id)}
    >
      <View style={styles.battleHeader}>
        <Text style={[styles.topicTitle, { color: isDark ? '#fff' : '#000' }]}>
          {item.topic.title}
        </Text>
        <View style={[styles.difficultyBadge, getDifficultyColor(item.topic.difficulty)]}>
          <Text style={styles.difficultyText}>{item.topic.difficulty}</Text>
        </View>
      </View>
      
      <View style={styles.playerInfo}>
        <Text style={[styles.playerText, { color: isDark ? '#aaa' : '#666' }]}>
          {item.player1.username} • {item.player1.stance}
        </Text>
      </View>
      
      <Text style={[styles.joinText, { color: '#6366f1' }]}>Tap to join →</Text>
    </TouchableOpacity>
  );
  
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return { backgroundColor: '#10b981' };
      case 'hard':
        return { backgroundColor: '#ef4444' };
      default:
        return { backgroundColor: '#f59e0b' };
    }
  };
  
  const bgColor = isDark ? '#000' : '#f5f5f5';
  const textColor = isDark ? '#fff' : '#000';
  
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#6366f1" />
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <NavBar title="Battle Lobby" showBack showHome showThemeToggle />
      
      <View style={styles.content}>
        <Text style={[styles.subtitle, { color: textColor, opacity: 0.7, textAlign: 'center', marginBottom: 16 }]}>
          1v1 Debates • Judged by AI
        </Text>
      
      <TouchableOpacity
        style={[styles.createButton, isCreating && styles.createButtonDisabled]}
        onPress={openTopicSelection}
        disabled={isCreating}
      >
        {isCreating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.createButtonText}>➕ Create New Battle</Text>
        )}
      </TouchableOpacity>
      
      <Text style={[styles.sectionTitle, { color: textColor }]}>
        Available Battles ({battles.length})
      </Text>
      
      {battles.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: textColor, opacity: 0.5 }]}>
            No battles available
          </Text>
          <Text style={[styles.emptySubtext, { color: textColor, opacity: 0.4 }]}>
            Create one to get started!
          </Text>
        </View>
      ) : (
        <FlatList
          data={battles}
          renderItem={renderBattle}
          keyExtractor={(item) => item.battle_id}
          contentContainerStyle={styles.listContent}
          refreshing={isLoading}
          onRefresh={loadBattles}
        />
      )}
      
      {/* Topic Selection Modal */}
      <Modal
        visible={showTopicModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTopicModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: bgColor }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                Choose a Topic
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowTopicModal(false)}
              >
                <Text style={[styles.closeButtonText, { color: textColor }]}>×</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.topicsList}>
              {topics.map((topic) => (
                <TouchableOpacity
                  key={topic.id}
                  style={[
                    styles.topicCard,
                    { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' },
                    selectedTopic === topic.id && styles.topicCardSelected,
                  ]}
                  onPress={() => setSelectedTopic(topic.id)}
                >
                  <View style={styles.battleHeader}>
                    <Text style={[styles.topicTitle, { color: textColor }]}>
                      {topic.title}
                    </Text>
                    <View
                      style={[
                        styles.difficultyBadge,
                        {
                          backgroundColor:
                            topic.difficulty === 'hard'
                              ? '#ef4444'
                              : topic.difficulty === 'medium'
                              ? '#f59e0b'
                              : '#10b981',
                        },
                      ]}
                    >
                      <Text style={styles.difficultyText}>{topic.difficulty}</Text>
                    </View>
                  </View>
                  <Text style={[styles.topicDescription, { color: textColor, opacity: 0.7 }]}>
                    {topic.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View style={styles.stanceSection}>
              <Text style={[styles.stanceLabel, { color: textColor }]}>
                Choose Your Stance
              </Text>
              <View style={styles.stanceButtons}>
                <TouchableOpacity
                  style={[
                    styles.stanceButton,
                    selectedStance === 'pro' && styles.stanceButtonSelected,
                  ]}
                  onPress={() => setSelectedStance('pro')}
                >
                  <Text
                    style={[
                      styles.stanceButtonText,
                      { color: textColor },
                      selectedStance === 'pro' && styles.stanceButtonTextSelected,
                    ]}
                  >
                    👍 PRO
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.stanceButton,
                    selectedStance === 'con' && styles.stanceButtonSelected,
                  ]}
                  onPress={() => setSelectedStance('con')}
                >
                  <Text
                    style={[
                      styles.stanceButtonText,
                      { color: textColor },
                      selectedStance === 'con' && styles.stanceButtonTextSelected,
                    ]}
                  >
                    👎 CON
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <TouchableOpacity
              style={[
                styles.modalCreateButton,
                (!selectedTopic || !selectedStance) && styles.modalCreateButtonDisabled,
              ]}
              onPress={createBattle}
              disabled={!selectedTopic || !selectedStance}
            >
              <Text style={styles.modalCreateButtonText}>
                Create Battle
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
    marginTop: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  createButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
    marginHorizontal: 4,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    marginHorizontal: 4,
  },
  listContent: {
    paddingBottom: 24,
    paddingHorizontal: 4,
  },
  battleCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  battleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  topicTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
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
  playerInfo: {
    marginBottom: 8,
  },
  playerText: {
    fontSize: 14,
  },
  joinText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    borderRadius: 20,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
  },
  topicsList: {
    marginBottom: 20,
  },
  topicCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  topicCardSelected: {
    borderColor: '#6366f1',
  },
  topicDescription: {
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  stanceSection: {
    marginBottom: 20,
  },
  stanceLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginHorizontal: 4,
  },
  stanceButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 4,
  },
  stanceButton: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  stanceButtonSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  stanceButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  stanceButtonTextSelected: {
    color: '#fff',
  },
  modalCreateButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalCreateButtonDisabled: {
    opacity: 0.4,
  },
  modalCreateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
