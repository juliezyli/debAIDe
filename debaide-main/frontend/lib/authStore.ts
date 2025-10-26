import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  
  // Actions
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadToken: () => Promise<void>;
  setToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,
  
  login: async (username: string, password: string) => {
    try {
      const response = await fetch(
        `${API_URL}/auth/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        { method: 'POST' }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }
      
      const data = await response.json();
      
      // Save token to AsyncStorage
      await AsyncStorage.setItem('auth_token', data.access_token);
      
      set({ token: data.access_token, user: data.user });
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  register: async (username: string, email: string, password: string) => {
    try {
      const response = await fetch(
        `${API_URL}/auth/register?username=${encodeURIComponent(username)}&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
        { method: 'POST' }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Registration failed');
      }
      
      const data = await response.json();
      
      // Save token to AsyncStorage
      await AsyncStorage.setItem('auth_token', data.access_token);
      
      set({ token: data.access_token, user: data.user });
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },
  
  logout: async () => {
    await AsyncStorage.removeItem('auth_token');
    set({ token: null, user: null });
  },
  
  loadToken: async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      if (token) {
        // Verify token by fetching user info
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (response.ok) {
          const user = await response.json();
          set({ token, user, isLoading: false });
        } else {
          // Token is invalid
          await AsyncStorage.removeItem('auth_token');
          set({ token: null, user: null, isLoading: false });
        }
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Load token error:', error);
      set({ isLoading: false });
    }
  },
  
  setToken: (token: string | null) => {
    set({ token });
  },
}));
