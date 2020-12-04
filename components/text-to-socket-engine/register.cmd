@echo off

regsvr32 %~dp0\TextToSocketEngine.dll
rundll32 %~dp0\TextToSocketEngine.dll,addVoice textToSocketVoice "Text To Socket 127.0.0.1:4449" 127.0.0.1 4449
