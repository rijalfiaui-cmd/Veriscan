import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { resolve } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Static file serving untuk foto siswa
  const uploadDir = process.env.UPLOAD_DIR || 'uploads';
  app.useStaticAssets(resolve(process.cwd(), uploadDir), {
    prefix: '/uploads',
  });

  // CORS — restrict to FRONTEND_URL in production, allow all in dev
  const frontendUrl = process.env.FRONTEND_URL;
  app.enableCors({
    origin: frontendUrl ? frontendUrl.split(',').map((u) => u.trim()) : true,
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Backend berjalan di http://localhost:${port}/api/v1`);
}

bootstrap();
