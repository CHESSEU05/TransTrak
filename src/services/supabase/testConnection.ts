import { supabase } from './client';

export async function testSupabaseConnection() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.log('Supabase connection error:', error.message);
    return false;
  }

  console.log('Supabase connected successfully:', data.session ? 'session found' : 'no active session');
  return true;
}