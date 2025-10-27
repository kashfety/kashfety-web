import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

// Load environment variables
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getAdminToken() {
    try {
        console.log('🔍 Looking for admin users...');
        
        // Get admin users
        const { data: adminUsers, error } = await supabase
            .from('users')
            .select('id, phone, first_name, last_name, role')
            .eq('role', 'admin');
            
        if (error) {
            console.error('❌ Error fetching admin users:', error);
            return;
        }
        
        console.log('👑 Admin users found:', adminUsers?.length || 0);
        
        if (adminUsers && adminUsers.length > 0) {
            const admin = adminUsers[0];
            console.log(`📱 Using admin: ${admin.first_name} ${admin.last_name} (${admin.phone})`);
            
            // Create a JWT token
            const token = jwt.sign(
                {
                    userId: admin.id,
                    phone: admin.phone,
                    role: admin.role
                },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '1h' }
            );
            
            console.log('🔑 Generated admin token:', token);
            return token;
        } else {
            console.log('❌ No admin users found. Creating a test admin...');
            
            // Create a test admin
            const { data: newAdmin, error: createError } = await supabase
                .from('users')
                .insert({
                    phone: '+1234567890',
                    name: 'Test Admin',
                    first_name: 'Test',
                    last_name: 'Admin',
                    role: 'admin',
                    uid: 'test-admin-uid'
                })
                .select()
                .single();
                
            if (createError) {
                console.error('❌ Error creating admin:', createError);
                return;
            }
            
            console.log('✅ Created test admin:', newAdmin);
            
            const token = jwt.sign(
                {
                    userId: newAdmin.id,
                    phone: newAdmin.phone,
                    role: newAdmin.role
                },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '1h' }
            );
            
            console.log('🔑 Generated token for new admin:', token);
            return token;
        }
        
    } catch (error) {
        console.error('💥 Unexpected error:', error);
    }
}

getAdminToken();