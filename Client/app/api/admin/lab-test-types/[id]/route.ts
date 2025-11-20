import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// DELETE - Delete a lab test type
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Lab test type ID is required', success: false },
        { status: 400 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Delete the lab test type
    const { error } = await supabase
      .from('lab_test_types')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting lab test type:', error);
      throw new Error(error.message || 'Failed to delete lab test type');
    }

    console.log('✅ [Lab Test Types] Deleted successfully:', id);

    return NextResponse.json({
      message: 'Lab test type deleted successfully',
      success: true
    });

  } catch (error: any) {
    console.error('❌ [Lab Test Types] DELETE error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        success: false
      },
      { status: 500 }
    );
  }
}
