import { initialState } from './trip';
import { restoreState } from './engine';

export const STORAGE_KEY = 'mom70-trip-v2';

export function loadTrip() {
  try {
    return restoreState(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
  } catch {
    return initialState();
  }
}

export interface Memory {
  id: string;
  place: string;
  note: string;
  date: string;
  photo?: Blob;
}

function storageError(error: DOMException | null, fallback: string): Error {
  if (error?.name === 'QuotaExceededError') {
    return new Error('기기 저장 공간이 부족해 저장할 수 없어요. 불필요한 사진이나 파일을 정리한 뒤 다시 시도해 주세요.');
  }
  return new Error(fallback);
}

let database: Promise<IDBDatabase> | undefined;
function db() {
  database ??= new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      database = undefined;
      reject(new Error('이 브라우저에서는 사진 저장소를 사용할 수 없어요. 일반 브라우저에서 다시 열어 주세요.'));
      return;
    }
    const request = indexedDB.open('mom70-memories', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('memories', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      database = undefined;
      reject(storageError(request.error, '이 브라우저에서는 사진 저장소를 열 수 없어요. 일반 브라우저에서 다시 열어 주세요.'));
    };
  });
  return database;
}

export async function listMemories(): Promise<Memory[]> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const request = database.transaction('memories').objectStore('memories').getAll();
    request.onsuccess = () => resolve((request.result as Memory[]).sort((a, b) => b.date.localeCompare(a.date)));
    request.onerror = () => reject(storageError(request.error, '저장된 여행 기록을 불러오지 못했어요.'));
  });
}

export async function putMemory(memory: Memory) {
  const database = await db();
  return new Promise<void>((resolve, reject) => {
    const tx = database.transaction('memories', 'readwrite');
    tx.objectStore('memories').put(memory);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(storageError(tx.error, '저장 공간을 확인한 뒤 다시 시도해 주세요.'));
    tx.onabort = () => reject(storageError(tx.error, '저장 공간을 확인한 뒤 다시 시도해 주세요.'));
  });
}

export async function deleteMemory(id: string) {
  const database = await db();
  return new Promise<void>((resolve, reject) => {
    const tx = database.transaction('memories', 'readwrite');
    tx.objectStore('memories').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(storageError(tx.error, '추억을 삭제하지 못했어요. 다시 시도해 주세요.'));
    tx.onabort = () => reject(storageError(tx.error, '추억을 삭제하지 못했어요. 다시 시도해 주세요.'));
  });
}

export async function compressPhoto(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('사진 파일을 선택해 주세요.');
  if (file.size > 30 * 1024 * 1024) throw new Error('30MB 이하 사진을 선택해 주세요.');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('이 사진 형식을 읽을 수 없어요. JPG·PNG·WebP로 바꿔 선택해 주세요.');
  }
  try {
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('사진을 처리하지 못했어요.');
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('사진 저장에 실패했어요.'))),
        'image/jpeg',
        0.86,
      ),
    );
  } finally {
    bitmap.close();
  }
}
