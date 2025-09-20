// Packages
import { z } from 'zod';

export interface ErrorResponse {
  error: string;
  details?: string;
}

// Schema for authentication error responses
export const ErrorSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
});
