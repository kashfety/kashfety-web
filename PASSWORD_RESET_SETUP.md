# Password Reset Setup Guide

## Overview
This guide explains how to set up the password reset flow using Supabase's built-in email service with custom templates.

## Step 1: Configure the Email Template in Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to: **Authentication → Email Templates → Reset Password**
3. Replace the existing template with the following HTML:

```html
<h2>Reset Your Password</h2>

<p>Hi there,</p>

<p>We received a request to reset your password for your Kashfety account.</p>

<p>Click the button below to reset your password:</p>

<p><a href="{{ .SiteURL }}/update-password?token_hash={{ .TokenHash }}&type=recovery" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Reset Password</a></p>

<p>Or copy and paste this link into your browser:</p>
<p>{{ .SiteURL }}/update-password?token_hash={{ .TokenHash }}&type=recovery</p>

<p>This link will expire in 1 hour for security reasons.</p>

<p>If you didn't request this password reset, you can safely ignore this email.</p>

<p>Best regards,<br>
The Kashfety Team</p>

<hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">

<p style="font-size: 12px; color: #6b7280;">If you're having trouble clicking the button, copy and paste the URL above into your web browser.</p>
```

4. Save the template

## Step 2: Verify Site URL Configuration

In your Supabase Dashboard:

1. Go to **Authentication → URL Configuration**
2. Verify that your **Site URL** is set correctly:
   - For development: `http://localhost:3000`
   - For production: Your actual domain (e.g., `https://kashfety.com`)

## Step 3: Verify Redirect URLs

Make sure these URLs are in your **Redirect URLs** list (shown in your screenshot):
- `https://kashfety-develop.vercel.app/update-password`
- `https://kashfety.com/update-password`
- `https://kashfety-web-git-main-kashfetys-projects.vercel.app/update-password`
- `http://localhost:3000/update-password` (for local development)

## How It Works

### 1. User Requests Password Reset
- User enters their email on `/forgot-password` page
- Frontend calls `/api/auth/forgot-password`
- API generates a secure reset token and stores it in the database
- API calls `supabase.auth.resetPasswordForEmail()` with the redirect URL

### 2. Supabase Sends Email
- Supabase sends an email using your custom template
- The email contains a link with `token_hash` and `type=recovery` parameters
- Example: `https://kashfety.com/update-password?token_hash=abc123...&type=recovery`

### 3. User Clicks Reset Link
- User is redirected to `/update-password` page
- Page extracts `token_hash` and `type` from URL parameters
- Page displays password reset form

### 4. User Submits New Password
- User enters new password
- Frontend calls `/api/auth/reset-password` with `tokenHash` and `newPassword`
- API verifies the token using `supabase.auth.verifyOtp()`
- API updates the password in both Supabase Auth and custom users table
- User is redirected to login page

## Important Template Variables

From Supabase documentation, you can use these variables in your email template:

- `{{ .SiteURL }}` - Your configured Site URL
- `{{ .TokenHash }}` - The hashed token for password reset
- `{{ .ConfirmationURL }}` - Full confirmation URL (alternative to building custom URL)
- `{{ .Email }}` - User's email address
- `{{ .RedirectTo }}` - The redirect URL passed in the API call

## Security Features

1. **Email Enumeration Prevention**: The API always returns success, even if the email doesn't exist
2. **Token Expiration**: Reset tokens expire after 1 hour
3. **Secure Hashing**: Passwords are hashed using bcrypt with 12 salt rounds
4. **Token Verification**: Supabase verifies the token before allowing password updates
5. **One-Time Use**: Tokens are cleared after successful password reset

## Testing

### Local Development
1. Start your development server: `npm run dev`
2. Go to `http://localhost:3000/forgot-password`
3. Enter your email address
4. Check the Supabase Dashboard → Authentication → Users → Email logs
5. Click the reset link in the email
6. Enter your new password

### Production
Same flow as local development, but use your production domain

## Troubleshooting

### Email Not Received
- Check Supabase Dashboard → Authentication → Email logs
- Verify email isn't in spam folder
- Check that SMTP is configured correctly (if using custom SMTP)

### Invalid Token Error
- Token may have expired (1 hour limit)
- Token may have already been used
- Verify the URL parameters are correct

### Redirect URL Error
- Ensure the redirect URL is in your allowed list
- Check that the Site URL is configured correctly

## Code Changes Summary

The following files were updated:

1. **`/api/auth/forgot-password/route.ts`**
   - Now uses Supabase's `resetPasswordForEmail()` method
   - Passes redirect URL to Supabase
   - Simplified to rely on Supabase's email service

2. **`/app/update-password/page.tsx`**
   - Updated to extract `token_hash` and `type` from URL
   - Passes token hash to reset API instead of email

3. **`/api/auth/reset-password/route.ts`**
   - Now uses `supabase.auth.verifyOtp()` to verify token
   - Updates password in both Supabase Auth and custom users table
   - Clears reset token after successful update

## Next Steps

1. ✅ Set up the email template in Supabase Dashboard (see Step 1)
2. ✅ Verify Site URL configuration
3. ✅ Verify Redirect URLs are configured
4. ✅ Test the flow in development
5. ✅ Test the flow in production
6. Optional: Set up custom SMTP for production use (higher rate limits)

## Environment Variables Required

Make sure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_API_URL=http://localhost:3000  # or your production URL
```

For Vercel deployment, set these in your Vercel project settings.
