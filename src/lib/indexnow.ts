/** IndexNow's published key file: the backend pings Bing/Yandex/Seznam/Naver with this key. */
export const INDEXNOW_KEY_PATTERN = /^[A-Za-z0-9-]{8,128}$/;

/** The key when the request is exactly its file name and the key is well formed; otherwise null. */
export function publishedIndexNowKey(key: string | undefined, keyFile: string): string | null {
  if (!key || !INDEXNOW_KEY_PATTERN.test(key)) return null;
  return keyFile === `${key}.txt` ? key : null;
}
