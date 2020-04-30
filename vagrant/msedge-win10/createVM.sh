#!/bin/bash

vagrant up &&
VBoxManage controlvm msedge-win10 setvideomodehint 1280 720 32 &&
vagrant snapshot save nvda &&
vagrant halt -f
