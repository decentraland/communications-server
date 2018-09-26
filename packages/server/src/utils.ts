import * as WebSocket from 'ws'

const MAX_PARCEL_X = 3000
const MIN_PARCEL_X = -3000
const MAX_PARCEL_Y = 3000
const MIN_PARCEL_Y = -3000

export class V2 {
  constructor(public x: number, public y: number) {}
}

export class EnrichedWebSocket extends WebSocket {
  public position: V2
  public lastPositionUpdate: number
  public id: string
}

export class CommunicationArea {
  private vMin: V2
  private vMax: V2

  constructor(center: V2, radius: number) {
    this.vMin = new V2(Math.max(MIN_PARCEL_X, center.x - radius), Math.max(MIN_PARCEL_Y, center.y - radius))
    this.vMax = new V2(Math.min(MAX_PARCEL_X, center.x + radius), Math.min(MAX_PARCEL_Y, center.y + radius))
  }

  public contains(ws: EnrichedWebSocket) {
    const vMin = this.vMin
    const vMax = this.vMax
    const p = ws.position
    const contains = p && p.x >= vMin.x && p.x <= vMax.x && p.y >= vMin.y && p.y <= vMax.y
    return contains
  }
}
