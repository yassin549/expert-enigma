/**
 * Authentication utilities
 * Helper functions for checking authentication status
 */

/**
 * Check if user is authenticated (has access token)
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('access_token')
}

/**
 * Get access token from localStorage
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

/**
 * Clear authentication tokens
 */
export function clearAuth(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

/**
 * Get user info from token (basic implementation)
 * In production, you might want to decode JWT or fetch from API
 */
export function getUserInfo(): { email?: string } | null {
  if (!isAuthenticated()) return null
  // For now, return basic info
  // In production, decode JWT or fetch from /api/auth/me
  return {}
}

