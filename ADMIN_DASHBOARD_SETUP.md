# Admin Dashboard Setup Guide

This guide will help you set up the comprehensive admin dashboard for your Vezeeta clone application.

## 🎯 Features Overview

The admin dashboard includes:

- **Analytics Dashboard**: Real-time statistics and metrics
- **User Management**: View, edit, and manage all users
- **Center Management**: Create and manage medical centers
- **Certificate Approval**: Review and approve doctor certificates
- **Comprehensive Analytics**: Patient demographics, appointment trends, revenue tracking

## 📋 Prerequisites

1. Node.js and npm installed
2. Supabase project set up
3. Backend server running
4. Frontend application running

## 🚀 Setup Instructions

### Step 1: Database Schema Updates

First, you need to update your database schema to support admin functionality:

1. **Run the schema update script:**
   ```bash
   cd Server
   node run-admin-schema-updates.js
   ```

2. **Manual SQL Execution (if needed):**
   If the script indicates that manual execution is required, run these SQL statements in your Supabase SQL editor:

   ```sql
   -- Add certificate management fields to users table
   ALTER TABLE public.users 
   ADD COLUMN IF NOT EXISTS certificate_status TEXT DEFAULT 'pending' CHECK (certificate_status IN ('pending', 'approved', 'rejected', 'resubmission_required')),
   ADD COLUMN IF NOT EXISTS certificate_approved_at TIMESTAMP WITH TIME ZONE,
   ADD COLUMN IF NOT EXISTS certificate_rejected_at TIMESTAMP WITH TIME ZONE,
   ADD COLUMN IF NOT EXISTS certificate_rejection_reason TEXT,
   ADD COLUMN IF NOT EXISTS certificate_comments TEXT,
   ADD COLUMN IF NOT EXISTS certificate_resubmission_requirements TEXT,
   ADD COLUMN IF NOT EXISTS certificate_resubmission_deadline DATE,
   ADD COLUMN IF NOT EXISTS certificate_resubmission_requested_at TIMESTAMP WITH TIME ZONE;

   -- Add admin-specific fields to users table
   ALTER TABLE public.users 
   ADD COLUMN IF NOT EXISTS admin_notes TEXT,
   ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'banned', 'pending_verification')),
   ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
   ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0,
   ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

   -- Add admin fields to centers table
   ALTER TABLE public.centers 
   ADD COLUMN IF NOT EXISTS admin_notes TEXT,
   ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

   -- Create audit logs table for admin actions
   CREATE TABLE IF NOT EXISTS public.audit_logs (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     admin_id UUID REFERENCES public.users(id),
     action TEXT NOT NULL,
     table_name TEXT NOT NULL,
     record_id UUID,
     old_values JSONB,
     new_values JSONB,
     ip_address INET,
     user_agent TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Create indexes for better performance
   CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
   CREATE INDEX IF NOT EXISTS idx_users_certificate_status ON public.users(certificate_status);
   CREATE INDEX IF NOT EXISTS idx_users_account_status ON public.users(account_status);
   CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON public.audit_logs(admin_id);
   CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
   ```

### Step 2: Create Admin User

Create an admin user account:

```bash
cd Server
node scripts/create-admin-user.mjs
```

This will create an admin user with these credentials:
- **Email**: admin@vezeeta-clone.com
- **Password**: Admin123!
- **Role**: admin

### Step 3: Start the Backend Server

Make sure your backend server is running:

```bash
cd Server
npm start
```

### Step 4: Start the Frontend Application

Start your frontend application:

```bash
cd Client
npm run dev
```

### Step 5: Access the Admin Dashboard

1. Navigate to your application
2. Login with the admin credentials:
   - Email: admin@vezeeta-clone.com
   - Password: Admin123!
3. You should be redirected to the admin dashboard at `/admin-dashboard`

## 🔧 Configuration

### Environment Variables

Make sure these environment variables are set in your `.env` files:

**Backend (.env):**
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## 📊 Admin Dashboard Features

### 1. Analytics Dashboard
- **Overview Statistics**: Total users, patients, doctors, centers
- **Appointment Analytics**: Appointment trends, types, revenue
- **User Demographics**: Age distribution, gender breakdown
- **Performance Metrics**: System usage, response times

### 2. User Management
- **User List**: View all users with search and filtering
- **User Details**: Comprehensive user information
- **Role Management**: Change user roles (admin, doctor, patient)
- **Account Status**: Suspend, ban, or activate accounts
- **User Statistics**: Login history, activity tracking

### 3. Center Management
- **Center Creation**: Add new medical centers
- **Center Details**: View center information and statistics
- **Center Status**: Activate/deactivate centers
- **Center Analytics**: Doctor count, appointment volume

### 4. Certificate Approval
- **Certificate Review**: View submitted certificates
- **Approval Process**: Approve, reject, or request resubmission
- **Comments System**: Add feedback for doctors
- **Deadline Management**: Set resubmission deadlines

## 🔒 Security Features

- **Role-based Access Control**: Only admin users can access the dashboard
- **Audit Logging**: All admin actions are logged
- **Input Validation**: Comprehensive validation on all forms
- **CSRF Protection**: Built-in protection against CSRF attacks

## 🐛 Troubleshooting

### Common Issues

1. **"User not found in database" error**
   - Make sure the admin user was created successfully
   - Check that the user exists in both Supabase Auth and the users table

2. **"Access denied" errors**
   - Verify the user has the 'admin' role
   - Check that the authentication middleware is working correctly

3. **Database connection issues**
   - Verify your Supabase credentials
   - Check that the database schema updates were applied

4. **Frontend not loading admin dashboard**
   - Check browser console for errors
   - Verify the API endpoints are accessible
   - Ensure the user is properly authenticated

### Debug Steps

1. **Check Authentication:**
   ```bash
   # Test admin login
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@vezeeta-clone.com","password":"Admin123!"}'
   ```

2. **Test Admin Endpoints:**
   ```bash
   # Test dashboard stats (requires auth token)
   curl -X GET http://localhost:5000/api/admin/dashboard/stats \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. **Check Database:**
   ```sql
   -- Verify admin user exists
   SELECT * FROM users WHERE role = 'admin';
   
   -- Check certificate fields
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'users' 
   AND column_name LIKE 'certificate%';
   ```

## 📈 Monitoring and Analytics

The admin dashboard provides comprehensive monitoring:

- **Real-time Statistics**: Live updates of system metrics
- **Trend Analysis**: Historical data and growth patterns
- **Performance Monitoring**: System health and response times
- **User Activity**: Login patterns and usage statistics

## 🔄 Updates and Maintenance

### Regular Maintenance Tasks

1. **Review Audit Logs**: Monitor admin actions for security
2. **Update User Roles**: Manage user permissions as needed
3. **Certificate Reviews**: Process pending certificate submissions
4. **System Analytics**: Review performance metrics

### Backup and Recovery

- **Database Backups**: Regular backups of your Supabase database
- **Configuration Backups**: Backup environment variables and configuration
- **User Data**: Ensure user data is properly backed up

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the browser console and server logs
3. Verify all setup steps were completed correctly
4. Test with a fresh admin user account

## 🎉 Success!

Once setup is complete, you'll have a fully functional admin dashboard with:

- ✅ Comprehensive analytics and reporting
- ✅ User and center management
- ✅ Certificate approval workflow
- ✅ Security and audit logging
- ✅ Modern, responsive UI

The admin dashboard will help you effectively manage your Vezeeta clone application and provide insights into system usage and performance.
