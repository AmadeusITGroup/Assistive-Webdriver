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

/*******************************************************************************
* TtsEngObj.cpp *
*---------------*
*   Description:
*       This module is the main implementation file for the CTTSEngObj class.
*
*******************************************************************************/

//--- Additional includes
#include "stdafx.h"
#include "TtsEngObj.h"
#include <winsock2.h>
#include <atlstr.h>
#include <Ws2tcpip.h>

#pragma comment(lib, "ws2_32.lib")

//--- Local

/*****************************************************************************
* CTTSEngObj::FinalConstruct *
*----------------------------*
*   Description:
*       Constructor
*****************************************************************************/
HRESULT CTTSEngObj::FinalConstruct()
{
    WSAStartup(MAKEWORD(2,0), &WSAData);
    sock = NULL;
    return S_OK;
} /* CTTSEngObj::FinalConstruct */

/*****************************************************************************
* CTTSEngObj::FinalRelease *
*--------------------------*
*   Description:
*       destructor
*****************************************************************************/
void CTTSEngObj::FinalRelease()
{
    if (sock) {
        closesocket(sock);
        sock = NULL;
    }
    WSACleanup();
} /* CTTSEngObj::FinalRelease */


void CTTSEngObj::sendData(const char *buf) {
    int retryNumber = 0;
    do {
        if (!sock) {
            HRESULT hr = S_OK;
            CSpDynamicString strHost;
            CSpDynamicString strPort;
            CSpDynamicString strTCPHeaderW;
            hr = m_cpToken->GetStringValue(L"Host", &strHost);
            hr = m_cpToken->GetStringValue(L"Port", &strPort);
            hr = m_cpToken->GetStringValue(L"TCPHeader", &strTCPHeaderW);
            CW2A strTCPHeaderA(strTCPHeaderW);

            PADDRINFOW addrInfo = NULL;
            hr = GetAddrInfoW(strHost, strPort, NULL, &addrInfo);
            if (!addrInfo) {
                return;
            }

            sock = socket(addrInfo->ai_addr->sa_family, SOCK_STREAM, 0);
            connect(sock, addrInfo->ai_addr, addrInfo->ai_addrlen);
            int tcpHeaderLength = lstrlenA(strTCPHeaderA);
            if (tcpHeaderLength > 0) {
                send(sock, strTCPHeaderA, tcpHeaderLength, 0);
                send(sock, "\r\n", 2, 0);
            }

            FreeAddrInfoW(addrInfo);
        }

        int res = send(sock, buf, lstrlenA(buf), 0);
        if (res == SOCKET_ERROR) {
            closesocket(sock);
            sock = NULL;
            retryNumber++;
        }
    } while (sock == NULL && retryNumber <= 1);
}

//
//=== ISpTTSEngine Implementation ============================================
//

/*****************************************************************************
* CTTSEngObj::Speak *
*-------------------*
*   Description:
*       This is the primary method that SAPI calls to render text.
*-----------------------------------------------------------------------------
*   Input Parameters
*
*   pUser
*       Pointer to the current user profile object. This object contains
*       information like what languages are being used and this object
*       also gives access to resources like the SAPI master lexicon object.
*
*   dwSpeakFlags
*       This is a set of flags used to control the behavior of the
*       SAPI voice object and the associated engine.
*
*   VoiceFmtIndex
*       Zero based index specifying the output format that should
*       be used during rendering.
*
*   pTextFragList
*       A linked list of text fragments to be rendered. There is
*       one fragement per XML state change. If the input text does
*       not contain any XML markup, there will only be a single fragment.
*
*   pOutputSite
*       The interface back to SAPI where all output audio samples and events are written.
*
*   Return Values
*       S_OK - This should be returned after successful rendering or if
*              rendering was interrupted because *pfContinue changed to FALSE.
*       E_INVALIDARG 
*       E_OUTOFMEMORY
*
*****************************************************************************/
STDMETHODIMP CTTSEngObj::Speak( DWORD dwSpeakFlags,
                                REFGUID rguidFormatId,
                                const WAVEFORMATEX * pWaveFormatEx,
                                const SPVTEXTFRAG* pTextFragList,
                                ISpTTSEngineSite* pOutputSite )
{

    HRESULT hr = S_OK;
    bool sentSomething = false;
    const SPVTEXTFRAG* curFrag = pTextFragList;
    while (curFrag) {
        if (curFrag->State.eAction == SPVA_Speak && curFrag->ulTextLen > 0) {
            CAtlStringW textT(curFrag->pTextStart, curFrag->ulTextLen);
            CW2A textA(textT);
            if (sentSomething) {
                sendData(" ");
            }
            sendData(textA);
            sentSomething = true;
        } else if (curFrag->State.eAction == SPVA_Bookmark) {
            WCHAR * pszBookmark = (WCHAR *)_malloca((curFrag->ulTextLen + 1) * sizeof(WCHAR));
            memcpy(pszBookmark, curFrag->pTextStart, curFrag->ulTextLen * sizeof(WCHAR));
            pszBookmark[curFrag->ulTextLen] = 0;
            //--- Queue the event
            SPEVENT Event;
            Event.eEventId             = SPEI_TTS_BOOKMARK;
            Event.elParamType          = SPET_LPARAM_IS_STRING;
            Event.ullAudioStreamOffset = 0;
            Event.lParam               = (LPARAM)pszBookmark;
            Event.wParam               = _wtol(pszBookmark);
            hr = pOutputSite->AddEvents( &Event, 1 );
            //--- Free the space for the string.
            _freea(pszBookmark);
        }
        curFrag = curFrag->pNext;
    }
    if (sentSomething) {
        sendData("\r\n");
    }
    return hr;
} /* CTTSEngObj::Speak */

/*****************************************************************************
* CTTSEngObj::GetVoiceFormat *
*----------------------------*
*   Description:
*       This method returns the output data format associated with the
*   specified format Index. Formats are in order of quality with the best
*   starting at 0.
*****************************************************************************/
STDMETHODIMP CTTSEngObj::GetOutputFormat( const GUID * pTargetFormatId, const WAVEFORMATEX * pTargetWaveFormatEx,
                                          GUID * pDesiredFormatId, WAVEFORMATEX ** ppCoMemDesiredWaveFormatEx )
{

    HRESULT hr = S_OK;

    hr = SpConvertStreamFormatEnum(SPSF_11kHz16BitMono, pDesiredFormatId, ppCoMemDesiredWaveFormatEx);

    return hr;
} /* CTTSEngObj::GetVoiceFormat */
