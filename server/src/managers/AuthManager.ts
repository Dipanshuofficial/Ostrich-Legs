export class AuthManager {
  private activeTokens = new Map<
    string,
    { swarmId: string; expiresAt: number }
  >();
  private readonly TOKEN_TTL_MS = 15 * 60 * 1000; // Increased to 15m for better UX

  constructor() {
    setInterval(() => this.cleanup(), 30000);
  }

  /**
   * Generates a unique 6-digit alphanumeric token for a specific swarm.
   */
  public generateToken(swarmId: string): string {
    const token = Math.random().toString(36).substring(2, 8).toUpperCase();

    this.activeTokens.set(token, {
      swarmId,
      expiresAt: Date.now() + this.TOKEN_TTL_MS,
    });

    return token;
  }

  /**
   * Validates a token and returns the associated swarmId.
   * This is the "Party Join" mechanism.
   */
  public validateToken(token: string): string | null {
    const data = this.activeTokens.get(token);

    if (!data) return null;

    if (Date.now() > data.expiresAt) {
      this.activeTokens.delete(token);
      return null;
    }

    return data.swarmId;
  }

  private cleanup() {
    const now = Date.now();
    for (const [token, data] of this.activeTokens.entries()) {
      if (now > data.expiresAt) this.activeTokens.delete(token);
    }
  }
}
