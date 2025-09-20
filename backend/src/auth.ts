// Packages
import { googleAuth } from '@hono/oauth-providers/google';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';

// Local
import { appBaseUrl, isProd } from './config.js';
import type { Env } from './schema.js';
import { users } from './schema.js';

// Shared types and schemas
import type { AuthRouteResponses, ErrorResponse } from 'shared';
import { UserProfileUpdateSchema, UserResponseSchema } from 'shared';

// Types from Google OAuth provider
type OAuthToken = {
  token: string;
  expires_in?: number;
};

type GoogleUser = {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
};


export const authApp = new Hono<Env>();

// Validate required environment variables at startup
const missingEnvVars = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'].filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.warn(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  console.warn('Environment variables:', Object.entries(process.env).sort().filter(([key]) => key.startsWith('G') || key.startsWith('A')).map(([key, value]) => `${key}=${value}`).join('\n'));
}

// https://console.cloud.google.com/apis/credentials
// 127.0.0.1 and localhost are allowed on ports 3000 and 3001.
const GOOGLE_CLIENT_ID = process.env['GOOGLE_CLIENT_ID'] || '';
const GOOGLE_CLIENT_SECRET = process.env['GOOGLE_CLIENT_SECRET'] || '';

// Google OAuth login route
// Uses: AuthRouteResponses['googleLogin']
authApp.get('/google',
  async (_, next) => {
    // Validate required environment variables
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      throw new HTTPException(500, { message: 'Server is not configured for Google OAuth' });
    }
    await next();
  },
  googleAuth({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    scope: ['openid', 'profile', 'email'],
    redirect_uri: `${appBaseUrl}/auth/google/callback`,
  }),
);

// Google OAuth callback route
// Uses: AuthRouteResponses['googleCallback']
authApp.get('/google/callback',
  async (_, next) => {
    // Validate required environment variables
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      throw new HTTPException(500, { message: 'Server is not configured for Google OAuth' });
    }
    await next();
  },
  googleAuth({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    scope: ['openid', 'profile', 'email'],
    redirect_uri: `${appBaseUrl}/auth/google/callback`,
  }),
  async (c) => {
    const token = c.get('token') as OAuthToken | undefined;
    const googleUser = c.get('user-google') as Partial<GoogleUser> | undefined;
    // Check for OAuth errors
    if (!token || !googleUser) {
      console.error('OAuth callback failed: missing token or user data', { token, googleUser });
      throw new HTTPException(500, { message: 'Authentication failed: missing OAuth data' });
    }
    // Validate required user data
    if (!googleUser.email) {
      console.error('OAuth callback failed: missing user email', { googleUser });
      throw new HTTPException(400, { message: 'Authentication failed: missing email' });
    }
    if (!googleUser.id) {
      console.error('OAuth callback failed: missing user ID', { googleUser });
      throw new HTTPException(400, { message: 'Authentication failed: missing Google ID' });
    }

    // TODO: Use encrypted access token.
    try {
      // Save or update user in database
      const [dbUser] = await c.var.db
        .insert(users)
        .values({
          google_id: googleUser.id,
          email: googleUser.email,
          name: googleUser.name || '',
          given_name: googleUser.given_name || null,
          family_name: googleUser.family_name || null,
          picture: googleUser.picture || null,
          locale: googleUser.locale || null,
          verified_email: googleUser.verified_email ?? false,
          access_token: token.token || '',
          refresh_token: null, // Google OAuth doesn't provide refresh tokens in this flow
          expires_at: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
        })
        .onConflictDoUpdate({
          target: users.google_id,
          set: {
            email: googleUser.email,
            name: googleUser.name || '',
            given_name: googleUser.given_name || null,
            family_name: googleUser.family_name || null,
            picture: googleUser.picture || null,
            locale: googleUser.locale || null,
            verified_email: googleUser.verified_email ?? false,
            access_token: token.token || '',
            refresh_token: null, // Google OAuth doesn't provide refresh tokens in this flow
            expires_at: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
            updated_at: new Date(),
          },
        })
        .returning();

      // Set session cookie
      if (dbUser) {
        setCookie(c, 'user-id', dbUser.id.toString(), {
          httpOnly: true,
          secure: isProd,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 1 week
          path: '/',
        });
      } else {
        throw new HTTPException(500, { message: 'Failed to create or update user' });
      }
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      console.error('Database operation failed during OAuth callback', error);
      throw new HTTPException(500, { message: 'Authentication failed: database error' });
    }
    return c.redirect('/');
  }
);

// Logout route
// Uses: AuthRouteResponses['logout']
authApp.get('/logout', (c) => {
  // Validate required environment variables
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new HTTPException(500, { message: 'Server is not configured for authentication' });
  }
  setCookie(c, 'user-id', '', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return c.redirect('/');
});

// Get current user info
// Uses: AuthRouteResponses['me']
authApp.get('/me', async (c) => {
  const userId = getCookie(c, 'user-id');
  if (!userId) {
    const response: ErrorResponse = { error: 'Not authenticated' };
    return c.json(response, 401);
  }
  try {
    const [user] = await c.var.db.select().from(users).where(eq(users.id, parseInt(userId)));
    if (!user) {
      const response: ErrorResponse = { error: 'User not found' };
      return c.json(response, 404);
    }
    const response: AuthRouteResponses['me']['response'] = {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture ?? undefined,
    };
    return c.json(response, 200);
  } catch (error) {
    console.error('Error fetching user data', error);
    const response: ErrorResponse = { error: 'Internal server error' };
    return c.json(response, 500);
  }
});

// Authentication middleware
export const authMiddleware = async (c: Context<Env>, next: () => Promise<void>) => {
  const userId = getCookie(c, 'user-id');
  if (!userId) {
    throw new HTTPException(401, { message: 'Not authenticated' });
  }
  try {
    const [user] = await c.var.db.select().from(users).where(eq(users.id, parseInt(userId)));
    if (!user) {
      throw new HTTPException(401, { message: 'Not authenticated' });
    }
    c.set('user', user);
    await next();
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Authentication middleware error', error);
    throw new HTTPException(500, { message: 'Authentication error' });
  }
};

// Authentication middleware that always returns JSON responses
export const authJSONMiddleware = async (c: Context<Env>, next: () => Promise<void>) => {
  const userId = getCookie(c, 'user-id');
  if (!userId) {
    const response: ErrorResponse = { error: 'Not authenticated' };
    return c.json(response, 401);
  }
  try {
    const [user] = await c.var.db.select().from(users).where(eq(users.id, parseInt(userId)));
    if (!user) {
      const response: ErrorResponse = { error: 'Not authenticated' };
      return c.json(response, 401);
    }
    c.set('user', user);
    await next();
    return undefined; // Explicitly return undefined for successful cases
  } catch (error) {
    console.error('Authentication middleware error', error);
    const response: ErrorResponse = { error: 'Authentication error' };
    return c.json(response, 500);
  }
};

// Update user profile
// Uses zValidator for request validation
authApp.patch('/me',
  authJSONMiddleware,
  zValidator('json', UserProfileUpdateSchema),
  async (c) => {
    const updates = c.req.valid('json');
    const user = c.get('user');

    try {
      // Update user in database
      const [updatedUser] = await c.var.db
        .update(users)
        .set({
          ...updates,
          updated_at: new Date(),
        })
        .where(eq(users.id, user.id))
        .returning();

      if (!updatedUser) {
        const response: ErrorResponse = { error: 'Failed to update user' };
        return c.json(response, 500);
      }

      // Return updated user data
      const response = UserResponseSchema.parse({
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        picture: updatedUser.picture,
      });

      return c.json(response, 200);
    } catch (error) {
      console.error('Error updating user data', error);
      const response: ErrorResponse = { error: 'Internal server error' };
      return c.json(response, 500);
    }
  }
);
