import { type JoinCode } from "../../../shared/types";
import { randomBytes } from "crypto";

export class JoinCodeManager {
  private codes = new Map<string, JoinCode>();
  private readonly DEFAULT_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.startCleanup();
  }

  generateCode(options?: {
    expiresIn?: number;
    maxUses?: number;
    createdBy?: string;
    metadata?: JoinCode["metadata"];
  }): string {
    // Generate a 6-character alphanumeric code
    const code = this.generateRandomCode();
    
    const joinCode: JoinCode = {
      code,
      expiresAt: Date.now() + (options?.expiresIn || this.DEFAULT_EXPIRY),
      maxUses: options?.maxUses || 100,
      usedCount: 0,
      createdBy: options?.createdBy || "system",
      metadata: options?.metadata
    };
    
    this.codes.set(code, joinCode);
    return code;
  }

  validateCode(code: string): { valid: boolean; error?: string; joinCode?: JoinCode } {
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

  useCode(code: string): boolean {
    const result = this.validateCode(code);
    
    if (!result.valid || !result.joinCode) {
      return false;
    }
    
    result.joinCode.usedCount++;
    
    // Auto-delete if max uses reached
    if (result.joinCode.usedCount >= result.joinCode.maxUses) {
      this.codes.delete(code);
    }
    
    return true;
  }

  revokeCode(code: string): boolean {
    return this.codes.delete(code.toUpperCase());
  }

  getCode(code: string): JoinCode | undefined {
    return this.codes.get(code.toUpperCase());
  }

  getAllCodes(): JoinCode[] {
    return Array.from(this.codes.values());
  }

  getActiveCodes(): JoinCode[] {
    return this.getAllCodes().filter(code => 
      Date.now() < code.expiresAt && 
      code.usedCount < code.maxUses
    );
  }

  getStats() {
    const all = this.getAllCodes();
    return {
      totalCodes: all.length,
      activeCodes: all.filter(c => Date.now() < c.expiresAt && c.usedCount < c.maxUses).length,
      expiredCodes: all.filter(c => Date.now() >= c.expiresAt).length,
      depletedCodes: all.filter(c => c.usedCount >= c.maxUses).length,
      totalUses: all.reduce((sum, c) => sum + c.usedCount, 0)
    };
  }

  private generateRandomCode(): string {
    // Generate 6-character alphanumeric code
    return randomBytes(4)
      .toString("base64")
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 6)
      .toUpperCase();
  }

  private startCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;
      
      for (const [code, joinCode] of this.codes.entries()) {
        if (now > joinCode.expiresAt) {
          this.codes.delete(code);
          cleaned++;
        }
      }
      
      if (cleaned > 0) {
        console.log(`[JoinCodeManager] Cleaned up ${cleaned} expired codes`);
      }
    }, this.CLEANUP_INTERVAL);
  }

  // Generate a URL for mobile/Colab devices
  generateConnectionUrl(code: string, baseUrl: string): string {
    return `${baseUrl}/join/${code}`;
  }

  // Generate a QR code data URL (simplified - actual QR generation would be on client)
  generateQRData(code: string, baseUrl: string): { url: string; code: string } {
    const url = this.generateConnectionUrl(code, baseUrl);
    return { url, code };
  }
}
