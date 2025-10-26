/**
 * Home screen - Redirects to login or home based on auth state
 */
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../lib/authStore';

export default function IndexScreen() {
  const router = useRouter();
  const { token, loadToken } = useAuthStore();

  useEffect(() => {
    // Load token from storage first
    loadToken().then(() => {
      // If user is already authenticated, go to home
      // Otherwise, go to login
      if (token) {
        router.replace('/home');
      } else {
        router.replace('/auth/login');
      }
    });
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
