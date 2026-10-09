import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (
      requestOrigin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      callback(null, isAllowedOrigin(requestOrigin));
    },
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`Fundi API listening on http://localhost:${port}/api`);
}

function isAllowedOrigin(origin?: string) {
  const configured = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (!origin || configured.length === 0) return true;
  if (configured.includes(origin)) return true;

  let host = '';
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }

  return configured.some((item) => {
    try {
      const allowedHost = new URL(item).host;
      const dot = allowedHost.indexOf('.');
      if (dot <= 0) return false;
      const name = allowedHost.slice(0, dot);
      const rest = allowedHost.slice(dot);
      return host.startsWith(`${name}-`) && host.endsWith(rest);
    } catch {
      return false;
    }
  });
}

bootstrap();
