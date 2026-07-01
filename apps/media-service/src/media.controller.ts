import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import type {
  MediaUploadRequest,
  MediaUploadTicket,
} from "@marketplace/contracts";
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from "./common/access-token.guard";
import { MediaService } from "./media.service";

@Controller()
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get("health")
  health(): { status: "ok"; service: "media-service" } {
    return { status: "ok", service: "media-service" };
  }

  @Post("media/uploads/sign")
  @UseGuards(AccessTokenGuard)
  signUpload(
    @Req() request: AuthenticatedRequest,
    @Body() body: MediaUploadRequest,
  ): Promise<MediaUploadTicket> {
    return this.media.signUpload(request.user.sub, body);
  }
}
