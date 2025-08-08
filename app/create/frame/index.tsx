import { useState, useEffect } from 'react';
import { View, FlatList, TouchableOpacity, Image, Text, StyleSheet, Button } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function FrameScreen() {
  const router = useRouter();
  const { imageUri } = useLocalSearchParams<{ imageUri: string }>();
  const [frames, setFrames] = useState<any[]>([]);

  useEffect(() => {
    const frameList = [
      require('@/assets/frames/frame1.png'),
      require('@/assets/frames/frame2.png'),
      // 実際のフレームに合わせて追加
    ];
    setFrames(frameList);
  }, []);

  const selectFrame = (frameUri: string) => {
    router.push({
      pathname: '/create',
      params: { imageUri, selectedFrame: frameUri },
    });
  };

  const cancel = () => {
    router.push('/');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>フレームを選択</Text>
      <FlatList
        data={frames}
        horizontal
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => selectFrame(item)}>
            <Image source={item} style={styles.framePreview} />
          </TouchableOpacity>
        )}
      />
      <Button title="キャンセル" onPress={cancel} color="#ff4444" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#1a1a1a' },
  title: { color: '#fff', fontSize: 20, marginBottom: 10 },
  framePreview: { width: 100, height: 140, marginHorizontal: 5, resizeMode: 'contain', borderWidth: 1, borderColor: '#fff' },
});