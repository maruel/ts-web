import './api.ts'; // This will initialize the API event listeners
import { checkAuthStatus, initializeAuthElements, login, logout } from './auth.ts';

// Set up event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Initialize cached DOM elements
  initializeAuthElements();

  // Check auth status when page loads
  checkAuthStatus();

  // Set up login button
  const loginButton = document.getElementById('login-button');
  if (loginButton) {
    loginButton.addEventListener('click', login);
  }

  // Set up logout button
  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', logout);
  }
});
