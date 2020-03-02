@echo off

rundll32 %~dp0\TextToSocketEngine.dll,removeVoice textToSocketVoice
regsvr32 /u %~dp0\TextToSocketEngine.dll
