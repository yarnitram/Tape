/**
 * Share token generation helper for public setups.
 */

export function generateShareToken(prefix: "wt" | "tr"): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let token = `${prefix}_`;
  for (let i = 0; i < 10; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export function buildPublicShareUrl(shareToken: string): string {
  if (typeof window === "undefined") return `/share/${shareToken}`;
  return `${window.location.origin}/share/${shareToken}`;
}
