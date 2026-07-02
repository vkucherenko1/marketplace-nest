import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { CheckoutRequest, OrderSummary } from "@marketplace/contracts";
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from "./common/access-token.guard";
import { OrderService } from "./order.service";

@Controller()
export class OrderController {
  constructor(private readonly orders: OrderService) {}

  @Get("health")
  health(): { status: "ok"; service: "order-service" } {
    return { status: "ok", service: "order-service" };
  }

  @Post("checkout")
  @UseGuards(AccessTokenGuard)
  checkout(
    @Req() request: AuthenticatedRequest,
    @Body() body: CheckoutRequest,
  ): Promise<OrderSummary> {
    return this.orders.createCheckout(request.user.sub, body);
  }

  @Get("orders")
  @UseGuards(AccessTokenGuard)
  list(@Req() request: AuthenticatedRequest): Promise<OrderSummary[]> {
    return this.orders.listOrders(request.user.sub);
  }

  @Get("orders/:id")
  @UseGuards(AccessTokenGuard)
  get(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<OrderSummary> {
    return this.orders.getOrder(request.user.sub, id);
  }

  @Post("orders/:id/confirm")
  @UseGuards(AccessTokenGuard)
  confirm(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<OrderSummary> {
    return this.orders.confirmOrder(request.user.sub, id);
  }

  @Post("orders/:id/cancel")
  @UseGuards(AccessTokenGuard)
  cancel(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<OrderSummary> {
    return this.orders.cancelOrder(request.user.sub, id);
  }
}
