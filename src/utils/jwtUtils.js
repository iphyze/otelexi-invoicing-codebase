/**
 * Utility functions for JWT token handling
 */

export const isTokenExpired = (token) => {
  if (!token) return true;

  try {
    // Get the payload part of the JWT
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    // Check if expiration time exists and compare with current time
    if (payload.exp) {
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      return Date.now() >= expirationTime;
    }
    
    return true; // If no expiration in token, consider it expired
  } catch (error) {
    console.error('Error parsing token:', error);
    return true; // If token is invalid, consider it expired
  }
};