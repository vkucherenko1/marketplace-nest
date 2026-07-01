import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AccessTokenGuard } from "./common/access-token.guard";
import { MediaController } from "./media.controller";
import { MediaService } from "./media.service";

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET ?? "local-access-secret-change-me-32-chars",
    }),
  ],
  controllers: [MediaController],
  providers: [AccessTokenGuard, MediaService],
})
export class AppModule {}
