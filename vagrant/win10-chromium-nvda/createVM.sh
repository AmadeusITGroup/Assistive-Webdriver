#!/bin/bash

set -e

if [ "$1" == "--destroy-existing" ] ; then
  killall vagrant ruby || true
  vagrant destroy -f
fi

vagrant up
VBoxManage controlvm win10-chromium-nvda setvideomodehint 1280 720 32
vagrant snapshot save nvda
vagrant halt
