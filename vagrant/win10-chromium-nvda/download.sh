#!/bin/bash

set -e

function buildTgz() {
  local DLL=0
  for i in node_modules/text-to-socket-engine/TextToSocketEngine*.dll ; do if [ -f "$i" ]; then DLL=$((DLL+1)); fi; done
  if [ "$DLL" == "0" ] ; then
    echo 'Missing TextToSocketEngine*.dll in node_modules/text-to-socket-engine'
    echo 'Please make sure you have built text-to-socket-engine and have run "pnpm install"'
    return 1
  fi
  pnpm pack
}

if ! [ -f win10-chromium-nvda-vm-0.0.0.tgz ] && ! buildTgz ; then
  echo "KO: win10-chromium-nvda-vm-0.0.0.tgz"
  exit 1
else
  echo "OK: win10-chromium-nvda-vm-0.0.0.tgz"
fi

cd software
aria2c -V --auto-file-renaming false -x 5 -i ../urls.txt

if ! [ -f "MSEdge - Win10.box" ]; then
    unzip "MSEdge.Win10.Vagrant.zip"
fi
