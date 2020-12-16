#!/bin/bash

# This script is here because the "vagrant cloud provider upload" command does not work
# so we use the other method as described in the following documentation:
# https://www.vagrantup.com/vagrant-cloud/api#upload-a-provider

set -e

VAGRANT_TOKEN="$1"
BOX_NAME="$2"
BOX_PROVIDER="$3"
BOX_VERSION="$4"
BOX_FILE="$5"

response=$(curl --header "Authorization: Bearer $VAGRANT_TOKEN" "https://app.vagrantup.com/api/v1/box/$BOX_NAME/version/$BOX_VERSION/provider/$BOX_PROVIDER/upload" --fail)
upload_path=$(echo "$response" | jq -r .upload_path)
response=$(curl "$upload_path" --request PUT --upload-file "$BOX_FILE" --fail)
echo "$response"
