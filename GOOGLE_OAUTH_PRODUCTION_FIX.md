# Google OAuth Button Not Visible in Production - Fix Guide

## Problem
The Google authentication button is not visible on the login/register pages in production, even though it works in development.

## Root Causes Identified

1. **Docker Build Cache**: The production Docker image was likely built before the Google OAuth button code was added, or is using cached layers that don't include the latest changes.

2. **Missing Translation Keys**: Translation keys for Google OAuth buttons were missing (now fixed).

## Solution

### Step 1: Rebuild Client Container Without Cache

The most important step is to rebuild the client Docker image without using cache:

```bash
# Stop the client container
docker-compose -f docker-compose.prod.yml stop client

# Remove the existing client image (optional but recommended)
docker rmi $(docker images | grep lunai-client | awk '{print $3}') 2>/dev/null || true

# Rebuild client without cache
docker-compose -f docker-compose.prod.yml build --no-cache client

# Start the client container
docker-compose -f docker-compose.prod.yml up -d client
```

### Step 2: Verify the Build

Check that the Google button code is in the built files:

```bash
# Check if Google button code exists in the built files
docker exec lunai-client grep -r "signUpWithGoogle\|signInWithGoogle" /usr/share/nginx/html/ 2>/dev/null | head -5
```

### Step 3: Clear Browser Cache

After rebuilding, users should clear their browser cache or do a hard refresh:
- **Chrome/Edge**: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- **Firefox**: `Ctrl+F5` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- **Safari**: `Cmd+Option+R`

### Step 4: Verify Google OAuth Configuration

Ensure Google OAuth is configured in your `.env` file:

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://api.yourdomain.com/api/auth/google/callback
```

### Step 5: Check Server Logs

Verify that Google OAuth is configured on the server:

```bash
docker-compose -f docker-compose.prod.yml logs server | grep "Google OAuth"
```

You should see:
```
🔐 Google OAuth Configuration:
   Client ID: your-client-id...
   Redirect URI: https://api.yourdomain.com/api/auth/google/callback
   ⚠️  Make sure this redirect URI is added in Google Cloud Console!
```

## Complete Rebuild (If Step 1 Doesn't Work)

If the button still doesn't appear, do a complete rebuild:

```bash
# Stop all services
docker-compose -f docker-compose.prod.yml down

# Remove all images (optional - be careful!)
# docker-compose -f docker-compose.prod.yml down --rmi all

# Rebuild everything without cache
docker-compose -f docker-compose.prod.yml build --no-cache

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f client
```

## Verification Checklist

- [ ] Client container rebuilt with `--no-cache`
- [ ] Translation keys added (`signUpWithGoogle`, `signInWithGoogle`)
- [ ] Browser cache cleared
- [ ] Google OAuth environment variables set in `.env`
- [ ] Google Cloud Console redirect URI matches production URL
- [ ] Server logs show Google OAuth is configured
- [ ] Button appears on `/login` page
- [ ] Button appears on `/register` page

## Troubleshooting

### Button Still Not Visible After Rebuild

1. **Check browser console** for JavaScript errors:
   ```javascript
   // Open browser DevTools (F12) and check Console tab
   ```

2. **Verify the built HTML** contains the button:
   ```bash
   docker exec lunai-client cat /usr/share/nginx/html/index.html | grep -i "google"
   ```

3. **Check CSS** - The button might be hidden by CSS:
   ```bash
   # Inspect element in browser DevTools
   # Look for: display: none, visibility: hidden, opacity: 0
   ```

4. **Verify API URL** - Check that `VITE_API_URL` is set correctly:
   ```bash
   docker exec lunai-client env | grep VITE_API_URL
   ```

### Button Visible But Not Working

1. **Check network requests** in browser DevTools → Network tab
2. **Verify redirect URL** matches Google Cloud Console configuration
3. **Check server logs** for OAuth errors:
   ```bash
   docker-compose -f docker-compose.prod.yml logs -f server | grep -i "google\|oauth"
   ```

## Files Changed

- ✅ `client/src/locales/en.json` - Added `signUpWithGoogle` and `signInWithGoogle` keys
- ✅ `client/src/locales/fr.json` - Added `signUpWithGoogle` and `signInWithGoogle` keys
- ✅ `client/src/features/auth/RegisterPage.tsx` - Google button code present
- ✅ `client/src/features/auth/LoginPage.tsx` - Google button code present

## Next Steps

After rebuilding, test the Google OAuth flow:
1. Visit `https://yourdomain.com/login`
2. Click "Sign in with Google"
3. Complete Google OAuth flow
4. Verify redirect back to app
5. Verify user is logged in

