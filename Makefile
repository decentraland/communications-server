# to take advantage of the circleci cache let's only install if node_modules doesn't exist
installci:
	if [ ! -d "node_modules" ]; then npm ci; fi

build:
	npm run build
	cp src/worldcomm_pb* dist

link:
	$(LINK_PREFIX) npm link

test:
	NODE_ENV=test node_modules/.bin/mocha -r ts-node/register -r source-map-support/register test/**/*.test.ts

testci: build link
	npm link dcl-comm-server
	NODE_ENV=test node_modules/.bin/mocha -r ts-node/register -r source-map-support/register test/**/*.test.ts

lint:
	./node_modules/.bin/tslint

start-dev: build
	NODE_ENV=dev AUTHORIZATION_ENABLED=no node dist/main.js


.PHONY: installci build test lint link
