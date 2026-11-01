import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  // Behind Caddy: trust exactly one proxy hop so req.ip is the real client address.
  (app.getHttpAdapter().getInstance() as { set: (k: string, v: unknown) => void }).set('trust proxy', 1);

  app.enableShutdownHooks();
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Decisioning Engine API')
    .setDescription(
      'A consent-safe personalisation decisioning API. Returns the variant a visitor should see based on configurable rules, visitor context, and consent flags.',
    )
    .setVersion('1.0')
    .addTag('config', 'Ruleset configuration endpoints')
    .addTag('decide', 'Variant decisioning endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Decisioning Engine — API Docs',
    swaggerOptions: { persistAuthorization: true, docExpansion: 'list' },
  });

  }

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`Decisioning API running on http://localhost:${port}`);
}

bootstrap().catch((err) => {
  const logger = new Logger('Bootstrap');
  logger.error('Failed to start application', err);
  process.exit(1);
});
