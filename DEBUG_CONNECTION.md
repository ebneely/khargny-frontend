# Frontend-Backend Connection Debugging Guide

## Quick Checks

### 1. Verify Backend is Running
```bash
# Check if backend is running on port 3001
curl http://localhost:3001/health
# or
curl http://localhost:3001/api/graphql -X POST -H "Content-Type: application/json" -d '{"query":"{ __typename }"}'
```

### 2. Verify Frontend Environment Variables
The frontend should have:
- `NEXT_PUBLIC_BACKEND_BASE_URL=http://localhost:3001` in `.env.development`

### 3. Check Browser Console
Open browser DevTools → Network tab → Look for:
- Failed requests to `http://localhost:3001/api/graphql`
- CORS errors
- 404 errors

### 4. Common Issues

#### Issue: CORS Error
**Symptom**: Browser console shows "CORS policy" error

**Solution**: Backend CORS allows `http://localhost:3000` and `http://localhost:3001`. 
If your Next.js app runs on a different port, update backend CORS config in `backend/src/core/server.ts`

#### Issue: Backend Not Running
**Symptom**: Network tab shows "Failed to fetch" or connection refused

**Solution**: 
1. Start backend: `cd backend && npm run dev`
2. Verify it's running: `curl http://localhost:3001/health`

#### Issue: Environment Variables Not Loaded
**Symptom**: GraphQL URL is undefined or wrong

**Solution**: 
1. Restart Next.js dev server after changing `.env.development`
2. Verify in browser console: `console.log(process.env.NEXT_PUBLIC_BACKEND_BASE_URL)`

#### Issue: GraphQL Feature Disabled
**Symptom**: Backend logs show "GraphQL feature is DISABLED"

**Solution**: Set `FEATURE_GRAPHQL=true` in `backend/.env.development`

## Testing the Connection

### Test GraphQL Endpoint Directly
```bash
curl -X POST http://localhost:3001/api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
```

### Test from Browser Console
```javascript
fetch('http://localhost:3001/api/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ query: '{ __typename }' })
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

