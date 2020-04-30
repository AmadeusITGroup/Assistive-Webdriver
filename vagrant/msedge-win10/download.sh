#!/bin/bash

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
    FILE="$1"
    URL="$2"
    SHA="$3"
    if [ -f ".$FILE" -a -f "$FILE" ] || checkFile "$FILE" "$SHA" ; then
        echo "OK: $FILE"
    else
        curl -L -C - -o "$FILE" "$URL"
        if checkFile "$FILE" "$SHA" ; then
            echo "OK: $FILE"
        else
            echo "KO: $FILE"
        fi
    fi
}

downloadFile MSEdge.Win10.Vagrant.zip https://az792536.vo.msecnd.net/vms/VMBuild_20190311/Vagrant/MSEdge/MSEdge.Win10.Vagrant.zip 10620d68a5a14129da0bc7f856e0e3cabbfcec9cb8e6464553c03d2f638978f9b98866cf405baf737073ebb72eee904e8cb15d835ff5f12c99b0b49d668b531a
downloadFile nvda.exe https://www.nvaccess.org/files/nvda/releases/2019.3.1/nvda_2019.3.1.exe d2b4cde3229aed0b8cf3cf4a6d76b4e017d0101f469d358696417edaad002f0c988315be4910021114e11fdd07956c8e94137ee4a01cda9db02d8613add268e5
downloadFile openjdk.zip https://download.java.net/java/GA/jdk14.0.1/664493ef4a6946b186ff29eb326336a2/7/GPL/openjdk-14.0.1_windows-x64_bin.zip 7546b40977670f24ec68ad82b5d9f52f4fc105410e7bbfec6da0718795f4a82ac26665f1f9f05562ae20710aefe85c8dac05c5345d4e48385e99323a916d2157
downloadFile selenium-server.jar https://selenium-release.storage.googleapis.com/3.141/selenium-server-standalone-3.141.59.jar 29ae1e11e51744478e55ba12f6d0dbc06ce7850886701e84d97bb44a675af5f0d8c5bb7b8278365718657e9cec34a69b390cc7568dc2fe710c3256a1effed2ac
downloadFile node.zip https://nodejs.org/dist/v12.16.3/node-v12.16.3-win-x64.zip 3cee3f6d691a08e5e665b9ff92e7fa242d237abb138bfd88975641f9e1931a58895a8130e615e1cb54ddc8d819a783e2e937766ce7fa3ab9bf36890aa787f415
downloadFile chrome.zip 'https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/Win_x64%2F737173%2Fchrome-win.zip?generation=1580439619624464&alt=media' 4eac4f1e7e7f12978114acb174da0ea8aece7eab839856c17f038a5b8bb30673ceccdf465517983c835089f35949128a40ed683f2af316596253bc9a26b325f1
downloadFile chromedriver.zip 'https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/Win_x64%2F737173%2Fchromedriver_win32.zip?generation=1580439625877582&alt=media' b608696ba1782bd4b285a7f3c13fd0969d191270308ec240835fe08e82c598e05469f27fa2c2421136d88f9f13bdf274708ef340d11862ef34ec83f5d59baed5
downloadFile text-to-socket-engine-x86.zip https://github.com/AmadeusITGroup/Assistive-Webdriver/releases/download/text-to-socket-engine%2F0.0.1/text-to-socket-engine-x86.zip f0007140925a5640d4d34fa0d04f90db094d5e31871d42ffeada817258d72e63dbdb55044a035aa3aa372e7efa8ed5ab194f7af45580bd2399174d347b9481d1
downloadFile tcp-web-listener.tgz https://registry.yarnpkg.com/tcp-web-listener/-/tcp-web-listener-0.0.1.tgz 41b6e700dbadf5314a61b2837dba04965eb806ac39f379e1b191eaa696cf0001201c8a0e28768ae04caa592bfc5e7f2ffef21e0f674aaccda2f22ba9f4c89abd
downloadFile assistive-webdriver.tgz https://registry.yarnpkg.com/assistive-webdriver/-/assistive-webdriver-0.0.2.tgz 26187e8c656ea11f19615d4809f840e2c7b2c6eb4f5de7dfa28d08008cf8457c1c34120f38ff3d9f808cde710dda5ca850854a901724fa6227f2df36ca7ef657

if ! [ -f "MSEdge - Win10.box" ] && [ -f ".MSEdge.Win10.Vagrant.zip" ]; then
    unzip "MSEdge.Win10.Vagrant.zip"
fi
