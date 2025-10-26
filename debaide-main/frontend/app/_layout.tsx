/**
 * Root layout with React Query provider
 */
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="topics" />
          <Stack.Screen name="session" />
          <Stack.Screen name="results" />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
