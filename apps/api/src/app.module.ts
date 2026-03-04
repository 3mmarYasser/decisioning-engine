import { Module, Logger } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { SiteConfigModule } from './config/config.module';
import { DecideModule } from './decide/decide.module';

@Module({
  imports: [
    NestConfigModule.forRoot({ isGlobal: true }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        const logger = new Logger('CacheModule');
        try {
          const store = await redisStore({
            socket: {
              host: process.env.REDIS_HOST || 'localhost',
              port: parseInt(process.env.REDIS_PORT || '6379', 10),
              connectTimeout: 5000,
            },
            ttl: 300_000,
          });
          logger.log('Redis cache connected');
          return { store };
        } catch (error) {
          logger.warn('Redis unavailable, falling back to in-memory cache');
          return { ttl: 300_000 };
        }
      },
    }),
    SiteConfigModule,
    DecideModule,
  ],
})
export class AppModule {}
