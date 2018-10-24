import * as uuid from 'uuid/v4'
import * as WebSocket from 'ws'
import { ChatMessage, ProfileMessage, PositionMessage, MessageType } from 'dcl-comm-protocol'
import { getCommServerUrl } from './serverData'
import { setInterval } from 'timers'
import { getRndLine } from '../utils/chatHelpers'

export class V2 {
  constructor(public x: number, public z: number) {}

  length() {
    return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.z, 2))
  }

  minus(a: V2) {
    return new V2(this.x - a.x, this.z - a.z)
  }

  sum(a: V2) {
    return new V2(this.x + a.x, this.z + a.z)
  }

  scalarProd(n: number) {
    return new V2(this.x * n, this.z * n)
  }
}

function direction(a: V2, b: V2) {
  const v = a.minus(b)
  const len = v.length()
  v.x = v.x / len
  v.z = v.z / len
  return v
}

const AVATARS = ['fox', 'round robot', 'square robot']

function getRandomAvatar() {
  const i = Math.floor(Math.random() * AVATARS.length)
  const avatar = AVATARS[i]
  console.log(i, avatar)
  return avatar
}

export enum SocketReadyState {
  CONNECTING,
  OPEN,
  CLOSING,
  CLOSED
}

type BotOptions = {
  avatar?: string
  speakFreqMs: number
}

type Path = {
  checkpoints: V2[]
  durationMs: number
}

type StandingBotOptions = BotOptions & {
  p: V2
}

type WalkingBotOptions = BotOptions & {
  path: Path
}

type Connection = {
  ws: WebSocket
  x: number
  y: number
}

class Bot {
  public connections: Connection[] = []
  public p: V2 | null = null
  public positionInterval: any = null
  public profileInterval: any = null
  public chatInterval: any = null

  constructor(public peerId: string) {}

  public broadcastMessage(msg: any) {
    if (this.p) {
      const parcelX = Math.floor(this.p.x)
      const parcelY = Math.floor(this.p.z)
      let connectedToParcel = false
      for (let connection of this.connections) {
        connectedToParcel = parcelX === connection.x && parcelY === connection.y
        if (connectedToParcel) {
          break
        }
      }

      if (!connectedToParcel) {
        console.log(`CONNECTING TO ${parcelX} ${parcelY}`)
        const url = getCommServerUrl(parcelX, parcelY)

        const ws = new WebSocket(url)
        const connection = { x: parcelX, y: parcelY, ws }
        this.connections.push(connection)
      }
    }

    const bytes = msg.serializeBinary()

    for (let connection of this.connections) {
      const ws = connection.ws
      if (ws.readyState === SocketReadyState.OPEN) {
        ws.send(bytes)
      }
    }
  }

  public stop() {
    clearInterval(this.positionInterval)
    clearInterval(this.profileInterval)
    if (this.chatInterval) {
      clearInterval(this.chatInterval)
    }
  }
}

function startBot({ speakFreqMs, avatar }: BotOptions): Bot {
  avatar = avatar || getRandomAvatar()
  const peerId = uuid()
  const bot = new Bot(peerId)
  bot.profileInterval = setInterval(() => {
    if (bot.p) {
      const msg = new ProfileMessage()
      msg.setType(MessageType.PROFILE)
      msg.setTime(new Date().getTime())
      msg.setPositionX(bot.p.x)
      msg.setPositionZ(bot.p.z)
      msg.setPeerId(peerId)
      msg.setAvatarType(avatar)
      msg.setDisplayName(peerId)
      bot.broadcastMessage(msg)
    }
  }, 1000)

  if (speakFreqMs > 0) {
    bot.chatInterval = setInterval(() => {
      if (bot.p) {
        const msg = new ChatMessage()
        msg.setType(MessageType.CHAT)
        msg.setTime(new Date().getTime())
        msg.setMessageId(uuid())
        msg.setPositionX(bot.p.x)
        msg.setPositionZ(bot.p.z)
        msg.setPeerId(peerId)
        msg.setText(getRndLine())
        bot.broadcastMessage(msg)
      }
    }, speakFreqMs)
  }

  return bot
}

export function startStandingBot(opts: StandingBotOptions): Bot {
  const bot = startBot(opts)
  const { p } = opts
  bot.p = p
  bot.positionInterval = setInterval(() => {
    const msg = new PositionMessage()
    msg.setType(MessageType.POSITION)
    msg.setTime(new Date().getTime())
    msg.setPositionX(p.x)
    msg.setPositionY(1.6)
    msg.setPositionZ(p.z)
    msg.setRotationX(0)
    msg.setRotationY(0)
    msg.setRotationZ(0)
    msg.setRotationW(1)
    msg.setPeerId(bot.peerId)
    bot.broadcastMessage(msg)
  }, 100)

  return bot
}

export function startWalkingBot(opts: WalkingBotOptions): Bot {
  const { durationMs, checkpoints } = opts.path
  if (checkpoints.length < 2) {
    throw new Error('invalid path, need at least two checkpoints')
  }

  const bot = startBot(opts)

  let totalDistance = 0
  for (let i = 1; i < checkpoints.length; ++i) {
    totalDistance += checkpoints[i].minus(checkpoints[i - 1]).length()
  }

  const d = (totalDistance / durationMs) * 100

  bot.p = checkpoints[0]
  let destCheckpointIndex = 1
  let stepsUntilNextCheckpoint = Math.floor(
    checkpoints[destCheckpointIndex - 1].minus(checkpoints[destCheckpointIndex]).length() / d
  )
  let deltaCheckpoint = direction(checkpoints[destCheckpointIndex], checkpoints[destCheckpointIndex - 1]).scalarProd(d)
  bot.positionInterval = setInterval(() => {
    bot.p = bot.p.sum(deltaCheckpoint)
    if (stepsUntilNextCheckpoint === 0) {
      if (destCheckpointIndex === checkpoints.length - 1) {
        bot.p = checkpoints[0]
        destCheckpointIndex = 1
      } else {
        ++destCheckpointIndex
      }
      deltaCheckpoint = direction(checkpoints[destCheckpointIndex], checkpoints[destCheckpointIndex - 1]).scalarProd(d)
      stepsUntilNextCheckpoint = Math.floor(
        checkpoints[destCheckpointIndex - 1].minus(checkpoints[destCheckpointIndex]).length() / d
      )
    } else {
      --stepsUntilNextCheckpoint
    }

    const msg = new PositionMessage()
    msg.setType(MessageType.POSITION)
    msg.setTime(new Date().getTime())
    msg.setPositionX(bot.p.x)
    msg.setPositionY(1.6)
    msg.setPositionZ(bot.p.z)
    msg.setRotationX(0)
    msg.setRotationY(0)
    msg.setRotationZ(0)
    msg.setRotationW(1)
    msg.setPeerId(bot.peerId)
    bot.broadcastMessage(msg)
  }, 100)

  return bot
}
