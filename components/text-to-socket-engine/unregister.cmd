@echo off

FOR %%I IN (%~dp0\TextToSocketEngine*.dll) DO rundll32 %%I,removeVoice textToSocketVoice
FOR %%I IN (%~dp0\TextToSocketEngine*.dll) DO regsvr32 /s /u %%I
