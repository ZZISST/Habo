// Re-export all financial types
export * from './finance';

// Auth types - extends base User from finance.ts
export interface UserProfile {
  id: number;
  user_id: number;
  date_of_birth?: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface UserLogin {
  username: string;
  password: string;
}

export interface UserCreate {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

// Common API types
export interface ApiError {
  detail: string;
}
