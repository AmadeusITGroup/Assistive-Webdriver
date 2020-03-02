@echo off

regsvr32 %~dp0\TextToSocketEngine.dll
rundll32 %~dp0\TextToSocketEngine.dll,addVoice textToSocketVoice "Text To Socket localhost:4449" localhost 4449
