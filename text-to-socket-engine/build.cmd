@echo off
midl /h TextToSocketEngine.h TextToSocketEngine.idl
rc resource.rc
cvtres /MACHINE:X86 /OUT:resource.obj resource.res
cl resource.obj *.cpp /LD /link /MACHINE:X86 /DEF:TextToSocketEngine.def /OUT:TextToSocketEngine.dll
