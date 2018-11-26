
if echo "$CIRCLE_BRANCH" | grep "^master$"; then
  echo "OK"
elif echo "$CIRCLE_TAG" | grep "^[0-9]\+\.[0-9]\+\.[0-9]\+$"; then
  echo "OK2"
  else
      echo "Not a release, skipping push"
    fi
