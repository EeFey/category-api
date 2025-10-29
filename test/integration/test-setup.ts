import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Type, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { PrismaModule } from '../../src/common/prisma/prisma.module';

export async function setupIntegrationTest(
  additionalModules: Type<any>[] = [],
) {

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [PrismaModule, ...additionalModules],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({
    transform: true, whitelist: true
  }));
  await app.init();

  const prismaService = moduleFixture.get<PrismaService>(PrismaService);
  await prismaService.$connect();

  return { moduleFixture, app, prismaService };
}

export async function tearDownIntegrationTest(
  moduleFixture: TestingModule,
  app: INestApplication,
  prismaService: PrismaService,
) {
  await app.close();
  await prismaService.$disconnect();
  await moduleFixture.close();
}
