/* app/create/index.tsx
   ----------------------------------------------
   ① フレームを選ぶ  →  ② 写真選択 (pick-photo) へ
*/
import { useState } from 'react';
import {
  View,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Text,
} from 'react-native';
import { router } from 'expo-router';

/* ← assets/frames に置いた PNG を読み込む */
const framePngs = [
  require('../../assets/frames/frame1.png'),
  require('../../assets/frames/frame2.png'),
  // 追加する場合 ↓
  // require('../../assets/frames/frame3.png'),
];

/* ───────── 画面 ───────── */
export default function FrameSelect() {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  /* PNG が無い場合のガード */
  if (framePngs.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#fff' }}>❗ frames フォルダに PNG がありません</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={framePngs}
        horizontal
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ padding: 24 }}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            onPress={() => {
              /* フレームをハイライト */
              setSelectedIdx(index);
              /* 写真 Picker へ frame インデックスを渡す */
              router.push({
                pathname: '/create/pick-photo',
                params: { frame: index },
              });
            }}
          >
            <Image
              source={item}
              style={[
                styles.thumb,
                selectedIdx === index && styles.selected,
              ]}
            />
          </TouchableOpacity>
        )}
      />
      <Text style={styles.helper}>フレームをタップ → 写真を選択</Text>
    </View>
  );
}

/* ───────── スタイル ───────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  thumb: {
    width: 120,
    height: 180,
    marginRight: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#555',
  },
  selected: { borderColor: '#00aaff' },
  helper: {
    color: '#888',
    textAlign: 'center',
    marginBottom: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});
