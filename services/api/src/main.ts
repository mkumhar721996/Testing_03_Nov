import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // The web app sends the session cookie cross-origin only from this origin.
  if (process.env.WEB_ORIGIN) app.enableCors({ origin: process.env.WEB_ORIGIN, credentials: true });
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
