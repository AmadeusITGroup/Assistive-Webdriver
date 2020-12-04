/*
 * Copyright 2019 Amadeus s.a.s.
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial
 * portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
 * LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

#include "stdafx.h"
#include <initguid.h>
#include "TextToSocketEngine.h"
#include "TextToSocketEngine_i.c"
#include "TtsEngObj.h"

CComModule _Module;

BEGIN_OBJECT_MAP(ObjectMap)
    OBJECT_ENTRY(CLSID_TextToSocketEngine, CTTSEngObj)
END_OBJECT_MAP()

/////////////////////////////////////////////////////////////////////////////
// DLL Entry Point

extern "C" BOOL WINAPI DllMain(HINSTANCE hInstance, DWORD dwReason, LPVOID /*lpReserved*/)
{
    if (dwReason == DLL_PROCESS_ATTACH)
    {
        _Module.Init(ObjectMap, (HINSTANCE)hInstance, &LIBID_TEXTTOSOCKETTTSENGLib);
    }
    else if (dwReason == DLL_PROCESS_DETACH)
        _Module.Term();
    return TRUE;    // ok
}

/////////////////////////////////////////////////////////////////////////////
// Used to determine whether the DLL can be unloaded by OLE

STDAPI DllCanUnloadNow(void)
{
    return (_Module.GetLockCount()==0) ? S_OK : S_FALSE;
}

/////////////////////////////////////////////////////////////////////////////
// Returns a class factory to create an object of the requested type

STDAPI DllGetClassObject(REFCLSID rclsid, REFIID riid, LPVOID* ppv)
{
    return _Module.GetClassObject(rclsid, riid, ppv);
}

/////////////////////////////////////////////////////////////////////////////
// DllRegisterServer - Adds entries to the system registry

STDAPI DllRegisterServer(void)
{
    return _Module.RegisterServer(TRUE);
}

/////////////////////////////////////////////////////////////////////////////
// DllUnregisterServer - Removes entries from the system registry

STDAPI DllUnregisterServer(void)
{
    return _Module.UnregisterServer(TRUE);
}

void CALLBACK addVoiceW(HWND hwnd, HINSTANCE hinst, LPWSTR lpszCmdLine, int nCmdShow) {
    CoInitializeEx(NULL, COINIT_MULTITHREADED);
    int argc = 0;
    LPWSTR* argv = CommandLineToArgvW(lpszCmdLine, &argc);
    if (! argv || (argc != 4 && argc != 5)) {
        MessageBox(
            NULL,
            "Expected 4 or 5 parameters: voiceKeyName voiceDisplayName voiceHost voicePort [voiceTCPHeader]",
            "Error",
            MB_ICONERROR
        );
        return;
    }

    LPWSTR voiceKeyName = argv[0];
    LPWSTR voiceDisplayName = argv[1];
    LPWSTR voiceHost = argv[2];
    LPWSTR voicePort = argv[3];
    LPWSTR voiceTCPHeader = argc == 5 ? argv[4] : L"";

    HRESULT hr = S_OK;
    CComPtr<ISpObjectToken> cpToken;
    CComPtr<ISpDataKey> cpDataKeyAttribs;
    hr = SpCreateNewTokenEx(
        SPCAT_VOICES, 
        voiceKeyName, 
        &CLSID_TextToSocketEngine, 
        voiceDisplayName,
        0x409,
        voiceDisplayName, 
        &cpToken,
        &cpDataKeyAttribs);

    if (SUCCEEDED(hr))
    {
        cpDataKeyAttribs->SetStringValue(L"Name", voiceKeyName);
        cpDataKeyAttribs->SetStringValue(L"Gender", L"Male");
        cpDataKeyAttribs->SetStringValue(L"Language", L"409");
        cpDataKeyAttribs->SetStringValue(L"Age", L"Adult");
        cpToken->SetStringValue(L"Host", voiceHost);
        cpToken->SetStringValue(L"Port", voicePort);
        cpToken->SetStringValue(L"TCPHeader", voiceTCPHeader);
    } else {
        MessageBox(
            NULL,
            "SpCreateNewTokenEx failed",
            "Error",
            MB_ICONERROR
        );
    }
    LocalFree(argv);
}

void CALLBACK removeVoiceW(HWND hwnd, HINSTANCE hinst, LPWSTR lpszCmdLine, int nCmdShow) {
    CoInitializeEx(NULL, COINIT_MULTITHREADED);
    int argc = 0;
    LPWSTR* argv = CommandLineToArgvW(lpszCmdLine, &argc);
    if (! argv || argc != 1) {
        MessageBox(
            NULL,
            "Expected exactly 1 parameter: voiceKeyName",
            "Error",
            MB_ICONERROR
        );
        return;
    }
    LPWSTR voiceKeyName = argv[0];

    HRESULT hr = S_OK;
    CComPtr<ISpObjectToken> cpToken;
    CComPtr<ISpDataKey> cpDataKeyAttribs;
    hr = SpCreateNewTokenEx(
        SPCAT_VOICES, 
        voiceKeyName, 
        &CLSID_TextToSocketEngine, 
        voiceKeyName,
        0x409,
        voiceKeyName, 
        &cpToken,
        &cpDataKeyAttribs);

    if (SUCCEEDED(hr))
    {
        hr = cpToken->Remove(NULL);
    } else {
        MessageBox(
            NULL,
            "SpCreateNewTokenEx failed",
            "Error",
            MB_ICONERROR
        );
    }
    LocalFree(argv);
}
