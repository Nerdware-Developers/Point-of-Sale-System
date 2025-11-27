# Login Debugging Guide

## Current Status
✅ Passwords are valid in the database
✅ Users exist (admin and cashier)
✅ Backend routes are configured

## Debugging Steps

### 1. Check Browser Console
Open your browser's Developer Tools (F12) and check:
- **Console tab**: Look for `[Auth]` and `[Login]` log messages
- **Network tab**: 
  - Look for a request to `/api/auth/login`
  - Check the request status (200, 401, 500, etc.)
  - Check the request payload
  - Check the response

### 2. Check Backend Console
Look at the terminal where the backend server is running:
- You should see `[Auth] Login request received:` when you try to login
- Check for any error messages

### 3. Test the API Directly
Open your browser and go to:
```
http://localhost:5000/api/health
```
You should see: `{"status":"OK","message":"POS API is running"}`

### 4. Test Login with curl (if available)
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 5. Common Issues

#### Issue: "Network Error" or "ERR_CONNECTION_REFUSED"
**Solution**: Backend server is not running
- Start backend: `cd backend && npm run dev`
- Check if it's running on port 5000

#### Issue: "CORS error"
**Solution**: Check backend CORS configuration
- Should be enabled in `server.js`

#### Issue: "401 Unauthorized"
**Solution**: 
- Check username/password are correct
- Check backend console for specific error
- Run: `node backend/scripts/test-login.js` to verify passwords

#### Issue: "500 Internal Server Error"
**Solution**: 
- Check backend console for error details
- Verify database connection
- Check JWT_SECRET is set (or using default)

### 6. Manual Password Reset
If passwords don't work, run:
```bash
cd backend
node scripts/test-login.js
```
This will update the passwords in the database.

### 7. Clear Browser Cache
Sometimes cached data causes issues:
- Clear browser cache
- Clear localStorage: `localStorage.clear()` in browser console
- Try incognito/private mode

## Expected Console Output

### Frontend (Browser Console)
```
[Login] Submitting form with username: admin
[Auth] Attempting login for: admin
[Auth] Login response: {token: "...", user: {...}}
[Auth] Login successful for: admin
```

### Backend (Terminal)
```
[Auth] Login request received: { username: 'admin', hasPassword: true }
[Auth] Attempting login for username: admin
Login successful: admin (admin)
```

## Still Having Issues?

1. **Check both consoles** (browser and backend)
2. **Copy the exact error message** you see
3. **Check Network tab** in browser DevTools
4. **Verify backend is running** on port 5000
5. **Try the test endpoint**: `http://localhost:5000/api/test-login`

---

**The login should work now with the improved error handling!** 🎉

