import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;

  // 1. Bảo mật Header bằng Helmet
  app.use(helmet());

  // 2. Cấu hình CORS
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // 3. Tiền tố toàn cục API
  app.setGlobalPrefix('api');

  // 4. Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // 5. Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // 6. Global Response Interceptor (Định dạng envelope chuẩn { success, message, data, meta })
  app.useGlobalInterceptors(new TransformInterceptor());

  // 7. Cấu hình Swagger UI tự động tại /api/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Hệ Thống Quản Lý An Toàn PCCC (G1.8 Fire Safety API)')
    .setDescription(
      'Tài liệu đặc tả hợp đồng RESTful API và Cơ chế Bảo mật GovTech (Role 3: CSDL, Phân quyền & Risk Engine)',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Nhập JWT Access Token vào đây',
      },
      'BearerAuth',
    )
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port);
  logger.log(`🚀 Ứng dụng Backend API đang khởi chạy tại: http://localhost:${port}/api`);
  logger.log(`📚 Tài liệu Swagger UI tự động: http://localhost:${port}/api/docs`);
}

bootstrap();

