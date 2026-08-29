# Authentication & Feature-Gating System for AssessmentCore

## 🎯 What Was Implemented

A complete authentication and feature-gating system for the Batch QTI Creator tool using Supabase. Here's the complete user flow:

### User Flow:

```
1. User visits workspace and clicks "Batch QTI Creator"
   ↓
2. If NOT logged in:
   → Show registration prompt
   → User can register (email, name, password)
   → Receives verification email with OTP
   → Enters verification code
   → Login successful
   ↓
3. If logged in AND free quota available (1 export):
   → Allow full access to Batch Creator
   → Upload file, validate, export as QTI
   → Upon successful export:
      - Export is downloaded
      - Usage is tracked in database
      - User is shown "Quota exhausted" message
   ↓
4. If logged in AND free quota USED:
   → Show pricing page
   → Display upgrade options
   → User can subscribe to Pro/Enterprise plans
```

---

## 📦 What's Included

### 1. **Authentication System**

- Registration with email, name, and password
- Email verification via OTP (One-Time Password)
- Secure login/logout
- Persistent session management
- Password strength validation

### 2. **Files Created/Modified**

#### New Services:

- `src/services/supabaseClient.ts` - Supabase client initialization
- `src/services/authService.ts` - All authentication API calls

#### New Context:

- `src/contexts/AuthContext.tsx` - Global auth state management with useAuth hook

#### New Auth Pages:

- `src/pages/auth/RegisterPage.tsx` - User registration
- `src/pages/auth/LoginPage.tsx` - User login
- `src/pages/auth/VerifyEmailPage.tsx` - Email verification
- `src/pages/PricingPage.tsx` - Pricing and upgrade options

#### Modified Files:

- `src/app/routes.ts` - Added new routes
- `src/app/App.tsx` - Wrapped app with AuthProvider
- `src/app/pages/workspace/BatchCreator.tsx` - Added auth protection and usage tracking

#### Configuration & Docs:

- `.env.example` - Environment variables template
- `docs/DATABASE_SETUP.sql` - Database schema with RLS policies
- `docs/AUTH_IMPLEMENTATION_GUIDE.md` - Complete setup guide

### 3. **Database Schema**

Two main tables:

**`user_profiles`** - Stores user information

```sql
- id (UUID, Primary Key)
- email (TEXT, Unique)
- full_name (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**`user_usage`** - Tracks QTI exports per user

```sql
- user_id (UUID, Primary Key, Foreign Key)
- exports_count (INTEGER, default 0)
- last_export_at (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

Both tables have **Row Level Security (RLS)** enabled to ensure users can only access their own data.

---

## 🚀 Quick Start

### 1. Create Supabase Project

```bash
# Go to https://app.supabase.com
# Create new project
# Copy URL and Anon Key
```

### 2. Set Environment Variables

```bash
# Create .env.local in project root
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Set Up Database

```bash
# In Supabase SQL Editor, run:
# Contents of docs/DATABASE_SETUP.sql
```

### 4. Test It Out

```bash
npm run dev
# Navigate to workspace → Batch QTI Creator
```

---

## 📋 Feature Details

### Authentication Flow

1. **Registration**

   - User enters: Email, Name, Password (8+ chars)
   - Password confirmation required
   - Input validation on client side
   - Supabase handles server-side validation and user creation
   - Profile stored in `user_profiles` table

2. **Email Verification**

   - Supabase sends OTP to email automatically
   - User has 6-digit code
   - Can resend code (with 60-second cooldown)
   - After verification, email_confirmed status is set

3. **Login**

   - Email and password required
   - Session persisted in browser
   - Auth state restored on page refresh

4. **Logout**
   - Session cleared
   - User returned to home page

### Batch Creator Protection

**Unauthenticated Users:**

- See a lock icon modal
- Option to register or login
- Benefits of free trial displayed

**Authenticated Users (Quota Available):**

- Full access to batch creator
- Can upload CSV/Excel files
- Can validate questions
- Can export to QTI/JSON
- Export is tracked in `user_usage` table

**Exceeded Quota:**

- After 1st export, user is redirected to pricing page
- Shows "Quota Reached" message
- Displays Pro/Enterprise plan benefits
- Links to upgrade options

### Usage Tracking

```
Every successful QTI export:
1. Download file to user's computer
2. Increment `user_usage.exports_count` in database
3. Update `last_export_at` timestamp
4. Check if quota is exhausted
5. If exhausted, redirect to pricing page
```

---

## 🔧 Customization Guide

### Change Free Tier Limit

In `src/app/pages/workspace/BatchCreator.tsx`:

```tsx
// Change from 1 to 5 free exports
const canUseFeature = !userUsage || userUsage.exports_count < 5;
```

### Change Verification Method

From OTP to Magic Link in `src/services/authService.ts`:

```tsx
// In verifyEmail function, change:
type: 'email',  // → 'magic_link'
```

### Customize Pricing Page

Edit pricing tiers in `src/pages/PricingPage.tsx`:

```tsx
const pricingTiers: PricingTier[] = [
  {
    name: "Pro",
    price: "$29",
    features: ["Your custom features here"],
    // ... other properties
  },
];
```

---

## 💳 Payment Integration

### Stripe Example

```tsx
// In PricingPage.tsx handleUpgrade function
const handleUpgrade = async (tier: string) => {
  const stripe = await loadStripe(process.env.VITE_STRIPE_KEY!);

  const response = await fetch("/api/create-checkout", {
    method: "POST",
    body: JSON.stringify({
      tier,
      userId: user?.id,
      email: user?.email,
    }),
  });

  const { sessionId } = await response.json();
  await stripe?.redirectToCheckout({ sessionId });
};
```

### Razorpay Example

```tsx
const handleUpgrade = async (tier: string) => {
  const options = {
    key: process.env.VITE_RAZORPAY_KEY_ID,
    amount: getTierPrice(tier) * 100, // in paise
    currency: "INR",
    handler: async (response) => {
      // Verify payment with your backend
      await updateUserTier(user?.id, tier);
    },
  };

  const razorpay = new window.Razorpay(options);
  razorpay.open();
};
```

---

## 📊 Admin Features (Future Enhancement)

You can add admin features by:

1. Create `admin_users` table with admin role
2. Add RLS policy to check admin status
3. Create admin dashboard to view:
   - Total signups
   - Active users
   - Export statistics
   - Subscription revenue
   - Failed payment attempts

---

## 🔒 Security Features

1. **Email Verification Required** - Prevents fake email registrations
2. **Row Level Security (RLS)** - Users can only access their own data
3. **Password Policies** - Minimum 8 characters enforced
4. **HTTPS Only** - All auth data encrypted in transit
5. **Session Management** - Secure session tokens from Supabase
6. **Database Backup** - Automatic daily backups via Supabase

---

## ⚠️ Important Notes

1. **Environment Variables**

   - `VITE_` prefix makes variables available to frontend (safe)
   - Never expose secret API keys
   - Always use `.env.local` (never commit)

2. **Email Confirmation**

   - Uses Supabase SMTP by default
   - Change email provider in Supabase settings
   - Configure email templates for branding

3. **Database Size Limits**

   - Supabase free tier: 0.5 GB
   - Pro tier: 2 GB + $10 per GB
   - Suitable for up to 1000+ users on free tier

4. **RLS Performance**
   - Add indexes for frequently queried fields
   - Already optimized in `DATABASE_SETUP.sql`

---

## 🐛 Troubleshooting

### "Supabase environment variables are not set"

```
✓ Check .env.local exists
✓ Check variable names match (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
✓ Restart dev server after adding env vars
```

### "Email verification not received"

```
✓ Check spam folder
✓ Verify Supabase email provider is enabled
✓ Check email template in Supabase dashboard
✓ Try resending verification code
```

### "User can access feature after quota"

```
✓ Clear browser cache and localStorage
✓ Verify canUseFeature logic in BatchCreator
✓ Check database user_usage record
✓ Verify RLS policies are enabled
```

### "CORS errors"

```
✓ Use Supabase client (automatically handles CORS)
✓ Check browser console for specific error
✓ Verify Supabase project CORS settings
```

---

## 📈 Getting to Production

1. **Create Production Supabase Project**

   - Separate from development
   - Run DATABASE_SETUP.sql there too
   - Different credentials

2. **Environment Variables**

   - Set in hosting provider (Vercel, Netlify, etc.)
   - Never commit `.env.local`

3. **Email Provider**

   - Set up SendGrid/Postmark/custom SMTP
   - Configure sender name and address
   - Test email delivery

4. **Payment Processor**

   - Integrate Stripe/Razorpay
   - Set up webhooks for payments
   - Test checkout flow

5. **Monitoring**
   - Set up error tracking (Sentry)
   - Monitor database queries
   - Track user signup/login rates

---

## 📚 Resources

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Database](https://supabase.com/docs/guides/database)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

## 💡 Future Enhancements

1. **Social Login** - Google, GitHub, Microsoft login
2. **Two-Factor Authentication** - Enhanced security
3. **Subscription Management** - User can change/cancel plans
4. **Usage Analytics** - Track export patterns, question types, etc.
5. **Team Accounts** - Share batch creator between team members
6. **Rate Limiting** - Prevent abuse of free tier
7. **Export History** - Users can view past exports
8. **Custom Templates** - Branded export formats

---

## ❓ Questions?

Refer to:

1. `docs/AUTH_IMPLEMENTATION_GUIDE.md` - Complete setup guide
2. `docs/DATABASE_SETUP.sql` - Database schema
3. Code comments in `src/services/authService.ts`
4. Supabase documentation links above

Happy coding! 🚀
