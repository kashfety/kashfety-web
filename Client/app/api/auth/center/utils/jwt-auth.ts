import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export interface AuthUser {
  id: string;
  role: string;
  center_id: string | null;
  name?: string;
  phone?: string;
  email?: string;
}

// Helper function to get user from auth header
export async function getUserFromAuth(request: NextRequest, includeProfile: boolean = false): Promise<AuthUser | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  // Use server-side Supabase client with service role key
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  try {
    // Try to decode JWT token payload (without verification for now)
    let decoded;
    try {
      // Split JWT token and decode payload
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = parts[1];
        const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString());
        decoded = decodedPayload;
      } else {
        throw new Error('Invalid JWT format');
      }
    } catch (jwtError) {
      // Fallback: check if it's a mock token format for development
      const userIdMatch = token.match(/mock-token-(.+)$/);
      if (userIdMatch) {
        const userId = userIdMatch[1];
        
        // Look up the user to get their center_id
        const { data: user, error } = await supabase
          .from('users')
          .select('id, role, center_id, name, phone, email')
          .eq('id', userId)
          .eq('role', 'center')
          .single();

        if (error || !user) {
          return null;
        }
        
        return {
          id: user.id,
          role: user.role,
          center_id: user.center_id,
          name: user.name,
          phone: user.phone,
          email: user.email
        };
      }
      
      return null;
    }
    
    if (!decoded.id) {
      return null;
    }

    // Look up the user to get their current data
    const { data: user, error } = await supabase
      .from('users')
      .select('id, role, center_id, name, phone, email')
      .eq('id', decoded.id)
      .eq('role', 'center')
      .single();

    if (error || !user) {
      return null;
    }
    
    return {
      id: user.id,
      role: user.role,
      center_id: user.center_id,
      name: user.name,
      phone: user.phone,
      email: user.email
    };
  } catch (error) {
    return null;
  }
}
