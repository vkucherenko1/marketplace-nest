import {
  BadGatewayException,
  HttpException,
  Injectable,
} from "@nestjs/common";

@Injectable()
export class ServiceProxy {
  async request<T>(
    baseUrl: string,
    path: string,
    options: {
      method?: "GET" | "POST" | "PATCH" | "DELETE";
      body?: unknown;
      authorization?: string;
    } = {},
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3_000);
    try {
      // Gateway ограничивает время ожидания, чтобы зависший микросервис
      // не исчерпал пул соединений публичного API.
      const response = await fetch(`${baseUrl}/v1/${path}`, {
        method: options.method ?? "GET",
        headers: {
          ...(options.body ? { "content-type": "application/json" } : {}),
          ...(options.authorization
            ? { authorization: options.authorization }
            : {}),
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({
          message: "Upstream service error",
        }));
        throw new HttpException(body, response.status);
      }
      if (response.status === 204) {
        return undefined as T;
      }
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadGatewayException("Dependent service is unavailable");
    } finally {
      clearTimeout(timeout);
    }
  }
}
