#!/bin/bash

set -e

start() {
  node dist/main.js &
  LEN=${#pids[*]}
  pids[${LEN}]=$!
}

make build

PORT=9090 start
PORT=9091 start
PORT=9092 start
PORT=9093 start
PORT=9094 start
PORT=9095 start
PORT=9096 start
PORT=9097 start
PORT=9098 start
PORT=9099 start

echo "kill -kill ${pids[*]}" > stop.sh
chmod +x stop.sh
