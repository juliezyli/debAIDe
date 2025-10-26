import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/lib/theme';
import { useAuthStore } from '@/lib/authStore';
import { ThemeToggle } from './ThemeToggle';

interface NavBarProps {
  title?: string;
  showBack?: boolean;
  showHome?: boolean;
  showLogout?: boolean;
  showThemeToggle?: boolean;
  onBackPress?: () => void;
  rightAction?: React.ReactNode;
}

export function NavBar({ 
  title, 
  showBack = false, 
  showHome = false,
  showLogout = false,
  showThemeToggle = true,
  onBackPress, 
  rightAction 
}: NavBarProps) {
  const router = useRouter();
  const { theme } = useThemeStore();
  const { logout } = useAuthStore();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  const handleHomePress = () => {
    router.push('/home');
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/auth/login');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
      <View style={styles.leftSection}>
        {showBack && (
          <TouchableOpacity onPress={handleBackPress} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        )}
        {showHome && (
          <TouchableOpacity onPress={handleHomePress} style={styles.iconButton}>
            <Ionicons name="home" size={24} color={theme.text} />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.centerSection}>
        {title && <Text style={[styles.title, { color: theme.text }]}>{title}</Text>}
      </View>
      
      <View style={styles.rightSection}>
        {showThemeToggle && <ThemeToggle />}
        {showLogout && (
          <TouchableOpacity onPress={handleLogout} style={[styles.iconButton, styles.logoutButton]}>
            <Ionicons name="log-out-outline" size={24} color={theme.text} />
          </TouchableOpacity>
        )}
        {rightAction}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  centerSection: {
    flex: 2,
    alignItems: 'center',
  },
  rightSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
  },
  logoutButton: {
    marginLeft: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
});
