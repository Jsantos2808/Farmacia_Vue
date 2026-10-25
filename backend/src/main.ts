import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be configured in production')
    }
    process.env.JWT_SECRET = 'dev-only-change-me'
  }

  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('api')
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',').map((value) => value.trim()) ?? true,
    credentials: true,
  })
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )
  await app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0')
}

void bootstrap()
