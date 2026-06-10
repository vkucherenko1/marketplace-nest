import "reflect-metadata";
import { VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 8080), "0.0.0.0");
}

void bootstrap();
