/**
 * Shared authentication utilities for Next.js API routes
 * Uses JWT authentication matching the Express middleware standard (middleware/auth.js)
 */

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

export interface AuthenticatedUser {
  id: string;
  uid?: string;
  email?: string;
  phone?: string;
  name?: string;
  role: string;
  first_name?: string;
  last_name?: string;
  center_id?: string | null;
  iat?: number;
  exp?: number;
  iss?: string;
}

/**
 * Verify JWT token and extract user information
 * Matches the behavior of Client/Server/middleware/auth.js
 */
export function verifyToken(token: string): AuthenticatedUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'doctor-appointment-system'
    }) as AuthenticatedUser;
    return decoded;
  } catch (error) {
    // Try without issuer check for backward compatibility
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
      return decoded;
    } catch (fallbackError) {
      return null;
    }
  }
}

/**
 * Extract and verify authentication token from request
 * Returns the authenticated user or null
 */
export function getAuthenticatedUser(request: NextRequest): AuthenticatedUser | null {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  return verifyToken(token);
}

/**
 * Middleware function to require authentication
 * Returns the authenticated user or a 401 response
 */
export function requireAuth(
  request: NextRequest
): { user: AuthenticatedUser } | NextResponse {
  const user = getAuthenticatedUser(request);
  
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized - No valid token provided' },
      { status: 401 }
    );
  }
  
  return { user };
}

/**
 * Middleware function to require specific roles
 * Returns the authenticated user or an error response
 */
export function requireRole(
  request: NextRequest,
  allowedRoles: string[]
): { user: AuthenticatedUser } | NextResponse {
  const authResult = requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult; // Already an error response
  }
  
  const { user } = authResult;
  
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json(
      { error: 'Forbidden - Insufficient permissions' },
      { status: 403 }
    );
  }
  
  return { user };
}

/**
 * Check if user has admin or super_admin role
 */
export function requireAdmin(
  request: NextRequest
): { user: AuthenticatedUser } | NextResponse {
  return requireRole(request, ['admin', 'super_admin']);
}

/**
 * Check if user has doctor role
 */
export function requireDoctor(
  request: NextRequest
): { user: AuthenticatedUser } | NextResponse {
  return requireRole(request, ['doctor']);
}

/**
 * Check if user has center role
 */
export function requireCenter(
  request: NextRequest
): { user: AuthenticatedUser } | NextResponse {
  return requireRole(request, ['center']);
}

/**
 * Check if user has patient role
 */
export function requirePatient(
  request: NextRequest
): { user: AuthenticatedUser } | NextResponse {
  return requireRole(request, ['patient']);
}

