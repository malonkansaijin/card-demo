// app/components/CardImage.tsx
import React, { useEffect, useState } from 'react';
import { Platform, ImageStyle, StyleProp } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import * as FileSystem from 'expo-file-system';

type Props = {
  src: string | null | undefined;
  style?: StyleProp<ImageStyle>;
  alt?: string;
};

export default function CardImage({ src, style, alt }: Props) {
  const [localUrl, setLocalUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let objectUrl: string | null = null;

    async function run() {
      if (!src) {
        setLocalUrl(null);
        return;
      }
      try {
        if (Platform.OS === 'web') {
          const res = await fetch(src, { cache: 'no-store', mode: 'cors', credentials: 'omit' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const blob = await res.blob();
          objectUrl = URL.createObjectURL(blob);
          if (alive) setLocalUrl(objectUrl);
        } else {
          const filename = `${FileSystem.cacheDirectory}${encodeURIComponent(src)}.img`;
          const { uri } = await FileSystem.downloadAsync(src, filename, { cache: false });
          if (alive) setLocalUrl(uri);
        }
      } catch (e) {
        console.error('CardImage load failed:', src, e);
        if (alive) setLocalUrl(null);
      }
    }

    run();

    return () => {
      alive = false;
      if (Platform.OS === 'web' && objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

  // ---- Web ----
  if (Platform.OS === 'web') {
    const styleObj = Array.isArray(style)
      ? Object.assign({}, ...style)
      : (style as React.CSSProperties | undefined);

    // localUrl ができるまでは枠だけ出す（空 src を渡さない）
    if (!localUrl) {
      return <div style={styleObj} />;
    }

    return (
      // @ts-ignore: React Native Web -> DOM
      <img
        src={localUrl}
        alt={alt ?? ''}
        crossOrigin="anonymous"
        style={{ ...styleObj, objectFit: 'cover' }}
        onError={(e) => console.log('IMG ERROR', src, (e.currentTarget as HTMLImageElement).src)}
        onLoad={() => console.log('IMG END', src)}
      />
    );
  }

  // ---- Native (iOS/Android) ----
  return (
    <ExpoImage
      source={localUrl ? { uri: localUrl } : undefined}
      style={style}
      contentFit="cover"
      transition={null}
      onError={(e) => console.log('IMG ERROR', src, e?.nativeEvent)}
      onLoadEnd={() => console.log('IMG END', src)}
    />
  );
}
