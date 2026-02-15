# Cloudflare Workers Deployment Guide

This guide explains how to deploy Ostrich-Legs to Cloudflare Workers in **one shot**.

## ⚠️ Critical Requirements

1. **wrangler.toml must be configured** (provided below)
2. **VITE_WS_BASE_URL env var must be set** in Cloudflare Pages
3. **Pages and Workers are separate products** - don't mix up the domains

## Architecture

```
┌─────────────────┐         ┌──────────────────────┐
│ Cloudflare      │         │ Cloudflare           │
│ Pages           │────────▶│ Workers              │
│ (Static UI)     │  HTTPS  │ (WebSocket Server)   │
│                 │         │                      │
│ ostrich-legs    │         │ ostrich-swarm        │
│ .pages.dev      │         │ .workers.dev         │
└─────────────────┘         └──────────┬───────────┘
                                       │
                              ┌────────▼────────┐
                              │ Durable Object  │
                              │ (Per-Swarm DB)  │
                              └─────────────────┘
```

## Prerequisites

1. Cloudflare account
2. Wrangler CLI: `npm install -g wrangler`
3. Authenticated: `wrangler login`

## Deploy Backend (Workers + Durable Objects)

### Step 1: Create KV Namespace (Optional but recommended)

```bash
cd server
wrangler kv:namespace create OSTRICH_KV
```

Copy the ID from output and paste into `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "OSTRICH_KV"
id = "paste-id-here"  # <-- REPLACE THIS
```

### Step 2: Update wrangler.toml

Your `server/wrangler.toml` should look exactly like this:

```toml
name = "ostrich-swarm"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[durable_objects]
bindings = [
  { name = "SWARM_COORDINATOR", class_name = "SwarmCoordinator" }
]

[[migrations]]
tag = "v1"
new_classes = ["SwarmCoordinator"]

[[kv_namespaces]]
binding = "OSTRICH_KV"
id = "REPLACE_WITH_REAL_ID_AFTER_CREATING_NAMESPACE"

[build]
command = ""

[vars]
ENVIRONMENT = "production"
```

### Step 3: Deploy

```bash
cd server
wrangler deploy
```

You'll get a URL like:
```
https://ostrich-swarm.your-account.workers.dev
```

**Save this URL** - you'll need it for the frontend.

## Deploy Frontend (Cloudflare Pages)

### Step 1: Build Configuration

In Cloudflare Pages dashboard:

- **Build command**: `bun install && bun run build`
- **Build output directory**: `dist`
- **Root directory**: `client`

### Step 2: Set Environment Variable

**CRITICAL**: Without this, the frontend will try to connect to the wrong domain.

Go to Pages → Your Project → Settings → Environment Variables

Add:

```
VITE_WS_BASE_URL = wss://ostrich-swarm.your-account.workers.dev
```

Replace with your actual Worker URL from Step 3 above.

**For preview deployments**, also add to **Preview** environment variables.

### Step 3: Deploy

```bash
cd client
bun install
bun run build
```

Or connect your GitHub repo for auto-deployment.

## Local Development

```bash
# Terminal 1: Start Worker locally
cd server
wrangler dev
# Runs on http://localhost:8787

# Terminal 2: Start client
cd client
bun run dev
# Vite proxies /ws to localhost:8787 automatically
```

No env vars needed for local dev - it auto-detects.

## Verification

After deployment:

1. Open `https://ostrich-legs.pages.dev`
2. Check browser console for:
   ```
   [WebSocket] Connecting to: wss://ostrich-swarm.../ws?persistentId=...
   [WebSocket] Connected
   ```
3. Open another browser/incognito window
4. Join swarm via QR code or invite link
5. Both should show connected devices

## Troubleshooting

### "WebSocket connection failed"

**Symptom**: Console shows `wss://ostrich-legs.pages.dev/ws` (wrong domain)

**Fix**: You forgot to set `VITE_WS_BASE_URL`. Add it in Pages Settings.

### "Cannot connect to WebSocket"

**Symptom**: Connection times out

**Check**:
1. Worker URL is correct in env var
2. Worker is deployed: `wrangler deploy`
3. Worker shows no errors: `wrangler tail`

### "Durable Object not found"

**Symptom**: Worker throws 500

**Fix**: Missing migration in wrangler.toml. Should have:
```toml
[[migrations]]
tag = "v1"
new_classes = ["SwarmCoordinator"]
```

Then redeploy: `wrangler deploy`

## Cost Estimates

**Free tier limits**:
- Workers: 100,000 requests/day
- Durable Objects: Limited storage + requests

**A 10-device swarm generates**:
- ~1,400 requests/day (with optimizations)
- Fits within free tier

**Paid tier** (~$5/month for active use):
- Workers: $0.50/million requests
- DO: $0.12/million requests + storage

## Security Checklist

- [ ] CORS restricted to your Pages domain (not `*`)
- [ ] Input validation with Zod schemas
- [ ] WebSocket origin validation
- [ ] Rate limiting on token generation (already implemented: 5/min)
- [ ] HTTPS only (enforced by Cloudflare)

## Rollback

If you need to revert to Bun/Socket.io:

1. Restore original `server/src/index.ts` (Bun version)
2. Restore original `server/package.json`
3. Stop using Wrangler, run `bun src/index.ts`
4. Update client to use old SocketManager

The original files are preserved in git history.

---

## Architecture Changes

### Before (Bun/Socket.io)
- **Runtime**: Bun with Socket.io
- **State**: In-memory Maps (lost on restart)
- **Connections**: Socket.io rooms
- **Persistence**: None

### After (Cloudflare Workers)
- **Runtime**: Cloudflare Workers (V8 isolates)
- **State**: Durable Object persistent key-value storage
- **Connections**: Native WebSocket API
- **Persistence**: Storage API (key-value operations, not SQL)

## Features Migrated

✅ **WebSocket Connections**: Native WebSocket with auto-reconnect  
✅ **Device Registration**: Persistent device storage per swarm  
✅ **Job Scheduling**: Weighted distribution with quota management  
✅ **State Broadcasting**: 2-second snapshots via Durable Object alarms  
✅ **Token Authentication**: Rate-limited invite codes (5/min)  
✅ **Device Lifecycle**: Heartbeat, offline detection, cleanup  
✅ **System Logging**: Broadcast to all connected clients  
✅ **Benchmark Scoring**: Dynamic weight recalculation  

## Limitations

1. **No Socket.io Fallback**: Native WebSockets only (99%+ browser support)
2. **Connection Limits**: Durable Objects have WebSocket connection limits (~1000 concurrent per DO). For larger swarms, implement sharding across multiple DOs.
3. **State Migration**: In-memory state from Bun version is not migratable
4. **Debugging**: Use `wrangler tail` for production logs

## Edge Cases & Production Considerations

### Durable Object Restart Recovery

When a DO restarts (due to inactivity, deployment, or maintenance):

1. **In-memory state is lost**: The `sessions` Map gets cleared
2. **WebSocket reconnection**: Clients auto-reconnect via exponential backoff (implemented in WebSocketManager)
3. **State rehydration**: Device registry and job queue persist in storage
4. **Alarm rescheduling**: `scheduleBroadcast()` checks if alarm exists before setting

### Connection Lifecycle

```typescript
// DO restart scenario:
// 1. DO hibernates after 10s of inactivity
// 2. New request wakes DO (constructor runs again)
// 3. sessions Map is empty - clients must reconnect
// 4. Device states persist in storage (ONLINE → OFFLINE on cleanup)
```

### Broadcast Backpressure

2-second broadcast intervals can spike CPU with many devices:

- **Current**: Broadcast to all connected sockets synchronously
- **Risk**: Large swarms may hit CPU time limits
- **Mitigation**: Consider batching, sampling, or throttling broadcasts for >50 devices

### Half-Open Socket Detection

WebSockets may appear connected but be dead (network partition):

- Client sends heartbeat every 10s
- Server marks offline after 60s without heartbeat
- Cleanup job runs every alarm cycle (2s)

### Zero-Active-Socket Optimization

The alarm fires every 2s regardless of activity:

```typescript
// Potential optimization: hibernate when empty
const room = this.sessions.size;
if (room === 0) {
  // Cancel alarm to save CPU/billing
  await this.state.storage.deleteAlarm();
}
```

### Message Validation

Current implementation trusts client input. Production should add:

```typescript
import { z } from 'zod';

const JobCompleteSchema = z.object({
  chunkId: z.string(),
  error: z.string().optional(),
  durationMs: z.number().optional(),
});

// Validate before processing
const result = JobCompleteSchema.safeParse(payload);
if (!result.success) {
  this.systemLog("ERR", "Invalid job completion payload", "SECURITY");
  return;
}
```

## Monitoring

### View Logs

```bash
wrangler tail
```

### Check Durable Object Metrics

Use Cloudflare Dashboard → Workers & Pages → Durable Objects

## Cost Considerations

Cloudflare Workers pricing:
- **Free**: 100,000 requests/day, 10ms CPU time
- **Paid**: $0.50/million requests, $12.50/million GB-seconds

Durable Objects:
- **Free**: Limited requests and storage
- **Paid**: $0.12/million requests, $1/GB-month storage

For a compute swarm with 10 devices:
- ~1,000 requests/minute (heartbeats + broadcasts)
- ~1.4M requests/day
- **Likely exceeds free tier** (100K requests/day limit)
- Paid plan recommended for production use

## Security

### Current Measures

1. **CORS**: Configured to allow all origins (update for production with specific domains)
2. **Rate Limiting**: Token generation limited to 5/minute per swarm
3. **Token Expiry**: 24-hour TTL on join tokens
4. **Origin Validation**: WebSocket upgrade validates `persistentId` presence

### Production Hardening Checklist

- [ ] **Input Validation**: Add Zod schemas for all WebSocket message types
- [ ] **Origin Checks**: Validate `Origin` header on WebSocket upgrade
- [ ] **Message Size Limits**: Cap payload sizes to prevent DoS
- [ ] **Replay Protection**: Add nonces or timestamps to tokens
- [ ] **Audit Logging**: Log security events (failed joins, rate limit hits)
- [ ] **Device Authentication**: Consider HMAC signatures for device messages

### WebSocket Message Validation Example

```typescript
import { z } from 'zod';

const Schemas = {
  DEVICE_REGISTER: z.object({
    name: z.string().max(100),
    capabilities: z.object({
      cpuCores: z.number().int().min(1).max(128),
      memoryGB: z.number().min(0.5).max(1024),
      gpuAvailable: z.boolean(),
      gpuName: z.string().optional(),
    }),
  }),
  
  JOB_COMPLETE: z.object({
    chunkId: z.string().uuid(),
    error: z.string().max(500).optional(),
    durationMs: z.number().int().positive().optional(),
  }),
  
  // ... etc
};

// In handleMessage:
const schema = Schemas[event];
if (schema) {
  const result = schema.safeParse(payload);
  if (!result.success) {
    this.systemLog("WARN", `Invalid ${event} payload`, "SECURITY");
    return;
  }
}
```
