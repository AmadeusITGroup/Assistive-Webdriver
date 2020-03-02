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

import http from "http";

const HTML_PAGE = `<!DOCTYPE html>
<html>
  <head>
    <title>Input events test page</title>
    <style type="text/css">
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
      }
    </style>
  </head>
  <body>
    <input id="testInput"><br>
    <div id="testDiv" tabindex="0" aria-label="mysupertestlabeltocheck" role="application" style="width:100px;height:100px;border:1px solid black;"></div>
    <script type="text/javascript">
    (function () {
      function preventDefault(event) {
        event.preventDefault();
      }
      function eventHandler(event) {
        var properties = ["type", "key", "pageX", "pageY", "button", "location"];
        var object = {
          time: Date.now()
        };
        properties.forEach(function (property) {
          object[property] = event[property];
        });
        var data = encodeURIComponent(JSON.stringify(object));
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/event?data=' + data, true);
        xhr.send();
      }
      var testDiv = document.getElementById("testDiv");
      testDiv.addEventListener("keydown", eventHandler);
      testDiv.addEventListener("keydown", preventDefault);
      testDiv.addEventListener("keyup", eventHandler);
      testDiv.addEventListener("keyup", preventDefault);
      document.body.addEventListener("mousedown", eventHandler);
      document.body.addEventListener("mouseup", eventHandler);
      document.body.addEventListener("contextmenu", preventDefault);
      document.write('<div aria-hidden="true">ready</div>');
    })();
    </script>
  </body>
</html>`;

export const createEventsServer = (eventHandler: (data: any) => void) =>
  http.createServer((req, res) => {
    if (req.method === "GET") {
      const url = new URL(req.url!, "http://localhost/");
      if (url.pathname === "/event") {
        let data;
        try {
          data = JSON.parse(url.searchParams.get("data")!);
        } catch (error) {
          res.statusCode = 400;
          res.end("");
          return;
        }
        res.statusCode = 204;
        res.end();
        eventHandler(data);
        return;
      } else if (url.pathname === "/") {
        res.statusCode = 200;
        res.setHeader("content-type", "text/html; charset=utf8");
        res.end(HTML_PAGE, "utf8");
        return;
      }
    }
    res.statusCode = 404;
    res.end("");
  });
