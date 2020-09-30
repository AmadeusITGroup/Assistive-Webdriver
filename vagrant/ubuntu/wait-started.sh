#!/bin/bash

echo "Waiting for the VM to be fully started!"
while ! (echo -n "" | nc -N 127.0.0.1 4449 ) ; do
  sleep 1
done
echo "Ready!"
