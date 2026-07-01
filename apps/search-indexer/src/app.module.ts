import { Module } from "@nestjs/common";
import { SearchController } from "./search.controller";
import { SearchEventSubscriber } from "./search-event-subscriber";
import { SearchService } from "./search.service";

@Module({
  controllers: [SearchController],
  providers: [SearchService, SearchEventSubscriber],
})
export class AppModule {}
