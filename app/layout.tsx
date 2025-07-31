import { View } from 'react-native';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <View>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" redirect />
      </Stack>
    </View>
  );
}