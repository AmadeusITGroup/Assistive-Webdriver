#!/bin/bash

vagrant up &&
vagrant halt &&
vagrant up &&
vagrant ssh -- /home/vagrant/wait-started.sh &&
VBoxManage controlvm ubuntu setvideomodehint 1280 720 32 &&
vagrant snapshot save orca &&
vagrant halt -f
