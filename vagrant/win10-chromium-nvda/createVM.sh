#!/bin/bash

set -e

if [ "$1" == "--destroy-existing" ] ; then
  echo "Destroying existing VM"
  vagrant destroy -f
fi

if vagrant snapshot list | grep root &> /dev/null ; then
  echo "Snapshot root already exists"
else
  echo "Creating VM from scratch"
  vagrant destroy -f
  vagrant up
  vagrant halt
  vagrant snapshot save root
fi
if vagrant snapshot list | grep noscreenreader &> /dev/null ; then
  echo "Snapshot noscreenreader already exists"
else
  echo "Creating noscreenreader snapshot"
  vagrant halt -f
  vagrant snapshot restore --no-start root
  vagrant up --provision-with start-assistive-playwright,start-selenium-webdriver
  VBoxManage controlvm win10-chromium-nvda setvideomodehint 1920 1080 32
  vagrant snapshot save noscreenreader
  vagrant halt -f
fi
if vagrant snapshot list | grep nvda &> /dev/null ; then
  echo "Snapshot nvda already exists"
else
  echo "Creating nvda snapshot"
  vagrant halt -f
  vagrant snapshot restore --no-start noscreenreader
  vagrant up --provision-with start-nvda
  vagrant snapshot save nvda
  vagrant halt -f
fi
if vagrant snapshot list | grep jaws &> /dev/null ; then
  echo "Snapshot jaws already exists"
else
  echo "Creating jaws snapshot"
  vagrant halt -f
  vagrant snapshot restore --no-start noscreenreader
  vagrant up --provision-with start-jaws
  vagrant snapshot save jaws
  vagrant halt -f
fi
