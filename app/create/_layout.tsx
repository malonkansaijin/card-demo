import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'トレカ作成' }} />
      <Stack.Screen name="frame/index" options={{ title: 'フレーム選択' }} />
    </Stack>
  );
}