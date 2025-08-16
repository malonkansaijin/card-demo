// lib/createSession.ts
// 画面間の一時受け渡し。globalThisに保持してFast Refreshでも消えにくくする。

type Rarity = 'C' | 'R' | 'SR' | 'UR' | null;

type CreateSession = {
  photoDataUrl: string | null;      // 元写真（Editorに渡す用）
  finalImageDataUrl: string | null; // Editorで合成した最終画像（detailsで保存用）
  pendingTitle: string | null;      // Editorで入力したタイトル
  pendingRarity: Rarity;            // （必要なら）エディタで選んだレアリティ
};

const KEY = '__CREATE_SESSION__';
const g = globalThis as any;
if (!g[KEY]) {
  g[KEY] = {
    photoDataUrl: null,
    finalImageDataUrl: null,
    pendingTitle: null,
    pendingRarity: null,
  } as CreateSession;
}
const store: CreateSession = g[KEY];

// 既存
export function setCreatePhoto(dataUrl: string) { store.photoDataUrl = dataUrl; }
export function getCreatePhoto(): string | null { return store.photoDataUrl; }
export function clearCreatePhoto() { store.photoDataUrl = null; }

// 新規：最終画像/タイトル/レアリティ
export function setPendingCard(p: Partial<Omit<CreateSession, 'photoDataUrl'>>) {
  if (typeof p.finalImageDataUrl === 'string') store.finalImageDataUrl = p.finalImageDataUrl;
  if (typeof p.pendingTitle === 'string') store.pendingTitle = p.pendingTitle;
  if (typeof p.pendingRarity !== 'undefined') store.pendingRarity = p.pendingRarity as Rarity;
}
export function getPendingCard() {
  const { finalImageDataUrl, pendingTitle, pendingRarity } = store;
  return { finalImageDataUrl, pendingTitle, pendingRarity };
}
export function clearPendingCard() {
  store.finalImageDataUrl = null;
  store.pendingTitle = null;
  store.pendingRarity = null;
}
