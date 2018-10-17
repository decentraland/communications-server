# How to work on this project

- `npm i` to install the dependencies
- `npm link` to link the project
- `npm build` to build
- `make test` to run the tests

# Protobuffer

If you intend to change the message format you will need to install the protoc compiler:
https://github.com/protocolbuffers/protobuf#protocol-compiler-installation

Then use `make proto PROTOC=<protc executable>`
