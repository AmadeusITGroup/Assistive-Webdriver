#!/bin/bash

set -e

vagrant snapshot restore --no-start root
vagrant package --vagrantfile Vagrantbasefile
