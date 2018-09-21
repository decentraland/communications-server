# How to work on this project

`make install` to install the dependencies for the packages
`make devlink` to link them between each other
`make build` to build the packages

# Protobuffer

If you intend to change the message format you will need to install the protoc compiler:
https://github.com/protocolbuffers/protobuf#protocol-compiler-installation

Then use `make proto PROTOC=<protc executable>`
