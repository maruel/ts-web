// Declare module-level variables that will be initialized after DOM loads
let spinner: HTMLElement;
let out: HTMLElement;
let testDbButton: HTMLButtonElement;

// Test database connection
export async function testDatabaseConnection(): Promise<void> {
  // show spinner and disable button
  spinner.classList.add('show');
  testDbButton.disabled = true;

  try {
    const res = await fetch('/api/db/testing', { method: 'GET' });
    const text = await res.text();

    // Try parse JSON
    try {
      const json = JSON.parse(text);

      if (!res.ok) {
        // Handle error responses which are now also JSON
        displayError(`Database test failed: ${json.error || 'Unknown error'}`);
        console.error('Database test failed', res.status, json);
        return;
      }

      // Success case
      displaySuccess(`Database connection successful!
User: ${json.user?.name || 'Unknown'}
SQLite version: ${json.sqlite_version?.join('.') || 'Unknown'}`);
    } catch (e) {
      // This should not happen anymore since server always returns JSON
      displayError(`Invalid JSON response: ${text}`);
      console.error('Failed to parse JSON response', e);
    }
  } catch (err) {
    displayError('Database test error: ' + String(err));
    console.error(err);
  } finally {
    // hide spinner and re-enable button
    spinner.classList.remove('show');
    testDbButton.disabled = false;
  }
}

// Display error message with proper styling
function displayError(message: string): void {
  out.innerHTML = `<div class="error-message">${message}</div>`;
}

// Display success message with proper styling
function displaySuccess(message: string): void {
  out.innerHTML = `<div class="success-message">${message}</div>`;
}

// Initialize all elements and set up event listeners after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize module-level variables since DOM is now loaded
  spinner = document.getElementById('spinner') as HTMLElement;
  out = document.getElementById('result') as HTMLElement;
  testDbButton = document.getElementById('testDbButton') as HTMLButtonElement;

  // Test database connection when button is clicked
  testDbButton.addEventListener('click', () => {
    testDatabaseConnection();
  });
});
