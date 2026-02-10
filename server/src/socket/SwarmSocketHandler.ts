import { Server, Socket } from "socket.io";
import { SwarmCoordinator } from "../swarm/SwarmCoordinator.js";
import {
  SwarmRunState,
  type RegisterPayload,
  type WorkerResult,
} from "../../../shared/types.js";

export class SwarmSocketHandler {
  // Explicit properties required for erasable syntax
  private io: Server;
  private coordinator: SwarmCoordinator;

  constructor(io: Server, coordinator: SwarmCoordinator) {
    this.io = io;
    this.coordinator = coordinator;

    this.setupStateBroadcasting();
    this.io.on("connection", (s) => this.handleConnection(s));
  }

  private setupStateBroadcasting() {
    this.coordinator.stateStore.on("change", (snapshot) => {
      this.io.emit("swarm:snapshot", snapshot);
    });
  }

  private handleConnection(socket: Socket) {
    const persistentId = socket.handshake.query.persistentId as string;

    if (!persistentId) {
      socket.disconnect(true);
      return;
    }

    socket.on("device:register", (data: RegisterPayload) => {
      this.coordinator.handleRegistration(socket.id, persistentId, data);
      socket.emit("swarm:snapshot", this.coordinator.stateStore.getSnapshot());
    });

    socket.on("cmd:set_run_state", (state: SwarmRunState) => {
      this.coordinator.setRunState(state);
    });

    socket.on("cmd:toggle_device", (data: { id: string; enabled: boolean }) => {
      this.coordinator.toggleDevice(data.id, data.enabled);
    });

    socket.on("job:request_batch", () => {
      const jobs = this.coordinator.getWorkForDevice(persistentId);
      if (jobs.length > 0) {
        socket.emit("job:batch", jobs);
      }
    });

    socket.on("job:complete", (result: WorkerResult) => {
      result.deviceId = persistentId;
      this.coordinator.completeJob(result);
    });

    socket.on("disconnect", () => {
      this.coordinator.handleDisconnect(socket.id);
    });
  }
}
