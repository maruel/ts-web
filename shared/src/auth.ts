import type { ErrorResponse } from './error.js';

// Packages
import { z } from 'zod';

export interface AuthResponse {
  user: User;
  token: string;
}

// Route response types
export interface AuthRouteResponses {
  // GET /me - Get current user info
  me: {
    response: {
      id: number;
      email: string;
      name: string;
      picture?: string;
    } | ErrorResponse;
    status: 200 | 401 | 404 | 500;
  };

  // GET /google/callback - OAuth callback (redirect response)
  googleCallback: {
    response: null; // Redirect response, no JSON body
    status: 302; // Redirect status
  };

  // GET /google - OAuth login (redirect response)
  googleLogin: {
    response: null; // Redirect response, no JSON body
    status: 302; // Redirect status
  };

  // GET /logout - Logout (redirect response)
  logout: {
    response: null; // Redirect response, no JSON body
    status: 302; // Redirect status
  };
}

export interface User {
  id: number;
  google_id: string;
  email: string;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
  verified_email: boolean;
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  created_at: number;
  updated_at?: number;
}

// Schemas.

export const UserResponseSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
  picture: z.string().url().optional().nullable(),
});

export const UserProfileUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255).optional(),
  picture: z.string().url().max(500).optional(),
});

export const UserProfileUpdateRequestSchema = z.object({
  body: UserProfileUpdateSchema,
});

export const UserIdSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});
