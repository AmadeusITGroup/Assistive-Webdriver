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

import Koa from "koa";
import Queue from "p-queue";
import { json as jsonBody } from "co-body";
import { all, post, del } from "koa-route";
import httpProxy from "http-proxy";
import request from "./request";
import { StatusCodeError } from "./request";
import { v4 as uuid } from "uuid";
import {
  PublicError,
  InvalidSessionError,
  AbortedConnectionError
} from "./publicError";
import { createSubLogFunction, LogFunction } from "vm-providers";

export interface ProxyApplication extends Koa {
  deleteSessions(): Promise<void>;
}

export const CTX_SESSION_ID: any = Symbol("sessionId");
export const CTX_SESSION: any = Symbol("session");
export const CTX_SESSION_DATA: any = Symbol("sessionData");
export const CTX_SERVER_SESSION_URL: any = Symbol("serverSessionUrl");

export const DEFAULT_SESSION_TIMEOUT = 1800000;

interface Session<T> {
  id: string;
  serverUrl: string;
  serverSessionId: string;
  data: T;
  queue: Queue;
  log: LogFunction;
  lastAccess: number;
}

export interface WebdriverProxyConfig<T> {
  log?: LogFunction;
  sessionTimeout?: number;
  createSession(
    id: string,
    params: any
  ): Promise<{ serverUrl: string; data: T }>;
  deleteSession(id: string, data: T): Promise<void>;
  sessionCreated?(id: string, data: T, serverSessionUrl: string): Promise<void>;
  registerActions?(app: Koa): void;
}

export function createWebdriverProxy<T>(
  config: WebdriverProxyConfig<T>
): ProxyApplication {
  const app = new Koa() as ProxyApplication;
  const proxy = httpProxy.createProxy({ changeOrigin: true });
  const sessions = new Map<string, Session<T>>();
  const log = createSubLogFunction(config.log, { category: "proxy" });
  const sessionTimeout =
    config.sessionTimeout == null
      ? DEFAULT_SESSION_TIMEOUT
      : config.sessionTimeout;

  const deleteSession = async (session: Session<T>) => {
    const sessionId = session.id;
    if (sessionId) {
      session.log({ message: "session.delete" });
      session.id = "";
      sessions.delete(sessionId);
      await config.deleteSession(sessionId, session.data);
    }
  };

  proxy.on("proxyReq", (proxyReq, req, res, options) => {
    log({
      level: "debug",
      message: "upstream.begin",
      sessionId: (req as any)[CTX_SESSION_ID],
      url: (options.target as URL).href
    });
  });
  proxy.on("proxyRes", (proxyRes, req, res) => {
    log({
      level: "debug",
      message: "upstream.end",
      sessionId: (req as any)[CTX_SESSION_ID]
    });
  });

  app.use(
    all(
      "/session/:sessionid",
      async (ctx, sessionId, next) => {
        ctx[CTX_SESSION_ID] = sessionId;
        await next();
      },
      {
        end: false
      }
    )
  );

  app.use(async (ctx, next) => {
    const sessionId = ctx[CTX_SESSION_ID] || uuid();
    ctx[CTX_SESSION_ID] = sessionId;
    log({
      message: "request.begin",
      sessionId,
      method: ctx.method,
      url: ctx.url
    });
    try {
      await next();
    } catch (error: any) {
      if (error instanceof PublicError) {
        ctx.status = error.statusCode;
        ctx.body = {
          value: {
            error: error.errorId,
            message: error.message
          }
        };
      } else if (error instanceof StatusCodeError) {
        // transfers error from upstream call
        ctx.status = error.statusCode;
        ctx.body = error.body;
      } else {
        ctx.status = 500;
        ctx.body = {
          value: {
            error: "unknown error",
            message: `${error.message}`
          }
        };
      }
      log({
        level: "error",
        message: "request.error",
        sessionId,
        error: `${error}`
      });
    }
    log({
      level: "debug",
      message: "request.end",
      sessionId,
      status: ctx.status
    });
  });

  app.use(
    post("/session", async ctx => {
      let aborted = false;
      ctx.res.on("close", () => (aborted = true));
      const body = await jsonBody(ctx);
      const sessionId = ctx[CTX_SESSION_ID];
      const sessionLog = createSubLogFunction(log, { sessionId });
      sessionLog({
        message: "session.create",
        data: body
      });
      const sessionInfo = await config.createSession(sessionId, body);
      const session: Session<T> = {
        id: sessionId,
        serverUrl: sessionInfo.serverUrl,
        serverSessionId: "",
        data: sessionInfo.data,
        queue: new Queue({ concurrency: 1 }),
        log: sessionLog,
        lastAccess: Date.now()
      };
      try {
        if (aborted) {
          throw new AbortedConnectionError();
        }
        const response = await request(
          `${session.serverUrl}/session`,
          {
            body
          },
          sessionLog
        );
        if (aborted) {
          throw new AbortedConnectionError();
        }
        session.serverSessionId = response.value.sessionId;
        sessions.set(sessionId, session);
        response.value.sessionId = session.id;
        if (config.sessionCreated) {
          await config.sessionCreated(
            sessionId,
            session.data,
            `${session.serverUrl}/session/${session.serverSessionId}`
          );
          if (aborted) {
            throw new AbortedConnectionError();
          }
        }
        ctx.status = 200;
        ctx.body = response;
        planNextSessionTimeoutCheck();
      } catch (error) {
        await deleteSession(session);
        throw error;
      }
    })
  );

  app.use(
    all(
      "/session/:sessionid",
      async (ctx, sessionId, next) => {
        const session = sessions.get(sessionId);
        if (!session || !session.lastAccess) {
          throw new InvalidSessionError(sessionId);
        }
        session.lastAccess = Date.now();
        ctx[CTX_SESSION] = session;
        ctx[CTX_SESSION_ID] = session.id;
        ctx[CTX_SESSION_DATA] = session.data;
        ctx[
          CTX_SERVER_SESSION_URL
        ] = `${session.serverUrl}/session/${session.serverSessionId}`;
        await session.queue.add(async () => {
          if (session.id) {
            session.log({
              level: "debug",
              url: ctx.url,
              method: ctx.method,
              message: "request.execute"
            });
            await next();
          } else {
            throw new InvalidSessionError(sessionId);
          }
        });
      },
      {
        end: false
      }
    )
  );

  app.use(
    del("/session/:sessionid", async ctx => {
      const session: Session<T> = ctx[CTX_SESSION];
      try {
        ctx.body = await request(
          ctx[CTX_SERVER_SESSION_URL],
          {
            method: "DELETE"
          },
          session.log
        );
      } finally {
        await deleteSession(session);
      }
    })
  );

  if (config.registerActions) {
    config.registerActions(app);
  }

  app.use(
    all(
      "/session/:sessionid",
      ctx =>
        new Promise((resolve, reject) => {
          const target = `${ctx[CTX_SERVER_SESSION_URL]}/${ctx.url.replace(
            /^\/session\/[^/]*\//,
            ""
          )}`;
          (ctx.req as any)[CTX_SESSION_ID] = ctx[CTX_SESSION_ID];
          proxy.web(
            ctx.req,
            ctx.res,
            {
              ignorePath: true,
              target
            },
            reject
          );
          ctx.res.once("finish", resolve);
        }),
      {
        end: false
      }
    )
  );

  const deleteSessions = async function (
    filterFn?: (session: Session<T>) => boolean
  ) {
    const allPromises: Promise<void>[] = [];
    sessions.forEach(session => {
      if (filterFn && !filterFn(session)) {
        return;
      }
      allPromises.push(
        (async () => {
          await Promise.resolve();
          await deleteSession(session);
        })()
      );
    });
    await Promise.all(allPromises);
  };

  app.deleteSessions = () => {
    return deleteSessions();
  };

  const planNextSessionTimeoutCheck = sessionTimeout
    ? (() => {
        let sessionTimeoutCheckTimeout: NodeJS.Timeout | null;
        const checkSessionTimeout = () => {
          log({
            level: "info",
            message: "timeout.check"
          });
          if (sessionTimeoutCheckTimeout) {
            clearTimeout(sessionTimeoutCheckTimeout);
            sessionTimeoutCheckTimeout = null;
          }
          const currentTime = Date.now();
          let nextTimeoutDelay = Infinity;
          const hasTimedout = (session: Session<T>) => {
            const timeoutDelay =
              session.lastAccess + sessionTimeout - currentTime;
            if (session.lastAccess && timeoutDelay <= 0) {
              session.lastAccess = 0;
              return true;
            } else {
              if (nextTimeoutDelay > timeoutDelay) {
                nextTimeoutDelay = timeoutDelay;
              }
              return false;
            }
          };
          deleteSessions(hasTimedout); // asynchronously delete sessions that have timed out
          if (nextTimeoutDelay < Infinity) {
            log({
              level: "info",
              message: "timeout.nextcheck",
              delay: nextTimeoutDelay
            });
            sessionTimeoutCheckTimeout = setTimeout(
              checkSessionTimeout,
              nextTimeoutDelay
            );
          }
        };

        return () => {
          if (!sessionTimeoutCheckTimeout) {
            sessionTimeoutCheckTimeout = setTimeout(checkSessionTimeout, 0);
          }
        };
      })()
    : () => {};

  return app;
}
