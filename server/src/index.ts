import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { SwarmCoordinator } from "./swarm/SwarmCoordinator";
import { SwarmSocketHandler } from "./socket/SwarmSocketHandler";
import { JobGenerator } from "./swarm/JobGenerator";
console.log("Starting Ostrich Swarm Server...");

const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ["websocket", "polling"],
  maxHttpBufferSize: 1e8,
  pingTimeout: 60000,
});

const swarmCoordinator = new SwarmCoordinator();
new SwarmSocketHandler(io, swarmCoordinator);
new JobGenerator(swarmCoordinator);

// Optional API access to state
app.get("/api/stats", (_, res) => {
  res.json(swarmCoordinator.stateStore.getSnapshot());
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`[Server] Ostrich Swarm Coordinator running on port: ${PORT}`);
});
