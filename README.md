# 🏥 Doctor Appointment System - Supabase Migration

## 📋 Project Overview

A full-stack doctor appointment booking system that has been successfully migrated from Firebase to Supabase. This application provides a comprehensive platform for patients to book appointments with doctors and for healthcare professionals to manage their practice.

## 🚀 Migration Accomplished

### ✅ **Complete Firebase to Supabase Migration**
- **Database**: Migrated from Firestore to PostgreSQL
- **Authentication**: Migrated from Firebase Auth to Supabase Auth  
- **Storage**: Migrated from Firebase Storage to Supabase Storage
- **Real-time Features**: Leveraging Supabase real-time capabilities

## 🛠️ Tech Stack

### **Frontend**
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/ui** - Modern UI components
- **Supabase Client** - Frontend database and auth client

### **Backend**
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - Relational database
- **JWT** - Token-based authentication
- **Multer** - File upload handling

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Supabase      │
│   (Next.js)     │◄───┤   (Express.js)  │◄───┤   (PostgreSQL)  │
│   Port: 3000    │    │   Port: 5000    │    │   Cloud Hosted  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📊 Database Schema

### **Core Tables**
- `users` - User authentication and profile data
- `doctors` - Doctor profiles, specialties, and schedules
- `patients` - Patient information and medical history
- `appointments` - Appointment bookings and status
- `medical_records` - Patient medical records and documents
- `centers` - Medical centers and facilities
- `audit_logs` - System activity and security logs

### **Key Features**
- **Row Level Security (RLS)** - Secure data access control
- **Real-time Subscriptions** - Live data updates
- **File Storage** - Profile pictures, medical documents
- **Full-text Search** - Advanced search capabilities

## 🔧 Setup Instructions

### **Prerequisites**
- Node.js (v18 or higher)
- npm or pnpm
- Supabase account

### **1. Clone Repository**
```bash
git clone <your-repo-url>
cd doctorapp
```

### **2. Supabase Setup**
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings → API to get your credentials
3. Run the SQL scripts in Supabase SQL Editor (found in `/Server/sql/`)

### **3. Environment Configuration**

#### **Server Environment** (`/Server/.env`)
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
CLIENT_URL=http://localhost:3000
PORT=5000
```

#### **Client Environment** (`/Client/.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### **4. Install Dependencies**

#### **Backend Setup**
```bash
cd Server
npm install
```

#### **Frontend Setup**
```bash
cd Client
npm install
```

### **5. Start Development Servers**

#### **Start Backend** (Terminal 1)
```bash
cd Server
npm run dev
```
Server runs on: `http://localhost:5000`

#### **Start Frontend** (Terminal 2)
```bash
cd Client
npm run dev
```
Client runs on: `http://localhost:3000`

## 🧪 Testing the Migration

### **Test Database Connection**
```bash
cd Server
node test-supabase-connection.js
```

Expected output:
```
✅ Basic connection successful
✅ Admin connection successful
✅ Table 'users' exists
✅ Table 'doctors' exists
✅ Table 'patients' exists
✅ Table 'appointments' exists
✅ Storage bucket 'profile-pictures' exists
✅ Storage bucket 'medical-documents' exists
✅ Storage bucket 'attachments' exists
```

### **Test API Endpoints**
```bash
# Test server status
curl http://localhost:5000/

# Test doctors endpoint
curl http://localhost:5000/api/doctors/all
```

## 📱 Features

### **For Patients**
- 👤 User registration and authentication
- 🔍 Search and browse doctors by specialty
- 📅 Book appointments with available doctors
- 🏠 Request home visits
- 🧪 Book lab tests
- 💊 Pharmacy services
- 📋 View appointment history

### **For Doctors**
- 👨‍⚕️ Professional profile management
- 📊 Dashboard with analytics
- 📅 Schedule and availability management
- 👥 Patient management
- 📝 Medical records creation
- 📈 Appointment statistics
- 🏥 Multi-center support

### **For Administrators**
- 👑 Admin dashboard
- 👥 User management
- 🏥 Medical center management
- 📊 System analytics
- 🔍 Audit logs
- ⚙️ System configuration

## 🔐 Security Features

- **Row Level Security (RLS)** - Database-level access control
- **JWT Authentication** - Secure token-based auth
- **Role-based Access Control** - User, Doctor, Admin roles
- **Data Encryption** - Encrypted sensitive data
- **Audit Logging** - Complete activity tracking
- **CORS Protection** - Cross-origin request security

## 🚀 API Endpoints

### **Authentication**
- `POST /api/users/signup` - User registration
- `POST /api/users/login` - User login
- `POST /api/users/reset-password` - Password reset

### **User Management**
- `GET /api/users/profile/:id` - Get user profile
- `PUT /api/users/profile/:id` - Update user profile
- `GET /api/users/all` - Get all users (Admin only)

### **Doctor Management**
- `GET /api/doctors/all` - Get all doctors
- `GET /api/doctors/:id/profile` - Get doctor profile
- `PUT /api/doctors/:id/profile` - Update doctor profile
- `POST /api/doctors/:id/schedule` - Set doctor schedule
- `POST /api/doctors/:id/vacation` - Set vacation days

## 🧪 Labs & Imaging Module (New)

- Run SQL: execute `add-labs-module.sql` in your database to create all required tables/columns
- New tables: `lab_test_types`, `center_lab_services`, `center_lab_schedules`, `lab_bookings`
- Extended tables: `centers` (+ `offers_labs`, `offers_imaging`), `users` (+ role `center`, `center_id`), `billing` (+ `lab_booking_id`)
- Backend endpoints (JWT under `/api/auth`):
  - Catalog: `GET /lab-tests/types`
  - Centers: `GET /lab-tests/centers?lab_test_type_id=&category=lab|imaging`
  - Center services: `GET /lab-tests/centers/:centerId/services`
  - Availability: `GET /lab-tests/centers/:centerId/types/:typeId/available-dates`, `GET /lab-tests/centers/:centerId/types/:typeId/available-slots?date=YYYY-MM-DD`
  - Bookings (patient): `POST /lab-tests/book`, `GET /lab-tests/bookings/:patientId`, `PUT /lab-tests/bookings/:id/reschedule`, `PUT /lab-tests/bookings/:id/cancel`
  - Results (center): `PUT /lab-tests/bookings/:id/result`
  - Center portal: `GET/PUT /center/profile`, `GET /lab-tests/center/today`, `GET/PUT /center/lab-services`, `GET/PUT /center/lab-schedule`
- Frontend integrations:
  - Patient booking: `Client/app/patient-dashboard/lab-tests/page.tsx`
  - My labs page: `Client/app/labs/page.tsx`
  - Client APIs: `labService`, `centerService` in `Client/lib/api.ts`
- Center logins: create `users` with `role='center'` and `center_id=<center UUID>`; admin provides phone/password. On login, redirect to a center dashboard route.

### Production reset + reseed (preserve admins)

- This repository now includes a script that:
  - Preserves only `admin` and `super_admin` users
  - Clears operational data (`centers`, lab tables, bookings, appointments, schedules, etc.)
  - Seeds fresh role-aware data in `users` plus related center/lab records
- Run precheck first:

```bash
npm run db:precheck
```

- Execute destructive cleanup + reseed:

```bash
npm run db:reset-seed
```

- Execute full operational reseed (centers/doctors/patients) with Supabase Auth + `public.users` sync:

```bash
npm run db:reset-seed:full
```

- Run interactive segmented seeding (choose wipe/no-wipe, user groups, counts, and related data):

```bash
npm run db:interactive-seed
```

- Run safe non-interactive preset (no wipe, seeds admin + super_admin, idempotent catalogs):

```bash
npm run db:interactive-seed:safe
```

- Interactive flow auto-detects optional role tables (`admin_users`, `doctors`, `patients`) and seeds links only when those tables exist.
- During wipe mode, you are prompted whether to also delete non-admin/non-super_admin users from `auth.users`.

- If older seeded users in production cannot log in because their Supabase Auth email is still unconfirmed, run:

```bash
npm run auth:confirm-seeded:dry
```

- Apply the auth confirmation backfill:

```bash
npm run auth:confirm-seeded
```

- The backfill script confirms matching `auth.users`, syncs `public.users.uid` where needed, and can optionally reset passwords.
- Signup OTP verification remains the flow for new registrations (`signInWithOtp` + `verifyOtp`), while seeded account operability is handled by this admin backfill.
- For custom-domain OTP sender setup (SMTP, DNS, templates), see `SUPABASE_CUSTOM_EMAIL_OTP_SETUP.md`.

- Script path: `Client/Server/scripts/reset-and-seed.mjs`

## 📁 Project Structure

```
doctorapp/
├── Client/                     # Next.js Frontend
│   ├── app/                   # App Router pages
│   ├── components/            # Reusable components
│   ├── lib/                   # Utilities and hooks
│   └── public/                # Static assets
├── Server/                    # Express.js Backend
│   ├── controllers/           # Route controllers
│   ├── middleware/            # Custom middleware
│   ├── routes/               # API routes
│   ├── utils/                # Utilities and helpers
│   └── sql/                  # Database scripts
└── documentation/            # Project documentation
```

## 🔄 Migration Details

### **What Was Migrated**
1. **Database Operations**: All Firestore operations → PostgreSQL queries
2. **Authentication**: Firebase Auth → Supabase Auth
3. **File Storage**: Firebase Storage → Supabase Storage
4. **Real-time Updates**: Firestore listeners → Supabase subscriptions
5. **Security Rules**: Firestore rules → PostgreSQL RLS policies

### **Migration Benefits**
- 🚀 **Better Performance**: PostgreSQL is faster for complex queries
- 💰 **Cost Effective**: Supabase offers better pricing
- 🔧 **More Control**: Direct SQL access and customization
- 🔐 **Enhanced Security**: Row Level Security policies
- 📊 **Better Analytics**: Built-in dashboard and monitoring

## 🚀 Deployment

### **Backend Deployment**
```bash
# Build for production
npm run build

# Start production server
npm start
```

### **Frontend Deployment**
```bash
# Build for production
npm run build

# Start production server
npm start
```

## 📝 Environment Variables Reference

### **Required Variables**
| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Your Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGci...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJhbGci...` |
| `CLIENT_URL` | Frontend URL | `http://localhost:3000` |
| `PORT` | Backend port | `5000` |

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Supabase team for the excellent documentation
- Next.js team for the amazing framework
- Shadcn for the beautiful UI components

## 📞 Support

For support and questions:
- Create an issue in this repository
- Contact the development team

---

**🎉 Migration Status: COMPLETE ✅**

The Doctor Appointment System has been successfully migrated from Firebase to Supabase with all features working correctly! 