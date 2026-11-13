import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // The web app is served from another origin and sends x-guest-id.
  // Unset WEB_ORIGIN must not fall through to the cors default of '*', so deny cross-origin instead.
  const origin = process.env.WEB_ORIGIN || false;
  // credentials: true lets the session cookie travel; WEB_ORIGIN must then be the exact web origin.
  app.enableCors({ origin, credentials: true, allowedHeaders: ['content-type', 'x-guest-id', 'x-requested-with'] });
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
