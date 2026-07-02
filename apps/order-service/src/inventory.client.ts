import { BadGatewayException, ConflictException, Injectable } from "@nestjs/common";
import type {
  InventoryActionResponse,
  InventoryOrderRequest,
  ReleaseInventoryRequest,
  ReserveInventoryRequest,
  ReserveInventoryResponse,
} from "@marketplace/contracts";

@Injectable()
export class InventoryClient {
  private readonly catalogUrl =
    process.env.CATALOG_SERVICE_URL ?? "http://localhost:3002";

  async reserve(input: ReserveInventoryRequest): Promise<ReserveInventoryResponse> {
    const response = await fetch(
      `${this.catalogUrl}/v1/internal/inventory/reservations`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-token":
            process.env.INTERNAL_SERVICE_TOKEN ?? "local-internal-token",
        },
        body: JSON.stringify(input),
      },
    );
    if (response.status === 409) {
      throw new ConflictException("Insufficient inventory");
    }
    if (!response.ok) {
      throw new BadGatewayException("Inventory service unavailable");
    }
    return (await response.json()) as ReserveInventoryResponse;
  }

  confirm(input: InventoryOrderRequest): Promise<InventoryActionResponse> {
    return this.postInventoryAction("confirm", input, "Reservation cannot be confirmed");
  }

  release(input: ReleaseInventoryRequest): Promise<InventoryActionResponse> {
    return this.postInventoryAction("release", input, "Reservation cannot be released");
  }

  private async postInventoryAction(
    action: "confirm" | "release",
    input: InventoryOrderRequest | ReleaseInventoryRequest,
    conflictMessage: string,
  ): Promise<InventoryActionResponse> {
    const response = await fetch(
      `${this.catalogUrl}/v1/internal/inventory/reservations/${action}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-token":
            process.env.INTERNAL_SERVICE_TOKEN ?? "local-internal-token",
        },
        body: JSON.stringify(input),
      },
    );
    if (response.status === 409) {
      throw new ConflictException(conflictMessage);
    }
    if (!response.ok) {
      throw new BadGatewayException("Inventory service unavailable");
    }
    return (await response.json()) as InventoryActionResponse;
  }
}
