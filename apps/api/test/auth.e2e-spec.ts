import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects invalid phone on OTP request', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/otp/request')
      .send({ phone: 'invalid' })
      .expect(400);
  });

  it('requires auth for /users/me', () => {
    return request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
  });
});
