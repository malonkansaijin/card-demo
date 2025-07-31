import { router } from 'expo-router';
import { View, Button } from 'react-native';

export default function Home() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 24,
        backgroundColor: '#000', // 画面を黒背景にしたい場合
      }}
    >
      {/* ▼ ガチャ画面へ */}
      <Button
        title="Open Packs"
        onPress={() => router.push('/(tabs)')}
      />

      {/* ▼ コレクション一覧へ */}
      <Button
        title="View Collection"
        onPress={() => router.push('/(tabs)/collection')}
      />

      {/* ▼ 新規カード作成フローへ */}
      <Button
        title="Create Card"
        onPress={() => router.push('/create')}
        color="#28a745"           // 好きな色に変更可
      />
    </View>
  );
}