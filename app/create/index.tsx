import { useState, useEffect } from 'react';
import { View, Button, Image, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function CreateScreen() {
  const router = useRouter();
  const { imageUri: initialImageUri, selectedFrame } = useLocalSearchParams<{
    imageUri?: string;
    selectedFrame?: string;
  }>();
  const [imageUri, setImageUri] = useState<string | null>(initialImageUri || null);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('許可が必要です', 'カメラロールへのアクセスが許可されていません。');
        return;
      }
    })();
  }, []);

  const pickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'image', // 非推奨を避けるため文字列を使用
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets) {
        console.log('Navigating to:', '/create/frame/index', { imageUri: result.assets[0].uri }); // デバッグ用ログ
        router.push({
          pathname: '/create/frame/index',
          params: { imageUri: result.assets[0].uri },
        });
      } else {
        Alert.alert('エラー', '写真の選択がキャンセルされました');
      }
    } catch (error) {
      console.error('写真選択エラー:', error);
      Alert.alert('エラー', '写真の選択に失敗しました。');
    }
  };

  const createCard = async () => {
    if (!imageUri || !selectedFrame) {
      Alert.alert('エラー', '写真とフレームを選択してください。');
      return;
    }

    try {
      const cardImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          { resize: { width: 300, height: 420 } },
          {
            overlay: {
              originX: 0,
              originY: 0,
              width: 300,
              height: 420,
              image: selectedFrame as string,
            },
          },
        ],
        { compress: 0.8, format: ImageManipulator.SaveFormat.PNG }
      );

      setImageUri(cardImage.uri);
      Alert.alert('成功', 'トレカが作成されました！');
    } catch (error) {
      console.error('トレカ作成エラー:', error);
      Alert.alert('エラー', 'トレカの作成に失敗しました。');
    }
  };

  const saveCard = async () => {
    if (!imageUri) {
      Alert.alert('エラー', '保存するトレカがありません。');
      return;
    }

    try {
      const fileUri = `${FileSystem.documentDirectory}card_${Date.now()}.png`;
      await FileSystem.copyAsync({ from: imageUri, to: fileUri });
      Alert.alert('保存完了', `トレカが保存されました: ${fileUri}\nホームに戻ります。`, [
        { text: 'OK', onPress: () => router.push('/') },
      ]);
    } catch (error) {
      console.error('保存エラー:', error);
      Alert.alert('エラー', 'トレカの保存に失敗しました。');
    }
  };

  const cancel = () => {
    router.push('/');
  };

  return (
    <View style={styles.container}>
      <Button title="写真を選択" onPress={pickImage} />
      <Button title="トレカを作成" onPress={createCard} disabled={!imageUri || !selectedFrame} />
      <Button title="トレカを保存" onPress={saveCard} disabled={!imageUri} />
      <Button title="キャンセル" onPress={cancel} color="#ff4444" />
      {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1a1a1a',
  },
  image: {
    width: 300,
    height: 420,
    resizeMode: 'contain',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#fff',
  },
});