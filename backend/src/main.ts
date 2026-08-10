import 'reflect-metadata';
import * as fs from 'fs';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const uploadDir = process.env.UPLOAD_DIR || 'uploads';
  fs.mkdirSync(uploadDir, { recursive: true });
  app.useStaticAssets(join(process.cwd(), uploadDir), { prefix: '/uploads/' });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({ origin: true, credentials: true });

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Silknode Support backend ishga tushdi: http://localhost:${port}/api/v1`);
}
bootstrap();
