import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // The web app is served from another origin and sends x-guest-id.
  // Unset WEB_ORIGIN must not fall through to the cors default of '*', so deny cross-origin instead.
  const origin = process.env.WEB_ORIGIN || false;
  app.enableCors({ origin, allowedHeaders: ['content-type', 'x-guest-id'] });
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
