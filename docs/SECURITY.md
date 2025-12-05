# Marginalia Security Guide

## Overview

This document outlines the security measures implemented to protect against abuse and stay within Firebase free tier limits.

## Security Layers

### 1. Firestore Security Rules ✅

**Location**: [`firestore.rules`](firestore.rules)

**Protections**:
- Users can only read/write their own data (auth required)
- Email verification required for all database operations
- Rate limiting: minimum 1 second between writes to same context
- Data validation: max 100 notes per context, 50KB per note
- Prevents unauthorized access even if API keys are extracted

**Deployment**:
```bash
# Install Firebase CLI (one-time setup)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in project (if not already done)
firebase init firestore

# Deploy security rules
firebase deploy --only firestore:rules

# Verify deployment
firebase firestore:rules
```

**Testing Rules Locally**:
```bash
# Install emulator
firebase init emulators

# Start emulator with rules
firebase emulators:start

# Run tests against emulator
npm test
```

### 2. Email Verification ✅

**Location**: [`src/authService.ts`](src/authService.ts)

**How it works**:
- Verification email sent immediately on signup
- Firestore rules block unverified users from reading/writing data
- Users must verify email before extension functions
- Prevents disposable email abuse

**User Experience**:
- After signup, user receives verification email
- Extension shows "Verify your email" message
- Can resend verification email if needed
- Data sync only works after verification

**Implementation**:
```typescript
// Signup automatically sends verification email
await signUpWithEmail(email, password);

// Check verification status
const verified = isEmailVerified();

// Resend verification if needed
await resendVerificationEmail();
```

### 3. Firebase App Check (Setup Required) ⚠️

**Location**: [`src/appCheck.ts`](src/appCheck.ts)

**Purpose**: Verify requests come from legitimate extension, not bots/scripts

**Setup Steps**:

1. **Enable App Check in Firebase Console**:
   - Go to Firebase Console > App Check
   - Click "Get started"

2. **Register Chrome Extension**:
   - Click "Add app" > Chrome Extension
   - Enter your extension ID (from manifest.json)
   - Firebase will automatically verify requests from this extension

3. **Get reCAPTCHA Enterprise Key**:
   - Go to Google Cloud Console > reCAPTCHA Enterprise
   - Create a new key (select "Website" type)
   - Add your extension ID to allowed domains
   - Copy the site key

4. **Update App Check Code**:
   ```typescript
   // In src/appCheck.ts, replace:
   'YOUR_RECAPTCHA_SITE_KEY_HERE'
   // with your actual site key
   ```

5. **Initialize App Check**:
   ```typescript
   // In src/background.ts or src/App.tsx
   import { initAppCheck } from './appCheck';
   initAppCheck();
   ```

6. **Development Mode**:
   - Uncomment debug token code in `appCheck.ts`
   - Check extension console for debug token
   - Add debug token to Firebase Console > App Check > Debug tokens

**Note**: App Check is optional but highly recommended for production.

### 4. Client-Side Rate Limiting ✅

**Location**: [`src/firebaseSync.ts`](src/firebaseSync.ts:38-76)

**Limits**:
- Minimum 1 second between writes to same context
- Maximum 100 notes per context
- Maximum 50KB per note
- Enforced both client-side AND server-side (Firestore rules)

**How it works**:
```typescript
// Tracks last write time per context
private lastWriteTime: Map<string, number> = new Map();

// Throws error if user tries to save too quickly
if (timeSinceLastWrite < 1000ms) {
  throw new Error('Please wait before saving again');
}
```

### 5. Data Size Limits ✅

**Enforced at multiple levels**:

| Limit | Client | Firestore Rules |
|-------|--------|-----------------|
| Notes per context | 100 | 100 |
| Note size | 50KB | 50KB |
| Write frequency | 1 req/sec | 1 req/sec |

## Monitoring & Alerts

### Firebase Console Monitoring

**Daily checks**:
1. **Firestore Usage** (Console > Firestore > Usage)
   - Document reads/writes
   - Storage size
   - Check for unusual spikes

2. **Authentication** (Console > Authentication > Users)
   - User growth rate
   - Look for suspicious patterns (mass signups)
   - Check email verification rates

3. **App Check** (Console > App Check)
   - Verification success rate
   - Failed verification attempts
   - Unusual traffic sources

### Budget Alerts

**Set up billing alerts**:
1. Go to Firebase Console > Project Settings > Usage and Billing
2. Set up budget alerts at:
   - 50% of expected usage
   - 80% of expected usage
   - 100% of expected usage

**Firebase Free Tier Limits** (Spark Plan):
- **Firestore**:
  - 50K reads/day
  - 20K writes/day
  - 1 GB storage
- **Authentication**:
  - Unlimited
- **Hosting**:
  - 10 GB storage
  - 360 MB/day transfer

### Suspicious Activity Indicators

**Red flags to watch for**:
- Sudden spike in new user signups
- High read/write ratio (>10:1 indicates scraping)
- Multiple users from same IP (check Auth logs)
- Users with unverified emails attempting access
- Failed App Check verifications

## Emergency Response

### If abuse is detected:

1. **Immediate Actions**:
   ```bash
   # Deploy stricter security rules
   firebase deploy --only firestore:rules

   # Disable compromised accounts (Firebase Console > Authentication)
   # Click user > Disable account
   ```

2. **Investigate**:
   - Check Firestore logs for unusual patterns
   - Review recent user signups
   - Check App Check logs for failed verifications

3. **Mitigation Options**:
   - Require email verification for existing unverified users
   - Add CAPTCHA to signup flow
   - Implement IP-based rate limiting (Cloud Functions)
   - Temporarily disable new signups
   - Upgrade to Blaze plan with spending limits

### Upgrade to Blaze Plan

If you need more quota:
```bash
# Set spending limit to protect against runaway costs
# Go to: Firebase Console > Project Settings > Usage and Billing
# Enable Blaze plan
# Set monthly spending limit (e.g., $10/month)
```

**Benefits**:
- Pay-as-you-go pricing
- Can set spending limits
- More generous quotas
- Cloud Functions support (for advanced rate limiting)

## Additional Security Measures

### Optional Enhancements

1. **CAPTCHA on Signup** (for web-based signup page):
   ```typescript
   import { getRecaptcha } from 'firebase/app-check';
   // Add to signup form
   ```

2. **IP-Based Rate Limiting** (requires Cloud Functions):
   ```javascript
   // Cloud Function to track requests per IP
   exports.rateLimitByIP = functions.https.onCall((data, context) => {
     // Track requests in Realtime Database
     // Block excessive requests from same IP
   });
   ```

3. **User Quotas** (Cloud Functions + Firestore):
   ```javascript
   // Track writes per user per day
   // Block users exceeding quota
   ```

4. **Email Domain Restrictions**:
   ```typescript
   // In Firestore rules, add:
   function hasValidEmailDomain() {
     return request.auth.token.email.matches('.*@(gmail|outlook|yahoo)\\.com$');
   }
   ```

## Security Checklist

Before going to production:

- [ ] Deploy Firestore security rules
- [ ] Test that unverified users cannot access data
- [ ] Set up Firebase App Check
- [ ] Configure billing alerts
- [ ] Test rate limiting (try rapid saves)
- [ ] Verify email verification flow
- [ ] Set up monitoring dashboard
- [ ] Document incident response plan
- [ ] Test with compromised API keys (ensure rules protect data)
- [ ] Review Cloud Functions logs (if using)

## Security Best Practices

1. **Never commit**:
   - Firebase service account keys
   - App Check debug tokens
   - Production credentials

2. **Regularly review**:
   - User signup patterns
   - Firestore usage metrics
   - Failed authentication attempts
   - App Check verification rates

3. **Keep updated**:
   - Firebase SDK versions
   - Security rules
   - Extension permissions

4. **Principle of least privilege**:
   - Only grant minimum necessary permissions
   - Review manifest permissions regularly
   - Audit third-party dependencies

## Resources

- [Firebase Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase App Check Documentation](https://firebase.google.com/docs/app-check)
- [Firebase Authentication Best Practices](https://firebase.google.com/docs/auth/web/start)
- [Firestore Pricing](https://firebase.google.com/pricing)
- [Security Rules Testing](https://firebase.google.com/docs/rules/unit-tests)

## Support

If you detect abuse or need help:
1. Check Firebase Console logs
2. Review this security guide
3. Update security rules if needed
4. Consider upgrading to Blaze plan with spending limits
