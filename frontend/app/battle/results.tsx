import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useThemeStore } from '@/lib/store';
import { NavBar } from '@/components/NavBar';

export default function BattleResultsScreen() {
  const { judgmentData: judgmentParam } = useLocalSearchParams<{ judgmentData: string }>();
  const isDark = useThemeStore((state) => state.isDark);
  
  const judgment = judgmentParam ? JSON.parse(judgmentParam) : null;
  
  if (!judgment) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
        <Text style={{ color: isDark ? '#fff' : '#000' }}>No judgment data</Text>
      </SafeAreaView>
    );
  }
  
  const bgColor = isDark ? '#000' : '#fff';
  const textColor = isDark ? '#fff' : '#000';
  const cardBg = isDark ? '#1a1a1a' : '#f5f5f5';
  
  // Handle both nested and direct judgment structures
  const judgmentData = judgment.judgment || judgment;
  const player1Total = judgmentData.player1_scores?.total || 0;
  const player2Total = judgmentData.player2_scores?.total || 0;
  const isPlayer1Winner = judgmentData.winner === 'player1';
  const winnerUsername = judgment.winner?.username || (isPlayer1Winner ? 'Player 1' : 'Player 2');
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }}>
      <NavBar title="Battle Results" showBack showHome showThemeToggle />
      <ScrollView style={[styles.container, { backgroundColor: bgColor }]}>
        <View style={styles.content}>
        {/* Winner Banner */}
        <View style={[styles.winnerBanner, { backgroundColor: '#10b981' }]}>
          <Text style={styles.winnerTitle}>WINNER</Text>
          <Text style={styles.winnerName}>{winnerUsername}</Text>
        </View>
        
        {/* Score Comparison */}
        <View style={[styles.scoreCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Final Scores</Text>
          
          <View style={styles.scoreRow}>
            <View style={styles.scoreColumn}>
              <Text style={[styles.scoreName, { color: textColor }]}>Player 1</Text>
              <Text
                style={[
                  styles.scoreValue,
                  { color: isPlayer1Winner ? '#10b981' : textColor },
                ]}
              >
                {player1Total}
              </Text>
            </View>
            
            <Text style={[styles.scoreVs, { color: textColor }]}>VS</Text>
            
            <View style={styles.scoreColumn}>
              <Text style={[styles.scoreName, { color: textColor }]}>Player 2</Text>
              <Text
                style={[
                  styles.scoreValue,
                  { color: !isPlayer1Winner ? '#10b981' : textColor },
                ]}
              >
                {player2Total}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Detailed Scores */}
        <View style={[styles.detailCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Score Breakdown</Text>
          
          {[
            { key: 'argument_strength', label: 'Argument Strength' },
            { key: 'logic_reasoning', label: 'Logic & Reasoning' },
            { key: 'evidence', label: 'Evidence & Examples' },
            { key: 'rebuttal', label: 'Rebuttal Quality' },
            { key: 'delivery', label: 'Delivery & Clarity' },
          ].map((criteria) => (
            <View key={criteria.key} style={styles.criteriaRow}>
              <Text style={[styles.criteriaLabel, { color: textColor }]}>
                {criteria.label}
              </Text>
              <View style={styles.criteriaScores}>
                <Text style={[styles.criteriaScore, { color: textColor }]}>
                  {judgmentData.player1_scores?.[criteria.key] || 0}
                </Text>
                <Text style={[styles.criteriaScore, { color: textColor }]}>
                  {judgmentData.player2_scores?.[criteria.key] || 0}
                </Text>
              </View>
            </View>
          ))}
        </View>
        
        {/* Decision Summary */}
        <View style={[styles.summaryCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Judge's Decision</Text>
          <Text style={[styles.summaryText, { color: textColor }]}>
            {judgmentData.decision_summary || 'No summary available'}
          </Text>
        </View>
        
        {/* Strengths & Weaknesses */}
        <View style={[styles.feedbackCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Player 1 Feedback</Text>
          
          <Text style={[styles.feedbackSubtitle, { color: '#10b981' }]}>Strengths:</Text>
          {(judgmentData.player1_strengths || []).map((strength: string, idx: number) => (
            <Text key={idx} style={[styles.feedbackItem, { color: textColor }]}>
              • {strength}
            </Text>
          ))}
          
          <Text style={[styles.feedbackSubtitle, { color: '#ef4444', marginTop: 12 }]}>
            Weaknesses:
          </Text>
          {(judgmentData.player1_weaknesses || []).map((weakness: string, idx: number) => (
            <Text key={idx} style={[styles.feedbackItem, { color: textColor }]}>
              • {weakness}
            </Text>
          ))}
        </View>
        
        <View style={[styles.feedbackCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Player 2 Feedback</Text>
          
          <Text style={[styles.feedbackSubtitle, { color: '#10b981' }]}>Strengths:</Text>
          {(judgmentData.player2_strengths || []).map((strength: string, idx: number) => (
            <Text key={idx} style={[styles.feedbackItem, { color: textColor }]}>
              • {strength}
            </Text>
          ))}
          
          <Text style={[styles.feedbackSubtitle, { color: '#ef4444', marginTop: 12 }]}>
            Weaknesses:
          </Text>
          {(judgmentData.player2_weaknesses || []).map((weakness: string, idx: number) => (
            <Text key={idx} style={[styles.feedbackItem, { color: textColor }]}>
              • {weakness}
            </Text>
          ))}
        </View>
        
        {/* Action Buttons */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/battle/lobby')}
        >
          <Text style={styles.backButtonText}>Back to Lobby</Text>
        </TouchableOpacity>
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
  winnerBanner: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  winnerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    opacity: 0.9,
    marginBottom: 4,
  },
  winnerName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  scoreCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 16,
  },
  scoreColumn: {
    alignItems: 'center',
  },
  scoreName: {
    fontSize: 14,
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  scoreVs: {
    fontSize: 20,
    fontWeight: '600',
    opacity: 0.5,
  },
  detailCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  criteriaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  criteriaLabel: {
    fontSize: 14,
    flex: 1,
  },
  criteriaScores: {
    flexDirection: 'row',
    gap: 32,
  },
  criteriaScore: {
    fontSize: 16,
    fontWeight: '600',
    width: 30,
    textAlign: 'center',
  },
  summaryCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
  },
  feedbackCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  feedbackSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  feedbackItem: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
    marginLeft: 8,
  },
  backButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
