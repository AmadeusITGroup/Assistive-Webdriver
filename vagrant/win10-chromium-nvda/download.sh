#!/bin/bash

set -e

COMPONENTS_FOLDER="$(cd ../../components && pwd)"
COMPONENTS_TO_INCLUDE="assistive-playwright-server text-to-socket-engine tcp-web-listener"

function checkDLL() {
  local DLL=0
  for i in "$COMPONENTS_FOLDER"/text-to-socket-engine/TextToSocketEngine*.dll ; do if [ -f "$i" ]; then DLL=$((DLL+1)); fi; done
  if [ "$DLL" == "0" ] ; then
    echo 'Missing TextToSocketEngine*.dll in node_modules/text-to-socket-engine'
    echo 'Please make sure you have built text-to-socket-engine and have run "yarn install"'
    return 1
  fi
}

cd software

for component in $COMPONENTS_TO_INCLUDE ; do
  if ! [ -f "$component.tgz" ] ; then
    echo "Creating $component.tgz..."
    if [ "$component" == "text-to-socket-engine" ]; then
      checkDLL
    fi
    ( cd "$COMPONENTS_FOLDER/$component" && yarn pack )
    mv "$COMPONENTS_FOLDER/$component/package.tgz" "$component.tgz"
  else
    echo "OK: $component.tgz"
  fi
done

aria2c -V --auto-file-renaming false -x 5 -i ../urls.txt

if ! [ -f "MSEdge - Win10.box" ]; then
    unzip "MSEdge.Win10.Vagrant.zip"
fi
