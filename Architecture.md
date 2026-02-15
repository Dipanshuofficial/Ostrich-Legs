# Ostrich-Legs Architecture

## Executive Summary

Ostrich-Legs is a distributed computing platform enabling browser-based devices to form collaborative compute swarms. The system implements a hierarchical master-worker topology with real-time orchestration, adaptive throttling, and capability-aware job scheduling.

## System Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                        SWARM CLUSTER                              │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Master Node  │  │ Worker Node  │  │ Worker Node  │           │
│  │  (Browser)   │  │  (Mobile)    │  │  (Desktop)   │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                 │                    │
│         └─────────────────┴─────────────────┘                    │
│                           │                                      │
│                    WebSocket (Socket.io)                         │
│                           │                                      │
│         ┌─────────────────┴─────────────────┐                    │
│         │                                   │                    │
│    ┌────▼────┐                        ┌─────▼────┐              │
│    │ Bun     │                        │ Bun      │              │
│    │ Server  │◄──────────────────────►│ Server   │              │
│    │ :3000  │   Horizontal Scale      │ :3001    │              │
│    └────┬────┘                        └─────┬────┘              │
│         │                                    │                   │
└─────────┼────────────────────────────────────┼───────────────────┘
          │                                    │
          └──────────────┬─────────────────────┘
                         │
                    Redis/PubSub
              (Eventual: State Synchronization)
```

---

## Directory Structure

```
Ostrich-Legs/
├── client/                          # React Frontend (Vite + SWC)
│   ├── src/
│   │   ├── features/               # Domain-organized feature modules
│   │   │   ├── connection/         # Device onboarding & swarm joining
│   │   │   │   └── DeviceConnector.tsx
│   │   │   ├── dashboard/          # Compute visualization & controls
│   │   │   │   ├── ActiveSwarm.tsx
│   │   │   │   ├── JobGauge.tsx
│   │   │   │   ├── ResourceStats.tsx
│   │   │   │   ├── SwarmControls.tsx
│   │   │   │   ├── ThrottleControl.tsx
│   │   │   │   └── VelocityMonitor.tsx
│   │   │   └── terminal/           # System logging interface
│   │   │       └── LiveTerminal.tsx
│   │   ├── components/             # Shared UI primitives
│   │   │   └── Card.tsx
│   │   ├── hooks/                  # State management & side effects
│   │   │   ├── usePersistentIdentity.ts
│   │   │   └── useSwarmEngine.ts
│   │   ├── utils/                  # Computational workers
│   │   │   └── compute.worker.ts
│   │   ├── core/                   # Client-side type definitions & theming
│   │   │   ├── types.ts
│   │   │   └── theme.css
│   │   ├── App.tsx                 # Root component & layout orchestration
│   │   └── main.tsx                # Application bootstrap
│   ├── package.json
│   └── vite.config.ts
│
├── server/                          # Bun Backend (Socket.io)
│   ├── src/
│   │   ├── managers/               # Domain logic controllers
│   │   │   ├── AuthManager.ts      # Token generation & validation
│   │   │   ├── DeviceManager.ts    # Device lifecycle & health
│   │   │   └── JobScheduler.ts     # Job queue & dispatch
│   │   ├── core/                   # Server-side type definitions
│   │   │   └── types.ts
│   │   └── index.ts                # Socket.io server & event handlers
│   └── package.json
│
└── shared/                          # Cross-boundary type contracts
    └── socket/
        ├── events.ts               # Canonical event name registry
        ├── payloads.ts             # Request/response type definitions
        └── states.ts               # State enumerations & log types
```

---

## Shared Type Architecture

### Contract Boundary: `shared/socket/`

All client-server communication flows through strictly typed contracts defined in the shared directory. This ensures compile-time safety across the network boundary.

#### Event Registry (`shared/socket/events.ts`)

```typescript
SocketEvents = {
  // Lifecycle
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  CONNECTION_ERROR: "connect_error",

  // Identity
  DEVICE_REGISTER: "device:register",
  DEVICE_READY: "device:ready",
  HEARTBEAT: "heartbeat",

  // Orchestration
  SWARM_SNAPSHOT: "swarm:snapshot",
  SWARM_SET_STATE: "cmd:set_run_state",
  SWARM_SET_THROTTLE: "cmd:set_throttle",
  SWARM_THROTTLE_SYNC: "swarm:throttle_sync",

  // Job Pipeline
  JOB_REQUEST_BATCH: "job:request_batch",
  JOB_BATCH_DISPATCH: "job:batch",
  JOB_COMPLETE: "job:complete",

  // Diagnostics
  SYSTEM_LOG: "sys:log",
  BENCHMARK_START: "cmd:run_benchmark",
  BENCHMARK_RESULT: "benchmark:result",
};
```

#### State Enumerations (`shared/socket/states.ts`)

```
SwarmRunState: "IDLE" | "RUNNING" | "PAUSED" | "STOPPED"
DeviceConnectionStatus: "OFFLINE" | "ONLINE" | "BUSY" | "DISABLED"
LogLevel: "SYS" | "NET" | "CPU" | "GPU" | "ERR" | "WARN"
```

#### Payload Contracts (`shared/socket/payloads.ts`)

| Payload                 | Direction | Fields                                                                                          |
| ----------------------- | --------- | ----------------------------------------------------------------------------------------------- |
| `DeviceRegisterPayload` | C→S       | name, capabilities {cpuCores, memoryGB, gpuAvailable, gpuName?}                                 |
| `JobCompletePayload`    | C→S       | chunkId, workerId, result?, error?, durationMs?                                                 |
| `SwarmSnapshotPayload`  | S→C       | runState, devices, stats {totalJobs, completedJobs, activeJobs, globalVelocity, globalThrottle} |
| `SystemLogPayload`      | S→C       | level, message, timestamp, source?                                                              |

---

## Client Architecture

### Module Hierarchy

```
App.tsx (Orchestrator)
│
├── usePersistentIdentity.ts ──► localStorage ("ostrich_device_id", "ostrich_device_name")
│
├── useSwarmEngine.ts ────────► Socket.io connection
│   │
│   ├── socketRef ────────────► SocketEvents.CONNECT
│   │                           SocketEvents.JOB_BATCH_DISPATCH
│   │                           SocketEvents.SWARM_SNAPSHOT
│   │                           SocketEvents.SYSTEM_LOG
│   │
│   └── workerRef ────────────► compute.worker.ts
│       │
│       ├── "BENCHMARK" ──────► BenchmarkResult ──► SocketEvents.BENCHMARK_RESULT
│       ├── "EXECUTE_JOB" ────► JobComplete ──────► SocketEvents.JOB_COMPLETE
│       └── "JOB_ERROR" ──────► ErrorLog ─────────► SocketEvents.JOB_COMPLETE (with error)
│
├── Dashboard View
│   │
│   ├── VelocityMonitor.tsx ──► Canvas API (real-time velocity graph)
│   ├── ResourceStats.tsx ────► Grid display (online nodes, active jobs, pending)
│   ├── ActiveSwarm.tsx ──────► Device list with toggle controls
│   ├── JobGauge.tsx ─────────► SVG circular progress (completed/total)
│   ├── SwarmControls.tsx ────► Play/Pause/Stop buttons ──► SocketEvents.SWARM_SET_STATE
│   └── ThrottleControl.tsx ──► Range slider ─────────────► SocketEvents.SWARM_SET_THROTTLE
│
├── LiveTerminal.tsx ─────────► Scrollable log feed (logs state from useSwarmEngine)
│
└── DeviceConnector.tsx ──────► Modal overlay
    │
    ├── QRCode generation ────► qrcode.react
    ├── QR Scanner ───────────► html5-qrcode
    └── Manual join ──────────► SocketEvents.auth:generate_token
```

### Compute Worker Architecture (`client/src/utils/compute.worker.ts`)

The Web Worker implements a thread pool pattern with WebGPU capability detection:

```
┌─────────────────────────────────────────┐
│       MAIN THREAD (useSwarmEngine)      │
│                                         │
│  globalSocket ←──────────────────────┐  │
│  globalWorker ──► postMessage() ───┐ │  │
└────────────────────────────────────│─┼──┘
                                     │ │
                    ┌────────────────┘ │
                    ▼                  │
┌──────────────────────────────────┐   │
│    COMPUTE WORKER (compute.worker.ts) │
│                                  │   │
│  ThreadPool: Map<id, SubWorker>  │   │
│                                  │   │
│  ┌──────────┐  ┌──────────┐     │   │
│  │ Worker 0 │  │ Worker 1 │ ... │   │
│  │ ┌──────┐ │  │ ┌──────┐ │     │   │
│  │ │CPU   │ │  │ │CPU   │ │     │   │
│  │ │Math  │ │  │ │Math  │ │     │   │
│  │ └──────┘ │  │ └──────┘ │     │   │
│  └──────────┘  └──────────┘     │   │
│                                  │   │
│  SubWorkers created via Blob URL │   │
│  (Vanilla JS, no TypeScript)     │   │
└──────────────────────────────────┘   │
                    │                  │
                    └──── onmessage ───┘
                          (score, result, error)
```

**Worker Thread Pool Formula:**

```typescript
TOTAL_CORES = navigator.hardwareConcurrency || 4;
RESERVED_CORES = TOTAL_CORES > 8 ? 2 : 1;
LOGICAL_CORES = Math.max(1, TOTAL_CORES - RESERVED_CORES);
targetThreadCount = Math.max(1, Math.floor(LOGICAL_CORES * throttleLimit));
```

**WebGPU Support:**

- WGSL shader embedded in worker for matrix multiplication (`MAT_MUL` jobs)
- Graceful fallback to CPU stress (`MATH_STRESS`) on GPU init failure

---

## Server Architecture

### Event Handler Matrix (`server/src/index.ts`)

```
┌──────────────────────────────────────────────────────────────┐
│                    SOCKET.IO SERVER (Port 3000)                │
│                                                                │
│  Auth Middleware                                               │
│  ├── Extract: handshake.auth.token || handshake.query.token   │
│  ├── Extract: handshake.query.persistentId                    │
│  └── Assign: socket.data.swarmId                              │
│                                                                │
│  Connection Handlers                                           │
│  ├── DEVICE_REGISTER ──► DeviceManager.register()             │
│  ├── HEARTBEAT ────────► DeviceManager.heartbeat()            │
│  │                       └── 10s interval from client         │
│  ├── JOB_REQUEST_BATCH ─► JobScheduler.getJobForDevice()     │
│  │   │                        ↓                               │
│  │   └── JOB_BATCH_DISPATCH ──► Array<Job>                   │
│  │                                                            │
│  ├── JOB_COMPLETE ─────► swarmCompletedCounts++              │
│  │                       DeviceManager.updateScore()          │
│  │                                                            │
│  ├── cmd:toggle_device ─► DeviceManager.toggleDevice()       │
│  ├── SWARM_SET_STATE ──► swarmStates Map                     │
│  ├── SWARM_SET_THROTTLE ► swarmThrottles Map                 │
│  │                       └── SWARM_THROTTLE_SYNC broadcast    │
│  ├── BENCHMARK_RESULT ─► DeviceManager.updateScore()         │
│  ├── auth:generate_token ► AuthManager.generateToken()       │
│  └── disconnect ───────► Room cleanup check                   │
│                                                                │
│  Global Broadcast Loop (2s interval)                          │
│  └── broadcastState() ──► SWARM_SNAPSHOT to all rooms         │
└──────────────────────────────────────────────────────────────┘
```

### Manager Classes

#### DeviceManager (`server/src/managers/DeviceManager.ts`)

```typescript
State Container:
├── devices: Map<string, DeviceInfo>
├── OFFLINE_THRESHOLD: 60000ms (1 minute)
└── DELETE_THRESHOLD: 300000ms (5 minutes)

Lifecycle:
register(id, name, caps, swarmId) ──► DeviceInfo
heartbeat(id, data?) ──► Update lastHeartbeat, lastUserInteraction
toggleDevice(id, enabled) ──► status: "ONLINE" | "DISABLED"
updateScore(id, score) ──► opsScore assignment
cleanup() ──► Every 5s: OFFLINE → DELETE progression

Computed Aggregations:
getAvailableResources(swarmId) ──► {totalCores, totalMemory, totalGPUs, onlineCount}
getDevicesBySwarm(swarmId) ──► DeviceInfo[]
```

#### JobScheduler (`server/src/managers/JobScheduler.ts`)

```typescript
State Container:
├── jobQueue: Job[]
└── MAX_QUEUE_SIZE: 500

Job Generation:
setInterval(generateJobs, 2000ms)
├── 50 jobs per batch
├── 70% CPU tasks (MATH_STRESS)
└── 30% GPU tasks (MAT_MUL)

Dispatch Logic:
getJobForDevice(device) ──► Job | null
├── Capability matching: GPU devices → MAT_MUL
├── Fallback: Any available job
└── Exclusion: DISABLED/OFFLINE devices
```

#### AuthManager (`server/src/managers/AuthManager.ts`)

```typescript
State Container:
├── activeTokens: Map<string, {swarmId, expiresAt}>
└── TOKEN_TTL_MS: 900000ms (15 minutes)

Token Flow:
generateToken(swarmId) ──► 6-char alphanumeric code
validateToken(token) ──► swarmId | null
cleanup() ──► Every 30s: Expired token removal
```

---

## State Flow Diagrams

### Device Registration Flow

```
┌──────────┐     DEVICE_REGISTER     ┌──────────┐
│  Client  │ ───────────────────────► │  Server  │
│          │ {name, capabilities}     │          │
│          │                          │ DeviceManager
│          │     DEVICE_READY         │          │
│          │ ◄─────────────────────── │          │
│          │                          │          │
│          │     HEARTBEAT (10s)      │          │
│          │ ═══════════════════════► │          │
│          │ {lastInteraction}        │ DeviceManager
│          │                          │ .heartbeat()
└──────────┘                          └──────────┘
```

### Job Execution Flow

```
┌──────────┐   JOB_REQUEST_BATCH   ┌──────────┐
│  Client  │ ─────────────────────► │  Server  │
│          │                        │          │
│          │   JOB_BATCH_DISPATCH   │          │
│  Worker  │ ◄───────────────────── │ Scheduler│
│  Pool    │ Array<5 Jobs>          │ .getJobForDevice()
│          │                        │          │
│  ┌────┐  │                        │          │
│  │ W0 │  │  EXECUTE_JOB (CPU/GPU) │          │
│  │ W1 │  │ ─────────────────────► │          │
│  │ W2 │  │                        │          │
│  │ W3 │  │    JOB_COMPLETE        │          │
│  └────┘  │ ◄───────────────────── │          │
│          │ {chunkId, result,      │  Counts  │
│          │  durationMs}           │  Update  │
│          │                        │          │
│          │   JOB_REQUEST_BATCH    │          │
│          │ ─────────────────────► │          │
│          │   (Keep pipeline full) │          │
└──────────┘                        └──────────┘
```

### Throttle Propagation Flow

```
┌──────────┐  SWARM_SET_THROTTLE  ┌──────────┐
│  Master  │ ────────────────────► │  Server  │
│  Client  │ {value: 0-100}        │          │
│          │                       │ swarmThrottles
│          │  SWARM_THROTTLE_SYNC  │    Map   │
│          │ ◄───────────────────  │          │
│          │ Broadcast to swarmId  │          │
│          │                       │          │
├──────────┤                       │          │
│ Worker 1 │ ◄───────────────────  │          │
│ Worker 2 │ ◄───────────────────  │          │
│ Worker N │ ◄───────────────────  │          │
└──────────┘                       └──────────┘
         │
         ▼
┌──────────────────────────┐
│ compute.worker.ts        │
│ threadPool scaling:      │
│ LOGICAL_CORES * throttle │
└──────────────────────────┘
```

### Swarm State Machine

```
                    ┌─────────┐
         ┌─────────►│  IDLE   │◄────────┐
         │          └────┬────┘         │
         │               │              │
    STOP │          START│         STOP │
         │               ▼              │
┌────────┴─┐      ┌──────────┐    ┌────┴───┐
│ STOPPED  │◄─────│ RUNNING  │───►│ PAUSED │
└──────────┘ STOP  └────┬─────┘    └────────┘
                        │
                        │ JOB_REQUEST_BATCH
                        ▼
                  ┌─────────────┐
                  │ JobExecution│
                  │   (Worker)  │
                  └─────────────┘
```

---

## Data Models

### Client Types (`client/src/core/types.ts`)

```typescript
SwarmStatus: "IDLE" | "RUNNING" | "PAUSED" | "STOPPED"
DeviceType: "DESKTOP" | "MOBILE" | "COLAB" | "SERVER"
JobType: "MATH_STRESS" | "MAT_MUL" | "TEXT_TOKENIZE"

DeviceCapabilities:
├── cpuCores: number
├── memoryGB: number
├── gpuAvailable: boolean
└── gpuName?: string

DeviceInfo:
├── id: string
├── name: string
├── type: DeviceType
├── status: "ONLINE" | "BUSY" | "OFFLINE" | "DISABLED"
├── capabilities: DeviceCapabilities
├── opsScore: number
├── totalJobsCompleted: number
└── lastHeartbeat: number

SwarmSnapshot:
├── runState: SwarmStatus
├── devices: Record<string, DeviceInfo>
├── stats: {
│   ├── totalJobs: number
│   ├── activeJobs: number
│   ├── pendingJobs: number
│   ├── completedJobs: number
│   ├── globalVelocity: number
│   └── globalThrottle?: number
│}
└── resources: {
    ├── totalCores: number
    ├── totalMemory: number
    ├── totalGPUs: number
    └── onlineCount: number
}
```

### Server Types (`server/src/core/types.ts`)

Extends client types with server-specific fields:

```typescript
DeviceInfo (Extended):
├── lastUserInteraction: number
├── swarmId: string
└── status: + "REGISTERED"

Job:
├── id: string
├── type: JobType
├── complexity: number
└── data: any
```

---

## Persistence & Identity

### LocalStorage Schema

| Key                   | Value                          | Lifecycle      |
| --------------------- | ------------------------------ | -------------- |
| `ostrich_device_id`   | `node-${random(36)}`           | Permanent      |
| `ostrich_device_name` | "Desktop Node" / "Mobile Node" | Auto-generated |

### Identity Resolution

```
First Visit:
  ↓
Generate node-id ──► localStorage.setItem("ostrich_device_id", id)
  ↓
Detect platform ──► localStorage.setItem("ostrich_device_name", name)
  ↓
Subsequent visits: Read from localStorage
```

---

## Build & Runtime Configuration

### Client (`client/vite.config.ts`)

```typescript
Plugins:
├── @vitejs/plugin-react-swc (Fast compilation)
└── @tailwindcss/vite (Tailwind v4)

Server Proxy:
├── /api ────────► http://localhost:3000
└── /socket.io ──► ws://localhost:3000

Resolve Alias:
└── @shared ─────► ../shared
```

### Theme System (`client/src/core/theme.css`)

```css
Design Tokens:
├── --color-brand-orange: #ff7d54
├── --color-brand-peach: #ffb09c
├── --color-surface-white: #fcfcfd
├── --color-surface-muted: #f3f4f6
├── --color-text-main: #1a1a1e
├── --color-text-muted: #6b7280
├── --color-border-soft: rgba(0,0,0,0.05)
├── --shadow-card: 0 20px 40px -12px rgba(0,0,0,0.05)
├── --radius-xl: 24px
└── --radius-2xl: 32px

Components:
└── .soft-card: Elevated card with neumorphic shadow
```

---

## Security Model

### Authentication Flow

```
1. Handshake
   Client ──► Server
   {
     persistentId: localStorage ID,
     token?: invite code
   }

2. Middleware Resolution
   ├── No token / empty ──► Own swarm (Master)
   ├── Valid token ───────► Target swarm (Worker)
   └── Invalid token ─────► Fallback to own swarm

3. Room Assignment
   socket.join(swarmId)

4. Token Lifecycle
   AuthManager.generateToken() ──► 15 min TTL
   AuthManager.validateToken() ──► One-time lookup
```

### Device Capability Isolation

- Workers cannot access DOM
- Workers execute in sandboxed Blob URLs
- No eval() of untrusted code
- WebGPU errors caught and fallback to CPU

---

## Performance Characteristics

### Client-Side

| Metric              | Value                     | Notes                           |
| ------------------- | ------------------------- | ------------------------------- |
| Canvas refresh      | 60 FPS                    | requestAnimationFrame           |
| Socket reconnection | Infinite                  | exponential backoff starting 1s |
| Worker threads      | LOGICAL_CORES \* throttle | Dynamic scaling                 |
| Log retention       | 50 entries                | Circular buffer                 |
| Heartbeat interval  | 10s                       | Prevents OFFLINE status         |

### Server-Side

| Metric           | Value        | Notes                      |
| ---------------- | ------------ | -------------------------- |
| State broadcast  | 2s interval  | Batch updates              |
| Job generation   | 50 jobs / 2s | MAX_QUEUE_SIZE: 500        |
| Device cleanup   | 5s interval  | OFFLINE: 60s, DELETE: 300s |
| Token expiration | 15 minutes   | Auto-cleanup every 30s     |

---

## File Dependency Graph

```
shared/socket/events.ts ◄────┬────┬────┬────┬────┬────┬────┐
                              │    │    │    │    │    │    │
                              ▼    ▼    ▼    ▼    ▼    ▼    ▼
┌─────────────────┐     ┌──────────┐  ┌──────────┐  ┌──────────┐
│ server/index.ts │────►│DeviceManager│ JobScheduler│ AuthManager│
└─────────────────┘     └──────────┘  └──────────┘  └──────────┘
        │                                               ▲
        │                                               │
        │         ┌─────────────────────────────────────┘
        │         │
        ▼         │
┌─────────────────┴──────────┐
│   client/src/hooks/        │
│   useSwarmEngine.ts        │
└──────────┬─────────────────┘
           │
    ┌──────┴──────┬──────────────┐
    ▼             ▼              ▼
┌─────────┐  ┌──────────┐  ┌──────────┐
│  App.tsx │  │features/ │  │ LiveTerminal
│         │  │dashboard/│  │         │
│         │  │         │  │         │
│ ┌─────┐ │  │Velocity │  │         │
│ │Card │ │  │Monitor  │  │         │
│ └─────┘ │  │JobGauge │  │         │
│         │  │...      │  │         │
└─────────┘  └──────────┘  └──────────┘
    │
    ▼
┌──────────────────────────┐
│ features/connection/     │
│ DeviceConnector.tsx      │
│ (QR + Scanner + Manual)  │
└──────────────────────────┘
```

---

## Scaling Considerations

### Horizontal Scaling Path

Current architecture supports single-node server deployment. For horizontal scaling:

1. **Redis Adapter**: Replace in-memory maps with Redis for:
   - `devices` state
   - `swarmStates`
   - `swarmCompletedCounts`
   - `swarmThrottles`

2. **Sticky Sessions**: Ensure Socket.io connections route to same server instance

3. **Job Queue**: Migrate from in-memory array to Redis-backed queue (Bull/BullMQ)

---

## Version & Dependency Lock

### Client Dependencies

- React: ^19.2.0
- Socket.io-client: ^4.8.3
- Tailwind CSS: ^4.1.18
- Vite: ^7.2.4
- @vitejs/plugin-react-swc: ^4.2.2

### Server Dependencies

- Bun runtime (required)
- Socket.io: ^4.8.3
- TypeScript: ^5.1.6

---

## Architectural Invariants

1. **Single Source of Truth**: Server maintains canonical device registry and job queue
2. **Eventual Consistency**: 2s broadcast interval allows for temporary client-side stale data
3. **Graceful Degradation**: WebGPU failure falls back to CPU without user intervention
4. **Idempotent Operations**: Device registration and heartbeat are safely repeatable
5. **Memory Boundaries**: All collections have maximum sizes (jobQueue: 500, logs: 50)
6. **Automatic Cleanup**: No manual intervention required for stale device removal

---

## End of Document

_This architecture document represents the complete system topology as of the current codebase state. All references are exact file paths and line-accurate to the source tree._
