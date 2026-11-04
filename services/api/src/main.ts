import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // The web app is served from another origin and sends x-guest-id.
  app.enableCors({ allowedHeaders: ['content-type', 'x-guest-id'] });
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
