const STORAGE_KEY = "photobooth_booth_access_token";

export function getStoredBoothAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(STORAGE_KEY);
}

export function setStoredBoothAccessToken(token: string): void {
  sessionStorage.setItem(STORAGE_KEY, token);
}

export function clearStoredBoothAccessToken(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
