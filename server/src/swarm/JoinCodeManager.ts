import { type JoinCode } from "../../../shared/types.js";
import { randomBytes } from "crypto";

export class JoinCodeManager {
  private codes = new Map<string, JoinCode>();
  private DEFAULT_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  private CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.startCleanup();
  }

  public generateCode(options?: {
    expiresIn?: number;
    maxUses?: number;
    createdBy?: string;
    metadata?: JoinCode["metadata"];
  }): string {
    const code = this.generateRandomCode();

    const joinCode: JoinCode = {
      code,
      expiresAt: Date.now() + (options?.expiresIn || this.DEFAULT_EXPIRY),
      maxUses: options?.maxUses || 100,
      usedCount: 0,
      createdBy: options?.createdBy || "system",
      metadata: options?.metadata,
    };

    this.codes.set(code, joinCode);
    return code;
  }

  public validateCode(code: string): {
    valid: boolean;
    error?: string;
    joinCode?: JoinCode;
  } {
    const joinCode = this.codes.get(code.toUpperCase());

    if (!joinCode) {
      return { valid: false, error: "Invalid join code" };
    }

    if (Date.now() > joinCode.expiresAt) {
      this.codes.delete(code);
      return { valid: false, error: "Join code has expired" };
    }

    if (joinCode.usedCount >= joinCode.maxUses) {
      return { valid: false, error: "Join code has reached maximum uses" };
    }

    return { valid: true, joinCode };
  }

  public useCode(code: string): boolean {
    const result = this.validateCode(code);

    if (!result.valid || !result.joinCode) {
      return false;
    }

    result.joinCode.usedCount++;

    if (result.joinCode.usedCount >= result.joinCode.maxUses) {
      this.codes.delete(code);
    }

    return true;
  }

  private generateRandomCode(): string {
    return randomBytes(4)
      .toString("base64")
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 6)
      .toUpperCase();
  }

  private startCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [code, joinCode] of this.codes.entries()) {
        if (now > joinCode.expiresAt) {
          this.codes.delete(code);
        }
      }
    }, this.CLEANUP_INTERVAL);
  }
}
