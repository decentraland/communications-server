proto:
	cd ./packages/protocol/; ${PROTOC} \
		--plugin="protoc-gen-ts=./node_modules/.bin/protoc-gen-ts" \
		--js_out=import_style=commonjs,binary:. \
        --ts_out=. \
       ./src/*.proto

clean:
	rm -r ./packages/server/node_modules ./packages/protocol/node_modules ./packages/client/node_modules node_modules

link:
	cd ./packages/server; npm link
	cd ./packages/protocol; npm link
	cd ./packages/client; npm link

devlink: link
	cd ./packages/server; npm link dcl-comm-protocol
	cd ./packages/client; npm link dcl-comm-protocol
	npm link dcl-comm-protocol
	npm link dcl-comm-server
	npm link dcl-comm-client

install:
	npm i
	cd ./packages/server; npm i
	cd ./packages/protocol/; npm i
	cd ./packages/client; npm i

build-protocol:
	cd ./packages/protocol/; npm run build

build-server: build-protocol
	cd ./packages/server; npm run build

build-client: build-protocol
	cd ./packages/client; npm run build

build: build-server build-client build-protocol

test: build
	node_modules/.bin/mocha -r ts-node/register -r source-map-support/register test/**/*.test.ts

lint:
	./node_modules/.bin/tslint -p packages/client/ || echo "fail"
	./node_modules/.bin/tslint -p packages/server/ || echo  "fail"
	./node_modules/.bin/tslint -p packages/protocol/ || echo "fail"
	./node_modules/.bin/tslint -p . test/**/*.ts || echo "fail"

.PHONY: proto test build
