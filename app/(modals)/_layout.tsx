/** モーダル専用レイアウト */
import { Stack } from 'expo-router';

export default function ModalLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: 'modal',   // モーダル表示
        headerShown: false,      // ヘッダー非表示（好みで変えてOK）
        contentStyle: { backgroundColor: '#000' },
      }}
    />
  );
}
