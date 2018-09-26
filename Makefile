LINK_PREFIX ?= ""

proto:
	cd ./packages/protocol/; ${PROTOC} \
		--plugin="protoc-gen-ts=./node_modules/ts-protoc-gen/bin/protoc-gen-ts" \
		--js_out=import_style=commonjs,binary:. \
        --ts_out=. \
       ./src/*.proto

clean:
	rm -r ./packages/server/node_modules ./packages/protocol/node_modules ./packages/client/node_modules node_modules

link:
	cd ./packages/server; $(GLOBAL_LINK_PREFIX) npm link
	cd ./packages/protocol; $(GLOBAL_LINK_PREFIX) npm link
	cd ./packages/client; $(GLOBAL_LINK_PREFIX) npm link

devlink: link
	cd ./packages/server; npm link dcl-comm-protocol
	cd ./packages/client; npm link dcl-comm-protocol
	npm link dcl-comm-protocol
	npm link dcl-comm-server
	npm link dcl-comm-client

# to take advantage of the circleci cache let's only install if node_modules doesn't exist
installci:
	if [ ! -d "node_modules" ]; then npm ci; fi
	if [ ! -d "./packages/server/node_modules" ]; then cd ./packages/server/; npm ci; fi
	if [ ! -d "./packages/client/node_modules" ]; then cd ./packages/client/; npm ci; fi
	if [ ! -d "./packages/protocol/node_modules" ]; then cd ./packages/protocol/; npm ci; fi

install:
	npm i
	cd ./packages/server; npm i
	cd ./packages/protocol/; npm i
	cd ./packages/client; npm i

devinstall: install devlink

build-protocol:
	cd ./packages/protocol/; npm run build

build-server: build-protocol
	cd ./packages/server; npm run build

build-client: build-protocol
	cd ./packages/client; npm run build

build: build-server build-client build-protocol

test: build
	NODE_ENV=test node_modules/.bin/mocha -r ts-node/register -r source-map-support/register test/**/*.test.ts

lint:
	./node_modules/.bin/tslint -p packages/client/ || echo "fail"
	./node_modules/.bin/tslint -p packages/server/ || echo "fail"
	./node_modules/.bin/tslint -p packages/protocol/ || echo "fail"
	./node_modules/.bin/tslint -p . test/**/*.ts || echo "fail"

lintci:
	./node_modules/.bin/tslint -p packages/client/
	./node_modules/.bin/tslint -p packages/server/
	./node_modules/.bin/tslint -p packages/protocol/
	./node_modules/.bin/tslint -p . test/**/*.ts

.PHONY: proto clean link test build lint lintci
