import * as newrelic from 'newrelic'

export function incrementSocketConnection() {
  newrelic.incrementMetric('Custom/Socket/Connection', 1)
}

export function incrementSocketClosed() {
  newrelic.incrementMetric('Custom/Socket/Closed', 1)
}

export function incrementBroadcastSkip() {
  newrelic.incrementMetric('Custom/Broadcast/Skip', 1)
}

export function incrementBroadcastSuccessMessageDelivery() {
  newrelic.incrementMetric('Custom/Broadcast/SuccessMessageDelivery', 1)
}

export function incrementBroadcastFailureMessageDelivery() {
  newrelic.incrementMetric('Custom/Broadcast/FailureMessageDelivery', 1)
}

export function incrementBroadcastLoopDuration(loopDurationMs: number) {
  newrelic.recordMetric('Custom/Broadcast/Loop', loopDurationMs)
}
export function recordBroadcastLoopDuration(loopDurationMs: number) {
  newrelic.recordMetric('Custom/Broadcast/Loop', loopDurationMs)
}

export function recordBroadcastRation(totalClients: number, attemptToReach: number) {
  const broadcastRatio = totalClients === 0 ? 1 : attemptToReach / totalClients
  newrelic.recordMetric('Custom/Broadcast/Ratio', broadcastRatio)
}
