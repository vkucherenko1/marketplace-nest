import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { DatabaseModule } from "../database/database.module";
import { UsersRepository } from "../users/users.repository";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AccessTokenGuard } from "./access-token.guard";

@Module({
  imports: [DatabaseModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [UsersRepository, AuthService, AccessTokenGuard],
})
export class AuthModule {}
