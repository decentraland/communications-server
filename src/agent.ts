export class MetricsAgent {
  constructor(private newrelic) {}

  recordTotalConnections(total: number) {
    this.newrelic.recordMetric('Custom/Server/TotalConnections', total)
  }

  incrementConnectionOpen() {
    this.newrelic.incrementMetric('Custom/Server/ConnectionOpen', 1)
  }

  incrementConnectionClosed() {
    this.newrelic.incrementMetric('Custom/Server/ConnectionClosed', 1)
  }

  incrementConnectionBroken() {
    this.newrelic.incrementMetric('Custom/Server/ConnectionBroken', 1)
  }

  incrementBroadcastSkipped() {
    this.newrelic.incrementMetric('Custom/Broadcast/Skipped', 1)
  }

  incrementBroadcastSuccessMessageDelivery() {
    this.newrelic.incrementMetric('Custom/Broadcast/MessageDeliverySuccess', 1)
  }

  incrementBroadcastFailureMessageDelivery() {
    this.newrelic.incrementMetric('Custom/Broadcast/MessageDeliveryFailed', 1)
  }

  recordBroadcastLoopDuration(loopDurationMs: number) {
    this.newrelic.recordMetric('Custom/Broadcast/LoopDuration', loopDurationMs)
  }

  recordBroadcastRatio(totalClients: number, attemptToReach: number) {
    const broadcastRatio = totalClients === 0 ? 1 : attemptToReach / totalClients
    this.newrelic.recordMetric('Custom/Broadcast/Ratio', broadcastRatio)
  }
}
