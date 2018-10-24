import * as cluster from 'cluster'
import { V2, startWalkingBot } from './bot'

const workers = 1
const botsPerWorker = 5

function startRandomWalkingBot() {
  const checkpoints = []

  for (let i = 0; i < 6; ++i) {
    const x = (Math.random() * 2 - 1) * 2
    const z = (Math.random() * 2 - 1) * 2

    const p = new V2(x, z)
    checkpoints.push(p)
  }

  for (let i = checkpoints.length - 2; i >= 0; --i) {
    checkpoints.push(checkpoints[i])
  }

  const path = {
    checkpoints: checkpoints,
    durationMs: 100000
  }

  startWalkingBot({ path, speakFreqMs: 1000 })
}

function dispatch(workerIndex) {
  for (let i = 0; i < botsPerWorker; ++i) {
    startRandomWalkingBot()
  }
}

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`)

  for (let i = 0; i < workers; i++) {
    cluster.fork()
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`)
  })
} else {
  const workerIndex = cluster.worker.id - 1

  try {
    dispatch(workerIndex)
    console.log(`Worker ${workerIndex}, pid: ${process.pid}`)
  } catch (err) {
    console.error('ERROR', err)
  }
}
