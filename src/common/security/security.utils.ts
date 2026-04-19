import { Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();
const httpLogger = new Logger('HttpLogger');

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, '');
}

function sanitizeHeaders(headers: Request['headers']): Record<string, unknown> {
  const safeHeaders: Record<string, unknown> = { ...headers };

  for (const key of Object.keys(safeHeaders)) {
    if (key.toLowerCase() === 'authorization') {
      safeHeaders[key] = '[REDACTED]';
    }
  }

  return safeHeaders;
}

export function httpLoggingMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const startTime = Date.now();
  const safeHeaders = sanitizeHeaders(request.headers);

  httpLogger.log(
    `[HTTP Request] ${request.method} ${request.originalUrl} | ip=${
      request.ip
    } | headers=${JSON.stringify(safeHeaders)} | body=${JSON.stringify(
      request.body,
    )}`,
  );

  response.on('finish', () => {
    const durationMs = Date.now() - startTime;
    httpLogger.log(
      `[HTTP Response] ${request.method} ${request.originalUrl} | status=${response.statusCode} | durationMs=${durationMs}`,
    );
  });

  next();
}
//
export function getAllowedOrigins(): string[] {
  const rawOrigins =
    process.env.CORS_ORIGINS ||
    process.env.FRONTEND_URL ||
    'http://localhost:8080,http://127.0.0.1:3000';

  return rawOrigins.split(',').map(normalizeOrigin).filter(Boolean);
}

export function buildCorsOptions() {
  const allowedOrigins = getAllowedOrigins();

  return {
    // eslint-disable-next-line @typescript-eslint/ban-types
    origin: (origin: string | undefined, callback: Function) => {
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = normalizeOrigin(origin);
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(new Error('Origin not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
}

export function rateLimitMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const windowMs = parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 60_000);
  const maxRequests = parseNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 100);
  const routeKey =
    process.env.RATE_LIMIT_BY_PATH === 'true' ? request.path : 'global';
  const clientKey = `${request.ip}:${routeKey}`;
  const now = Date.now();

  const currentEntry = rateLimitStore.get(clientKey);

  if (!currentEntry || currentEntry.resetAt <= now) {
    rateLimitStore.set(clientKey, {
      count: 1,
      resetAt: now + windowMs,
    });

    response.setHeader('X-RateLimit-Limit', maxRequests.toString());
    response.setHeader('X-RateLimit-Remaining', (maxRequests - 1).toString());
    return next();
  }

  if (currentEntry.count >= maxRequests) {
    const retryAfter = Math.max(
      1,
      Math.ceil((currentEntry.resetAt - now) / 1000),
    );

    response.setHeader('Retry-After', retryAfter.toString());
    response.setHeader('X-RateLimit-Limit', maxRequests.toString());
    response.setHeader('X-RateLimit-Remaining', '0');

    return response.status(429).json({
      statusCode: 429,
      message: 'Too many requests',
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }

  currentEntry.count += 1;
  rateLimitStore.set(clientKey, currentEntry);

  response.setHeader('X-RateLimit-Limit', maxRequests.toString());
  response.setHeader(
    'X-RateLimit-Remaining',
    Math.max(maxRequests - currentEntry.count, 0).toString(),
  );

  return next();
}

export function invalidRouteHandler(
  request: Request,
  response: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  return response.status(404).json({
    statusCode: 404,
    message: 'Route not found',
    path: request.originalUrl,
    timestamp: new Date().toISOString(),
  });
}
