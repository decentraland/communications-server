proto:
	cd ./packages/protocol/; ${PROTOC} \
		--plugin="protoc-gen-ts=./node_modules/.bin/protoc-gen-ts" \
		--js_out=import_style=commonjs,binary:. \
        --ts_out=. \
       ./src/*.proto

link:
	cd ./packages/server; npm link
	cd ./packages/protocol; npm link
	cd ./packages/client; npm link

devlink: link
	cd ./packages/server; npm link dcl-comm-protocol
	cd ./packages/client; npm link dcl-comm-protocol

install:
	cd ./packages/server; npm i
	cd ./packages/protocol/; npm i
	cd ./packages/client; npm i

build-protocol:
	cd ./packages/protocol/; npm run build

build-server: build-protocol
	cd ./packages/server; npm run build

build-client: build-protocol
	cd ./packages/client; npm run build

build: build-server build-client

test-server:
	cd ./packages/server; npm run test

test: test-server

.PHONY: proto test build
