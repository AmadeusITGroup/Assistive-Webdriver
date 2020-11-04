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

(function () {
  var listener = null;
  var console = window.console;
  var registerFunction = LIVELISTENER_REGISTER_FUNCTION;
  var urlValue = LIVELISTENER_URL_VALUE;

  var log =
    console && console.log
      ? function (message) {
          console.log("[window." + registerFunction + "]: " + message);
        }
      : function () {};

  var createSocket = function () {
    var sock = new SockJS(urlValue);

    sock.onopen = function () {
      log("Connected to " + urlValue);
    };

    sock.onmessage = function (e) {
      if (listener) {
        listener.fn.call(listener.scope, e.data);
      }
    };

    sock.onclose = function () {
      sock = null;
      log("Connection to " + urlValue + " was lost. Reconnecting in 100ms...");
      setTimeout(createSocket, 100);
    };
  };

  window[registerFunction] = function (fn, scope) {
    var listenerObject = {
      fn: fn,
      scope: scope
    };
    listener = listenerObject;
    return function () {
      if (listener === listenerObject) {
        listener = null;
        listenerObject = null;
      }
    };
  };

  createSocket();
})();
