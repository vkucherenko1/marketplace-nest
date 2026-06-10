import { Module } from "@nestjs/common";
import { GatewayController } from "./gateway.controller";
import { ServiceProxy } from "./service-proxy.service";

@Module({
  controllers: [GatewayController],
  providers: [ServiceProxy],
})
export class GatewayModule {}
