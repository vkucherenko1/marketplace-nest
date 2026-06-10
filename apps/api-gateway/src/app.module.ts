import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { GatewayModule } from "./gateway.module";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), GatewayModule],
})
export class AppModule {}
