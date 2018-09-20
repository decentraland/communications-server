proto:
	 ${PROTOC} \
		--plugin="protoc-gen-ts=./node_modules/.bin/protoc-gen-ts" \
		--js_out=import_style=commonjs,binary:. \
        --ts_out=. \
       ./proto/*.proto

test:
	npm run test

.PHONY: proto test
