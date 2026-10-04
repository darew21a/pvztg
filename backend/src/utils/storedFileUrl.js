const STORED_FILE_URL = /^\/api\/uploads\/[a-f0-9-]+\.(?:pdf|jpg|png)$/i;

export function getStoredFileUrl(uploadedUrl, clientValue) {
  if (uploadedUrl) return uploadedUrl;
  if (clientValue == null || String(clientValue).trim() === "") return null;

  const value = String(clientValue).trim();
  return STORED_FILE_URL.test(value) ? value : undefined;
}
