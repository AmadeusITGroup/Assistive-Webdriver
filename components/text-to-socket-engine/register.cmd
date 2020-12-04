@echo off

FOR %%I IN (%~dp0\TextToSocketEngine*.dll) DO regsvr32 /s %%I
FOR %%I IN (%~dp0\TextToSocketEngine*.dll) DO rundll32 %%I,addVoice textToSocketVoice "Text To Socket 127.0.0.1:4449" 127.0.0.1 4449
