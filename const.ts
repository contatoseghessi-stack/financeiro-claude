export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate Google login URL - redirects to our backend which handles Google OAuth
export const getLoginUrl = (returnPath?: string) => {
  const origin = window.location.origin;
  return `${origin}/api/auth/google?origin=${encodeURIComponent(origin)}`;
};
