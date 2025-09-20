// frontend/src/types.ts
import type { User } from 'shared';

// Extend or modify shared types for frontend-specific needs if necessary
export interface FrontendUser extends User {
  // Add frontend-specific properties if needed
  isLoggedIn?: boolean;
}


// Frontend-specific types
export interface AppState {
  user: FrontendUser | null;
  error: string | null;
}
