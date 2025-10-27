import { supabase } from '@/lib/supabase';

export interface CenterValidationResult {
  exists: boolean;
  center?: any;
  error?: string;
}

/**
 * Validates that a center exists in the database
 * @param centerId - The ID of the center to validate
 * @returns Promise<CenterValidationResult>
 */
export async function validateCenterExists(centerId: string): Promise<CenterValidationResult> {
  try {
    if (!centerId) {
      return {
        exists: false,
        error: 'Center ID is required'
      };
    }

    // Check if center exists in centers table
    const { data: center, error } = await supabase
      .from('centers')
      .select('*')
      .eq('id', centerId)
      .single();

    if (error) {
      console.error('Center validation error:', error);
      
      // If center not found, provide helpful error message
      if (error.code === 'PGRST116') {
        return {
          exists: false,
          error: `Center with ID ${centerId} does not exist. Please ensure the center is properly registered.`
        };
      }
      
      return {
        exists: false,
        error: `Failed to validate center: ${error.message}`
      };
    }

    return {
      exists: true,
      center
    };

  } catch (error) {
    console.error('Center validation exception:', error);
    return {
      exists: false,
      error: `Center validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Gets or creates a center record for a center user
 * This handles cases where a center user exists but no corresponding center record
 * @param userId - The user ID of the center
 * @param userInfo - Basic user information to create center if needed
 * @returns Promise<CenterValidationResult>
 */
export async function ensureCenterExists(
  userId: string,
  userInfo: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
  }
): Promise<CenterValidationResult> {
  try {
    // First check if user already has a center_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('center_id, name, phone, email')
      .eq('id', userId)
      .eq('role', 'center')
      .single();

    if (userError) {
      return {
        exists: false,
        error: `Failed to fetch user: ${userError.message}`
      };
    }

    // If user has center_id, validate that center exists
    if (user.center_id) {
      const validation = await validateCenterExists(user.center_id);
      if (validation.exists) {
        return validation;
      }
      
      // Center ID exists but center record is missing - this is a data integrity issue
      console.warn(`User ${userId} has center_id ${user.center_id} but center record is missing`);
    }

    // Create center record if it doesn't exist
    const centerData = {
      name: userInfo.name || user.name,
      address: userInfo.address || 'Address not provided',
      phone: userInfo.phone || user.phone,
      email: userInfo.email || user.email || '',
      center_type: 'generic',
      offers_labs: false,
      offers_imaging: false,
      approval_status: 'approved'
    };

    const { data: newCenter, error: centerError } = await supabase
      .from('centers')
      .insert(centerData)
      .select()
      .single();

    if (centerError) {
      return {
        exists: false,
        error: `Failed to create center record: ${centerError.message}`
      };
    }

    // Update user record with center_id
    const { error: updateError } = await supabase
      .from('users')
      .update({ center_id: newCenter.id })
      .eq('id', userId);

    if (updateError) {
      console.warn(`Failed to update user ${userId} with center_id ${newCenter.id}:`, updateError);
      // Don't fail the operation, just log the warning
    }

    console.log(`✅ Created center record ${newCenter.id} for user ${userId}`);

    return {
      exists: true,
      center: newCenter
    };

  } catch (error) {
    console.error('Ensure center exists exception:', error);
    return {
      exists: false,
      error: `Failed to ensure center exists: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
