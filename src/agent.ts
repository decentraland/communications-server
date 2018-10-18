import * as newrelic from 'newrelic'

export function recordTotalConnections(total: number) {
  newrelic.recordMetric('Custom/Server/TotalConnections', total)
}

export function incrementConnectionOpen() {
  newrelic.incrementMetric('Custom/Server/ConnectionOpen', 1)
}

export function incrementConnectionClosed() {
  newrelic.incrementMetric('Custom/Server/ConnectionClosed', 1)
}

export function incrementConnectionBroken() {
  newrelic.incrementMetric('Custom/Server/ConnectionBroken', 1)
}

export function incrementBroadcastSkipped() {
  newrelic.incrementMetric('Custom/Broadcast/Skipped', 1)
}

export function incrementBroadcastSuccessMessageDelivery() {
  newrelic.incrementMetric('Custom/Broadcast/MessageDeliverySuccess', 1)
}

export function incrementBroadcastFailureMessageDelivery() {
  newrelic.incrementMetric('Custom/Broadcast/MessageDeliveryFailed', 1)
}

export function recordBroadcastLoopDuration(loopDurationMs: number) {
  newrelic.recordMetric('Custom/Broadcast/LoopDuration', loopDurationMs)
}

export function recordBroadcastRatio(totalClients: number, attemptToReach: number) {
  const broadcastRatio = totalClients === 0 ? 1 : attemptToReach / totalClients
  newrelic.recordMetric('Custom/Broadcast/Ratio', broadcastRatio)
}
