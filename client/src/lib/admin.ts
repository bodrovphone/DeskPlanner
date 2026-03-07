import type { User } from '@supabase/supabase-js';

export function isAdmin(user: User | null | undefined): boolean {
  return user?.app_metadata?.is_super_admin === true;
}
