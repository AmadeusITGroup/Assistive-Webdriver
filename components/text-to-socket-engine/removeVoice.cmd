@echo off

FOR %%I IN (%~dp0\TextToSocketEngine*.dll) DO rundll32 %%I,removeVoice %*
