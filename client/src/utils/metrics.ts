export class MetricsCollector {
  private metrics: Map<string, number[]> = new Map();

  /**
   * Records a new data point for a specific metric.
   * Limits storage to the last 1000 values to prevent memory leaks.
   */
  record(metric: string, value: number) {
    if (!this.metrics.has(metric)) {
      this.metrics.set(metric, []);
    }

    const stream = this.metrics.get(metric)!;
    stream.push(value);

    // Keep last 1000 values (Memory Boundary)
    if (stream.length > 1000) {
      stream.shift();
    }
  }

  /**
   * Calculates the moving average for a metric.
   */
  getAverage(metric: string): number {
    const values = this.metrics.get(metric) || [];
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  }

  /**
   * Returns the most recent value recorded.
   */
  getLatest(metric: string): number {
    const values = this.metrics.get(metric) || [];
    return values.length > 0 ? values[values.length - 1] : 0;
  }
}

// Export a singleton instance for app-wide tracking
export const metrics = new MetricsCollector();
