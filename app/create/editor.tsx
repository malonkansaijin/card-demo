/* app/create/editor.tsx — “Next→details”接続版
   - 写真=メモリ(getCreatePhoto)から受け取り
   - フレーム前面固定／写真だけドラッグ
   - 回転 ±90°ボタン＋微調整±45°
   - 拡大縮小 ±150%（中心基準）
   - Reset（回転0 / 100% / 中央）
   - Titleダイアログ
   - NextでPNGを書き出し → setPendingCard して /create/details へ
*/
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Alert, Platform, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { Provider as PaperProvider, Button, Dialog, Portal, TextInput } from 'react-native-paper';
import { getCreatePhoto, clearCreatePhoto, setPendingCard } from '@/lib/createSession';

let WebView: any = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  WebView = require('react-native-webview').WebView;
}

// 必要に応じてフレームを増やしてください
const framePngs = [
  require('../../assets/frames/frame1.png'),
  require('../../assets/frames/frame2.png'),
];

// ---- helpers ----
async function assetToDataURL(mod: number): Promise<string> {
  const asset = Asset.fromModule(mod);
  await asset.downloadAsync();
  if (Platform.OS === 'web') {
    const res = await fetch(asset.uri);
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    return dataUrl;
  } else {
    const base64 = await FileSystem.readAsStringAsync(asset.localUri!, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:image/png;base64,${base64}`;
  }
}

export default function Editor() {
  // ルート params は frame のみ（写真はメモリから取得）
  const { frame: rawFrame } = useLocalSearchParams<{ frame?: string }>();
  const frameIdx = Number(rawFrame ?? 0);

  const photoDataUrl = getCreatePhoto() ?? '';
  useEffect(() => {
    if (!photoDataUrl) {
      Alert.alert('No photo', '写真が見つかりません。最初からやり直してください。');
      router.replace('/create');
    }
  }, []);

  const [frameDataUrl, setFrameDataUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('Title');
  const [titleDialog, setTitleDialog] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const d = await assetToDataURL(framePngs[frameIdx] ?? framePngs[0]);
        setFrameDataUrl(d);
      } catch (e: any) {
        Alert.alert('Error', e?.message ?? 'フレーム読み込みに失敗しました');
        router.back();
      }
    })();
  }, [frameIdx]);

  // ====== editor HTML (Fabric.js) ======
  const html = useMemo(
    () => `<!doctype html>
<html><head><meta charset='utf-8' />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<script src="https://cdn.jsdelivr.net/npm/fabric@5.3.0/dist/fabric.min.js"></script>
<style>
  *{box-sizing:border-box}
  html,body{margin:0;height:100%;background:#000;display:flex;flex-direction:column}
  #wrap{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 12px 6px}
  #c{border-radius:12px;display:block}
  #ui{width:100%;max-width:720px;padding:8px 6px 14px}
  .row{display:flex;align-items:center;gap:10px;margin-top:10px}
  .btn{min-width:44px;height:44px;border-radius:22px;border:none;padding:0 10px;background:#1f6feb;color:#fff;font-size:20px}
  .btn:active{opacity:.85}
  .slider{flex:1;height:44px}
  .label{color:#888;font-size:12px;width:44px;text-align:center}
  .reset{width:120px;background:#7c3aed}
</style>
</head><body>
<div id="wrap">
  <canvas id='c' width='640' height='960' aria-label="canvas"></canvas>
</div>
<div id="ui" aria-label="controls">
  <div class="row">
    <button id="rotL"  class="btn" aria-label="rotate-left">⟲</button>
    <input id="rotFine" class="slider" type="range" min="-45" max="45" step="1" value="0" />
    <button id="rotR"  class="btn" aria-label="rotate-right">⟳</button>
  </div>
  <div class="row" style="justify-content:space-between;margin-top:2px">
    <span class="label">-45°</span><span class="label">0°</span><span class="label">45°</span>
  </div>
  <div class="row" style="margin-top:12px">
    <span class="btn" style="background:#444">–</span>
    <input id="scale" class="slider" type="range" min="-150" max="150" step="1" value="0" />
    <span class="btn" style="background:#444">＋</span>
  </div>
  <div class="row" style="justify-content:center">
    <button id="reset" class="btn reset" aria-label="reset">Reset</button>
  </div>
</div>

<script>
  const isRN = !!window.ReactNativeWebView;
  const send = (obj) => {
    if (isRN) window.ReactNativeWebView.postMessage(JSON.stringify(obj));
    else window.parent.postMessage(obj, '*');
  };
  window.onerror = (m) => console.log(m);

  const RATIO = 960/640;
  let canvas, img, frame, textbox;
  let baseScale = 1, scaleDeltaPct = 0;  // -150..150
  let baseRotation = 0, fineRotation = 0;

  function keepTop(){ if(frame) frame.bringToFront(); if(textbox) textbox.bringToFront(); }

  function applyTransform() {
    if (!img) return;
    const center = img.getCenterPoint();
    const factor = Math.max(0.1, 1 + (scaleDeltaPct/100)); // 0.1x〜2.5x
    img.set({ originX:'center', originY:'center' });
    img.scale(baseScale * factor);
    img.rotate(baseRotation + fineRotation);
    img.setPositionByOrigin(center, 'center', 'center');
    img.setCoords();
    keepTop(); canvas.requestRenderAll();
  }

  function sizeCanvasToViewport() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const maxWByWidth  = vw * 0.92;
    const maxWByHeight = (vh * 0.70) / RATIO;
    const w = Math.floor(Math.min(640, Math.min(maxWByWidth, maxWByHeight)));
    const h = Math.floor(w * RATIO);
    const c = document.getElementById('c');
    c.width = w; c.height = h; c.style.width = w+'px'; c.style.height = h+'px';

    if (canvas) {
      canvas.setWidth(w); canvas.setHeight(h);
      if (img) {
        const currentFactor = Math.max(0.1, 1 + (scaleDeltaPct/100));
        baseScale = (w / img.width) / currentFactor;
        applyTransform();
      }
      if (frame) { frame.scaleToWidth(w); frame.setCoords(); }
      if (textbox) {
        textbox.set({ width: Math.max(100, w - 40), top: Math.round(h * 0.73), fontSize: Math.round(w * (60/640)) });
        textbox.setCoords();
      }
      canvas.requestRenderAll();
    }
  }
  window.addEventListener('resize', sizeCanvasToViewport);

  function init(photoUrl, frameUrl, initialTitle){
    canvas = new fabric.Canvas('c', { backgroundColor:'#000', preserveObjectStacking: true });
    sizeCanvasToViewport();

    // 写真（ドラッグ可）
    fabric.Image.fromURL(photoUrl, (i) => {
      img = i;
      img.set({ selectable:true, hasControls:false, hasBorders:false, lockRotation:true, originX:'center', originY:'center' });
      img.setControlsVisibility({bl:false,br:false,tl:false,tr:false,ml:false,mt:false,mr:false,mb:false,mtr:false});
      baseScale = canvas.getWidth() / img.width; img.scale(baseScale); canvas.centerObject(img); canvas.add(img);

      // フレーム（常に前面・非選択）
      fabric.Image.fromURL(frameUrl, (f)=>{
        frame = f; frame.scaleToWidth(canvas.getWidth());
        frame.set({ selectable:false, evented:false, hasControls:false, hasBorders:false, hoverCursor:'default' });
        canvas.add(frame); keepTop();
      }, { crossOrigin:'anonymous' });

      // タイトル（編集可・前面固定）
      textbox = new fabric.Textbox(initialTitle || 'Title', {
        width: Math.max(100, canvas.getWidth() - 40),
        top: Math.round(canvas.getHeight() * 0.73),
        fill:'#fff',
        fontSize: Math.round(canvas.getWidth() * (60/640)),
        textAlign:'center',
        editable:true
      });
      canvas.add(textbox); keepTop();

      // ピンチズーム（写真のみ）
      const uc = canvas.upperCanvasEl;
      let startDist=0, startFactor=1;
      const dist = (t)=>{const[a,b]=t; return Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY);};
      uc.addEventListener('touchstart',e=>{ if(e.touches.length===2){ startDist=dist(e.touches); startFactor=Math.max(0.1, 1+(scaleDeltaPct/100)); }},{passive:true});
      uc.addEventListener('touchmove',e=>{
        if(e.touches.length===2){
          const ratio=dist(e.touches)/startDist;
          const factor = Math.max(0.1, Math.min(2.5, startFactor*ratio));
          scaleDeltaPct = Math.max(-150, Math.min(150, Math.round((factor - 1) * 100)));
          document.getElementById('scale').value = String(scaleDeltaPct);
          applyTransform();
        }
      },{passive:true});
    });

    // 回転・拡大UI
    document.getElementById('rotL').addEventListener('click', ()=>{ baseRotation-=90; applyTransform(); });
    document.getElementById('rotR').addEventListener('click', ()=>{ baseRotation+=90; applyTransform(); });
    document.getElementById('rotFine').addEventListener('input', (ev)=>{ fineRotation=parseInt(ev.target.value,10)||0; applyTransform(); });
    document.getElementById('scale').addEventListener('input', (ev)=>{ scaleDeltaPct=parseInt(ev.target.value,10)||0; applyTransform(); });
    document.getElementById('reset').addEventListener('click', ()=>{
      baseRotation=0; fineRotation=0; scaleDeltaPct=0;
      document.getElementById('rotFine').value='0'; document.getElementById('scale').value='0';
      if (img) canvas.centerObject(img); applyTransform();
    });
  }

  function setTitle(text){
    if (textbox) { textbox.set({ text }); keepTop(); canvas.requestRenderAll(); }
  }

  // PNGを書き出す
  function exportPng(){
    const url = canvas.toDataURL({ format:'png', multiplier: 1 });
    send({ type:'EXPORTED', url });
  }

  // 受信
  if (window.ReactNativeWebView) {
    document.addEventListener('message', (ev) => {
      const p = JSON.parse(ev.data || '{}');
      if (p.type === 'INIT')      init(p.photo, p.frame, p.title || 'Title');
      if (p.type === 'SET_TITLE') setTitle(p.text || 'Title');
      if (p.type === 'EXPORT')    exportPng();
    });
  } else {
    window.addEventListener('message', (ev) => {
      const d = ev.data || {};
      if (d.type === 'INIT')      init(d.photo, d.frame, d.title || 'Title');
      if (d.type === 'SET_TITLE') setTitle(d.text || 'Title');
      if (d.type === 'EXPORT')    exportPng();
    });
  }
</script>
</body></html>`,
    []
  );

  // ===== Native(WebView) =====
  const webRef = useRef<any>(null);
  const sendToWebView = (obj: any) => webRef.current?.postMessage(JSON.stringify(obj));

  // “EXPORTED”を待ち受けるためのresolver
  const exportResolverRef = useRef<((url: string) => void) | null>(null);

  const onWebMessage = (e: any) => {
    try {
      const dataStr = e.nativeEvent.data;
      const msg = typeof dataStr === 'string' ? JSON.parse(dataStr) : dataStr;
      if (msg?.type === 'EXPORTED' && typeof msg.url === 'string') {
        exportResolverRef.current?.(msg.url);
        exportResolverRef.current = null;
      }
    } catch {}
  };

  const onWebLoad = () => {
    if (!frameDataUrl || !photoDataUrl) return;
    sendToWebView({ type: 'INIT', photo: photoDataUrl, frame: frameDataUrl, title });
  };

  useEffect(() => {
    if (Platform.OS !== 'web' && frameDataUrl) onWebLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameDataUrl]);

  // ===== Web(iframe) =====
  // @ts-ignore
  const iframeRef = useRef<any>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const postToIframe = (obj: any) => iframeRef.current?.contentWindow?.postMessage(obj, '*');

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (ev: MessageEvent) => {
      const d = ev.data || {};
      if (d?.type === 'EXPORTED' && typeof d.url === 'string') {
        exportResolverRef.current?.(d.url);
        exportResolverRef.current = null;
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!iframeReady || !frameDataUrl || !photoDataUrl) return;
    postToIframe({ type: 'INIT', photo: photoDataUrl, frame: frameDataUrl, title });
  }, [iframeReady, frameDataUrl]);

  // ===== UI: Back / Title / Next =====
  const applyTitle = () => {
    const msg = { type: 'SET_TITLE', text: title };
    if (Platform.OS === 'web') postToIframe(msg);
    else sendToWebView(msg);
    setTitleDialog(false);
  };

  // PNGを書き出してメモリに保存→detailsへ
  const exportCanvas = async (): Promise<string> =>
    new Promise((resolve, reject) => {
      exportResolverRef.current = resolve;
      if (Platform.OS === 'web') postToIframe({ type: 'EXPORT' });
      else sendToWebView({ type: 'EXPORT' });
      setTimeout(() => {
        if (exportResolverRef.current) {
          exportResolverRef.current = null;
          reject(new Error('export timeout'));
        }
      }, 8000);
    });

  const goDetails = async () => {
    try {
      const dataUrl = await exportCanvas();
      // 最終画像とタイトルをメモリに保存
      setPendingCard({ finalImageDataUrl: dataUrl, pendingTitle: title });
      // 元写真は不要ならクリア
      clearCreatePhoto();
      router.push('/create/details');
    } catch (e: any) {
      Alert.alert('エクスポート失敗', e?.message ?? 'Unknown error');
    }
  };

  return (
    <PaperProvider>
      <View style={styles.root}>
        {Platform.OS === 'web' ? (
          // @ts-ignore
          <iframe
            ref={iframeRef}
            srcDoc={html}
            onLoad={() => setIframeReady(true)}
            style={{ flex: 1, border: 'none' }}
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <WebView
            ref={webRef}
            originWhitelist={['*']}
            source={{ html }}
            onLoadEnd={onWebLoad}
            onMessage={onWebMessage}
            javaScriptEnabled
            allowFileAccess
            allowUniversalAccessFromFileURLs
            mixedContentMode="always"
            style={{ flex: 1 }}
          />
        )}

        <View style={styles.bottomBar}>
          <Button mode="contained" onPress={() => router.back()} style={styles.btn}>
            Back
          </Button>
          <Button mode="contained" onPress={() => setTitleDialog(true)} style={styles.btn}>
            Title
          </Button>
          <Button mode="contained" onPress={goDetails} style={styles.btn}>
            Next
          </Button>
        </View>

        <Portal>
          <Dialog visible={titleDialog} onDismiss={() => setTitleDialog(false)}>
            <Dialog.Title>タイトルを入力</Dialog.Title>
            <Dialog.Content>
              <TextInput value={title} onChangeText={setTitle} mode="outlined" />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setTitleDialog(false)}>キャンセル</Button>
              <Button onPress={applyTitle}>適用</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#000',
  },
  btn: { flex: 1, borderRadius: 24, backgroundColor: '#6b4fd3' },
});
