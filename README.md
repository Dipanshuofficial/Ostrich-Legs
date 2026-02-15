# Ostrich-Legs

A distributed computing platform that transforms browsers into a collaborative compute swarm. Think SETI@home, but your "supercomputer" is a mesh of phones, laptops, and tablets orchestrated in real-time via WebSockets.

![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Bun](https://img.shields.io/badge/Bun-Runtime-black?logo=bun)
![Socket.io](https://img.shields.io/badge/Socket.io-4.8-white?logo=socket.io)
![Tailwind](https://img.shields.io/badge/Tailwind-4.1-06B6D4?logo=tailwindcss)

## What It Does

Ostrich-Legs enables any device with a browser to join a compute swarm and contribute processing power toward distributed workloads:

- **Zero-Install Workers**: Devices join via QR code, invite links, or manual token entry
- **Weighted Job Distribution**: Scheduler allocates jobs proportional to device capability (CPU cores + GPU availability + benchmark scores)
- **Real-Time Control**: Live throttle adjustment (0-100%), pause/resume/stop states, per-device enable/disable
- **WebGPU Support**: Matrix multiplication kernels with graceful CPU fallback
- **Persistent Identity**: Devices maintain stable IDs across sessions via localStorage

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     DISTRIBUTED COMPUTE SWARM                     │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   Desktop    │  │   Mobile     │  │   Tablet     │           │
│  │   (Worker)   │  │   (Worker)   │  │   (Master)   │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                 │                    │
│         └─────────────────┴─────────────────┘                    │
│                           │                                      │
│                    WebSocket (Socket.io)                         │
│                           │                                      │
│              ┌────────────┴────────────┐                        │
│              │      Bun Server         │                        │
│              │  ┌─────────────────┐    │                        │
│              │  │ DeviceManager   │    │  - Registration       │
│              │  │ JobScheduler    │    │  - Weighted dispatch  │
│              │  │ AuthManager     │    │  - Token lifecycle    │
│              │  └─────────────────┘    │                        │
│              └─────────────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

### Stack

| Layer         | Technology            | Purpose                                      |
| ------------- | --------------------- | -------------------------------------------- |
| **Frontend**  | React 19 + Vite + SWC | Component-based UI with fast HMR             |
| **State**     | Zustand               | Lightweight global state management          |
| **Styling**   | Tailwind CSS v4       | Utility-first design system                  |
| **Real-Time** | Socket.io             | Bidirectional event streaming with rooms     |
| **Backend**   | Bun + Socket.io       | High-performance runtime, 2s broadcast loops |
| **Compute**   | Web Workers + WebGPU  | Browser-based parallel processing            |
| **Types**     | Shared `/shared`      | Compile-time API contracts across boundaries |

## Quick Start

Prerequisites: [Bun](https://bun.sh) runtime

```bash
# 1. Clone and enter
cd ostrich-legs

# 2. Start the server
cd server && bun run dev

# 3. In another terminal, start the client
cd client && bun run dev

# 4. Open http://localhost:5173
```

The first browser becomes the swarm master. Click the share icon to generate QR codes for other devices to join.

## Key Design Decisions

### Type-Safe Socket Contracts

All client-server communication uses strictly typed contracts in `/shared/socket/`:

```typescript
// shared/socket/events.ts - Single source of truth
SocketEvents.DEVICE_REGISTER; // "device:register"
SocketEvents.JOB_BATCH_DISPATCH; // "job:batch"
SocketEvents.SWARM_THROTTLE_SYNC; // "swarm:throttle_sync"
```

This eliminates runtime errors at the network boundary through TypeScript's compile-time checking.

### Weighted Job Scheduling

The scheduler calculates device weights from real-time capability profiles:

```typescript
// server/src/managers/JobScheduler.ts:34-38
weight = (cpuCores × 10) + (gpuAvailable ? 50 : 0) + min(opsScore / 1000, 100)
```

Jobs dispatch proportionally by weight with dynamic quota adjustment. The scheduler recalculates weights every 10 seconds based on live benchmark scores, ensuring optimal distribution as device performance changes.

### Dynamic Worker Thread Pool

The compute layer spawns threads based on device capabilities and global throttle:

```typescript
// client/src/utils/compute.worker.ts:5-8
TOTAL_CORES = navigator.hardwareConcurrency || 4;
RESERVED_CORES = TOTAL_CORES > 8 ? 2 : 1;
LOGICAL_CORES = Math.max(1, TOTAL_CORES - RESERVED_CORES);
targetThreads = Math.floor(LOGICAL_CORES × throttlePercent);
```

Workers execute in sandboxed Blob URLs with automatic WebGPU→CPU fallback. The pool scales up/down dynamically as throttle changes.

### Hierarchical State Management

```
Zustand Store (swarmStore.ts)
    │
    ├── snapshot: SwarmSnapshot    ← Server broadcasts every 2s
    ├── logs: string[]             ← Circular buffer (last 50)
    └── isConnected: boolean
    │
SwarmContext.tsx
    │
    ├── useSocket()                ← Socket.io lifecycle
    ├── useWorker()                ← Web Worker orchestration
    └── Actions exposed to UI
```

This separation keeps socket/worker logic out of React render cycles while providing reactive UI updates.

### Auth Middleware Flow

```typescript
// server/src/index.ts:45-70
if (no_token_or_empty) {
  socket.data.swarmId = persistentId; // Master mode
} else if (valid_token) {
  socket.data.swarmId = targetSwarm; // Worker joins existing
} else {
  reject("JOIN_CODE_INVALID"); // Expired/invalid
}
```

Tokens have 15-minute TTL, rate-limited to 5/minute per swarm. No user accounts required—just stable device identities.

### Persistent Identity

Devices maintain stable identities across sessions:

```
ostrich_device_id     → node-${random(36)}     (permanent)
ostrich_device_name   → "Desktop Node" etc.    (platform detection)
```

This enables reliable reconnection, historical tracking, and automatic re-registration without server-side accounts.

## Project Structure

```
ostrich-legs/
├── client/                    # React 19 frontend
│   ├── src/
│   │   ├── features/         # Domain modules
│   │   │   ├── connection/   # QR/invite joining
│   │   │   ├── dashboard/    # Metrics & controls
│   │   │   └── terminal/     # Live logging
│   │   ├── hooks/            # Custom hooks
│   │   │   ├── useSocket.ts  # Socket.io lifecycle
│   │   │   ├── useWorker.ts  # Web Worker bridge
│   │   │   └── usePersistentIdentity.ts
│   │   ├── core/             # State & types
│   │   │   ├── swarmStore.ts # Zustand store
│   │   │   ├── SocketManager.ts
│   │   │   └── types.ts
│   │   └── utils/            # Web Workers
│   │       └── compute.worker.ts
│   └── package.json
├── server/                    # Bun backend
│   ├── src/
│   │   ├── managers/         # Business logic
│   │   │   ├── DeviceManager.ts    # Lifecycle & health
│   │   │   ├── JobScheduler.ts     # Weighted dispatch
│   │   │   └── AuthManager.ts      # Token generation
│   │   ├── core/types.ts
│   │   └── index.ts          # Socket.io server
│   └── package.json
└── shared/                    # Cross-boundary contracts
    └── socket/
        ├── events.ts          # Event name registry
        ├── payloads.ts        # Request/response types
        └── states.ts          # State enumerations
```

## Use Cases

- **Distributed Computation**: Farm out math-heavy workloads (matrix ops, simulations) to idle devices
- **Load Testing**: Stress-test with real heterogeneous hardware and network conditions
- **Edge Computing POC**: Validate compute-offloading before cloud deployment
- **Educational**: Demonstrate distributed systems, Web Workers, and Socket.io patterns

## Performance Characteristics

| Metric               | Value                           | Implementation                    |
| -------------------- | ------------------------------- | --------------------------------- |
| State broadcast      | 2s interval                     | `setInterval` with room filtering |
| Job generation       | 100 jobs/sec                    | Capped at 5,000 queue depth       |
| Weight recalculation | 10s interval                    | Dynamic based on `opsScore`       |
| Device heartbeat     | Client 10s / Server 60s timeout | Graceful degradation              |
| Worker threads       | `LOGICAL_CORES × throttle`      | Dynamic Blob URL workers          |
| Log retention        | 50 entries                      | Circular buffer in Zustand        |
| Token TTL            | 15 minutes                      | Rate-limited to 5/min             |

## Trade-offs & Limitations

**In-Memory State**: Device registry and job queues use Maps. Horizontal scaling would require Redis for sticky sessions and state synchronization.

**No Persistence**: Job results are ephemeral—acknowledged then discarded. Designed for compute workloads, not data archival.

**Browser Constraints**: WebGPU support varies (Chrome/Edge best). Automatic CPU fallback adds ~20% latency but ensures universal compatibility.

**Single Server**: Current architecture assumes single-node deployment. Multi-server would need Redis adapter and load balancer with sticky sessions.

## License

MIT
