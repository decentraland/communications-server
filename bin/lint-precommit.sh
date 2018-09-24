#!/bin/bash

node_modules/.bin/prettier --write $* > lint.log
git add $* >> lint.log
