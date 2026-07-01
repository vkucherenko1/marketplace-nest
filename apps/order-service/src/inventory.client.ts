import { BadGatewayException, ConflictException, Injectable } from "@nestjs/common";
import type {
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
}
