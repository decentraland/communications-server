export function getCommServerUrl(x: number, z: number) {
  const value = x + z
  const c = value - Math.floor(value / 10) * 10
  const port = 9090 // + c

  // return 'ws://world-comm.decentraland.today:9090/connector'
  return 'ws://world-comm.decentraland.zone:9090/connector'
  // return `ws://localhost:${port}/connector`
}
