/* app/index.tsx
   ──────────────────────────────────────────
   ホーム：パック開封・コレクション閲覧・カード作成への入口
*/
import { router } from 'expo-router';
import { View, Button, StyleSheet } from 'react-native';

export default function Home() {
  return (
    <View style={styles.root}>
      {/* ▼ パックを開封するタブへ */}
      <Button title="Open Packs" onPress={() => router.push('/(tabs)')} />

      {/* ▼ コレクション一覧へ */}
      <Button
        title="View Collection"
        onPress={() => router.push('/(tabs)/collection')}
      />

      {/* ▼ オリジナルカード作成フローへ */}
      <Button
        title="Create Card"
        color="#28a745"            /* ← 好きな色に変更可 */
        onPress={() => router.push('/create')}
      />
    </View>
  );
}

/* ───────── スタイル ───────── */
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',       // 黒背景（不要なら削除）
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,                       // ボタン同士の間隔
  },
});
