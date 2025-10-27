import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkCenters() {
    try {
        console.log('🔍 Checking centers in database...');
        
        // Get all centers
        const { data: allCenters, error: allError } = await supabase
            .from('centers')
            .select('id, name, approval_status, owner_doctor_id, created_at')
            .order('created_at', { ascending: false });
            
        if (allError) {
            console.error('❌ Error fetching centers:', allError);
            return;
        }
        
        console.log('📊 Total centers in database:', allCenters?.length || 0);
        
        if (allCenters && allCenters.length > 0) {
            console.log('\n🏢 All centers:');
            allCenters.forEach((center, index) => {
                console.log(`${index + 1}. ${center.name} - Status: ${center.approval_status} - Created: ${center.created_at}`);
            });
            
            // Count by status
            const statusCounts = allCenters.reduce((acc, center) => {
                acc[center.approval_status] = (acc[center.approval_status] || 0) + 1;
                return acc;
            }, {});
            
            console.log('\n📈 Centers by status:');
            Object.entries(statusCounts).forEach(([status, count]) => {
                console.log(`  ${status}: ${count}`);
            });
        } else {
            console.log('📭 No centers found in database');
        }
        
        // Check pending specifically
        const { data: pendingCenters, error: pendingError } = await supabase
            .from('centers')
            .select('*')
            .eq('approval_status', 'pending');
            
        if (pendingError) {
            console.error('❌ Error fetching pending centers:', pendingError);
        } else {
            console.log('\n⏳ Pending centers:', pendingCenters?.length || 0);
            if (pendingCenters && pendingCenters.length > 0) {
                pendingCenters.forEach(center => {
                    console.log(`  - ${center.name} (ID: ${center.id})`);
                });
            }
        }
        
    } catch (error) {
        console.error('💥 Unexpected error:', error);
    }
}

checkCenters();