import { View } from 'react-native';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <View>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" redirect /> {/* index から他のルートにリダイレクト */}
        <Stack.Screen name="home" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </View>
  );
}