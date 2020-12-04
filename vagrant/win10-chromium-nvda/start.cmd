@echo off

start "tcp-web-listener" /min "c:\node-v12.16.3-win-x64\node_modules\win10-chromium-nvda-vm\node_modules\.bin\tcp-web-listener.cmd" --http-host 0.0.0.0
start "selenium-server" /min "c:\jdk-14.0.1\bin\java.exe" -jar "c:\selenium-server.jar"
start "nvda" /min "c:\Program Files (x86)\NVDA\nvda.exe"
