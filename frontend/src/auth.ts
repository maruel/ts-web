// Cache DOM elements to avoid repeated queries
let loginButton: HTMLElement;
let logoutButton: HTMLElement;
let userName: HTMLElement;
let userIcon: HTMLImageElement;

// Flag to track if elements have been initialized
let isInitialized = false;

// Initialize DOM elements when DOM is loaded
export function initializeAuthElements(): void {
  if (isInitialized) return;

  loginButton = document.getElementById('login-button') as HTMLElement;
  logoutButton = document.getElementById('logout-button') as HTMLElement;
  userName = document.getElementById('user-name') as HTMLElement;
  userIcon = document.getElementById('user-icon') as HTMLImageElement;

  isInitialized = true;
}

// Ensure elements are initialized before use
function ensureInitialized(): void {
  if (!isInitialized) {
    throw new Error('Auth elements not initialized. Call initializeAuthElements() first.');
  }
}

// Function to check if user is logged in and update UI accordingly
export async function checkAuthStatus(): Promise<void> {
  ensureInitialized();

  try {
    const response = await fetch('/auth/me');
    if (response.ok) {
      const userData = await response.json();
      // User is logged in
      loginButton.style.display = 'none';
      logoutButton.style.display = 'block';
      userName.textContent = userData.name || '';

      userIcon.src = userData.picture || '/assets/icon.avif';
      userIcon.style.display = 'block';
    } else {
      // User is not logged in
      loginButton.style.display = 'block';
      logoutButton.style.display = 'none';
      userName.textContent = '';
      userIcon.style.display = 'none';
    }
  } catch (error) {
    console.error('Error checking auth status:', error);
    // Default to logged out state
    loginButton.style.display = 'block';
    logoutButton.style.display = 'none';
    userName.textContent = '';
    userIcon.style.display = 'none';
  }
}

// Function to handle login
export function login(): void {
  ensureInitialized();
  window.location.href = '/auth/google';
}

// Function to handle logout
export async function logout(): Promise<void> {
  ensureInitialized();
  try {
    const response = await fetch('/auth/logout', { method: 'GET' });
    if (response.ok) {
      // Redirect to home page or update UI
      window.location.reload();
    } else {
      console.error('Logout failed');
    }
  } catch (error) {
    console.error('Error during logout:', error);
  }
}
