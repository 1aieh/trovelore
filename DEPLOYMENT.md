# Deployment and Testing Guide

## Overview
This document provides instructions for testing and deploying the Trovelore dashboard application. The application is built with Next.js, Shadcn UI, and integrates with Supabase and Shopify API.

## Prerequisites
- Node.js 18+ installed
- Supabase account and project set up
- Shopify Partner account with API credentials
- Vercel account (recommended for deployment)

## Local Testing

### 1. Environment Setup

Create a `.env.local` file in the project root with the following variables:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Shopify
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_STORE_URL=your_store_url
SHOPIFY_ACCESS_TOKEN=your_access_token

# Email (optional for local testing)
EMAIL_FROM=noreply@yourdomain.com
EMAIL_SERVER_HOST=smtp.example.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your_email_user
EMAIL_SERVER_PASSWORD=your_email_password
```

### 2. Database Setup

1. Run the database setup script to create necessary tables and stored procedures:
   ```
   npm run setup-db
   ```

2. Initialize default email templates:
   ```
   npm run init-templates
   ```

### 3. Install Dependencies and Run Development Server

```bash
npm install
npm run dev
```

The application should now be running at http://localhost:3000

### 4. Testing Checklist

#### Authentication and User Management
- [ ] Test login with admin credentials
- [ ] Create new users with different roles
- [ ] Verify role-based access restrictions
- [ ] Test user profile editing

#### Order Management
- [ ] Test order listing and filtering
- [ ] Create a new manual order
- [ ] Edit existing order details
- [ ] Test Shopify order synchronization

#### Payment Tracking
- [ ] Record deposit payment
- [ ] Record final payment
- [ ] Verify payment status updates
- [ ] Test payment reminder functionality

#### Email Notifications
- [ ] Test email template customization
- [ ] Send test deposit reminder
- [ ] Send test shipping notification
- [ ] Verify email logs are recorded

#### Portugal Office View
- [ ] Test access with Portugal Office role
- [ ] Verify incoming orders display
- [ ] Test shipping status updates
- [ ] Verify order details display

## Deployment

### Option 1: Vercel Deployment (Recommended)

1. Push your code to a GitHub repository

2. Connect your GitHub repository to Vercel:
   - Sign in to Vercel and click "New Project"
   - Import your GitHub repository
   - Configure environment variables (same as in `.env.local`)
   - Deploy the project

3. After deployment, set up a cron job for Shopify synchronization:
   - In Vercel, go to Settings > Cron Jobs
   - Add a new cron job to hit your `/api/sync` endpoint daily

### Option 2: Self-Hosted Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

3. For production deployment, consider using PM2:
   ```bash
   npm install -g pm2
   pm2 start npm --name "trovelore" -- start
   ```

4. Set up a reverse proxy with Nginx or similar

5. Configure a cron job for Shopify synchronization:
   ```
   0 0 * * * curl https://yourdomain.com/api/sync
   ```

## Database Migrations

When making schema changes:

1. Update the Prisma schema in `prisma/schema.prisma`
2. Generate migration:
   ```bash
   npx prisma migrate dev --name your_migration_name
   ```
3. Apply migration to production:
   ```bash
   npx prisma migrate deploy
   ```

## Troubleshooting

### Common Issues

1. **Shopify API Rate Limiting**
   - The application includes retry logic with exponential backoff
   - For large stores, consider increasing the sync interval

2. **Email Sending Failures**
   - Check SMTP credentials
   - Verify sender email is authorized
   - Check email logs in Supabase

3. **Authentication Issues**
   - Ensure Supabase authentication is properly configured
   - Check user roles in the `user_profiles` table

4. **Database Connection Issues**
   - Verify Supabase connection strings
   - Check database permissions for service role

For additional support, please contact the development team.
