import { router } from 'expo-router';
import { View, Text, Button, StyleSheet } from 'react-native';

export default function Home() {
  return (
    <View style={styles.container}>
      {/* ▼ ガチャ画面へ */}
      <Button
        title="Open Packs"
        onPress={() => router.push('/(tabs)')}
        style={styles.button}
      />

      <View style={styles.spacing} /> {/* スペースを追加 */}

      {/* ▼ コレクション一覧へ */}
      <Button
        title="View Collection"
        onPress={() => router.push('/(tabs)/collection')}
        style={styles.button}
      />

      <View style={styles.spacing} /> {/* スペースを追加 */}

      {/* ▼ 新規カード作成フローへ */}
      <Button
        title="Create Card"
        onPress={() => router.push('/create')}
        color="#28a745"
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  button: {
    marginVertical: 12, // 上下に12のマージンでスペースを確保
  },
  spacing: {
    height: 12, // ボタン間のスペース
  },
});