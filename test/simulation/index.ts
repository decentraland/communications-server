import * as program from 'commander'
import * as cluster from 'cluster'
import { startClient } from './client'

program
  .option('-p, --port [port]', 'Port', '5000')
  .option('-h, --host [host]', 'host', 'localhost')
  .parse(process.argv)

const host = program.host
const port = program.port

const workers = 5

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`)

  // Fork workers.
  for (let i = 0; i < workers; i++) {
    cluster.fork()
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`)
  })
} else {
  startClient(host, port)

  console.log(`Worker ${process.pid} started`)
}
