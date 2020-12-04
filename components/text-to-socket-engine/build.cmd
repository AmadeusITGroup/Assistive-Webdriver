@echo off
midl /h TextToSocketEngine.h TextToSocketEngine.idl
rc resource.rc
cvtres /OUT:resource.obj resource.res
cl resource.obj *.cpp /LD /link /DEF:TextToSocketEngine.def /OUT:TextToSocketEngine.dll
