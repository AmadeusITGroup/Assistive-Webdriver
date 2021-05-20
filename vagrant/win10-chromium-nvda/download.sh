#!/bin/bash

NBERRORS=0

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
  NBERRORS=$((NBERRORS+1))
  echo "KO: win10-chromium-nvda-vm-0.0.0.tgz"
else
  echo "OK: win10-chromium-nvda-vm-0.0.0.tgz"
fi

cd software

function checkFile() {
    FILE="$1"
    SHA="$2"
    if [ -f "$FILE" ] && ../checksum.js "$FILE" "$SHA"; then
        touch ".$FILE"
        return 0;
    else
        rm -f ".$FILE"
        return 1;
    fi
}

function downloadFile() {
    local FILE="$1"
    local URL="$2"
    local SHA="$3"
    if [ -f ".$FILE" -a -f "$FILE" ] || checkFile "$FILE" "$SHA" ; then
        echo "OK: $FILE"
    else
        curl -L -C - -o "$FILE" "$URL"
        if [ "$?" == "33" ] ; then
            # curl: (33) HTTP server doesn't seem to support byte ranges. Cannot resume.
            curl -L -o "$FILE" "$URL"
        fi
        if checkFile "$FILE" "$SHA" ; then
            echo "OK: $FILE"
        else
            NBERRORS=$((NBERRORS+1))
            echo "KO: $FILE"
        fi
    fi
}

downloadFile MSEdge.Win10.Vagrant.zip https://az792536.vo.msecnd.net/vms/VMBuild_20190311/Vagrant/MSEdge/MSEdge.Win10.Vagrant.zip 10620d68a5a14129da0bc7f856e0e3cabbfcec9cb8e6464553c03d2f638978f9b98866cf405baf737073ebb72eee904e8cb15d835ff5f12c99b0b49d668b531a
downloadFile nvda.exe https://www.nvaccess.org/files/nvda/releases/2020.3/nvda_2020.3.exe 8719507492269db398ef70f44e95f0132144223e76faf2e9b2123743ab68fcaf3793717a60ba2f522ae604a4ec820c95cedf396a645c0240fcde7f35cc40f729
downloadFile openjdk.zip https://download.java.net/java/GA/jdk14.0.1/664493ef4a6946b186ff29eb326336a2/7/GPL/openjdk-14.0.1_windows-x64_bin.zip 7546b40977670f24ec68ad82b5d9f52f4fc105410e7bbfec6da0718795f4a82ac26665f1f9f05562ae20710aefe85c8dac05c5345d4e48385e99323a916d2157
downloadFile selenium-server.jar https://selenium-release.storage.googleapis.com/3.141/selenium-server-standalone-3.141.59.jar 29ae1e11e51744478e55ba12f6d0dbc06ce7850886701e84d97bb44a675af5f0d8c5bb7b8278365718657e9cec34a69b390cc7568dc2fe710c3256a1effed2ac
downloadFile node.zip https://nodejs.org/dist/v12.16.3/node-v12.16.3-win-x64.zip 3cee3f6d691a08e5e665b9ff92e7fa242d237abb138bfd88975641f9e1931a58895a8130e615e1cb54ddc8d819a783e2e937766ce7fa3ab9bf36890aa787f415
# cf https://www.chromium.org/getting-involved/download-chromium
downloadFile chrome.zip 'https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/Win%2F782792%2Fchrome-win.zip?generation=1593136034368251&alt=media' 39c1965233b995828235cfbcb0d1b4df757a6c94cf0df43cb58de8dc75006a5752f107ebe4ad4d2a7ac16f7bc000e8e4dcf2cb7c645e9697d6838f512814ddda
downloadFile chromedriver.zip 'https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/Win%2F782792%2Fchromedriver_win32.zip?generation=1593136040882187&alt=media' a23c1e33ea5c9e02cb9c813d44a2e05e441eb7c88a8c8db0ec7b1c5fb4029ddd37d80683bc53c1de61f0559d30594dcba3dffd0dcebe0ee817314f7854d0c319
# VC_redist is needed for Firefox (vcruntime140_1.dll dependency)
downloadFile VC_redist.x64.exe https://aka.ms/vs/16/release/VC_redist.x64.exe 7089cf9137d384ab501204aa84fed2d9e7d6c52549702a51b840acc7990c5bf42272321561f6efefb46a907a7d77790855d2e52e6b02109bc5e655bdc4d7dfa3

if ! [ -f "MSEdge - Win10.box" ] && [ -f ".MSEdge.Win10.Vagrant.zip" ]; then
    unzip "MSEdge.Win10.Vagrant.zip"
fi

if [ "$NBERRORS" != "0" ]; then
    echo "There were $NBERRORS error(s) while downloading required files."
    exit 1
fi
