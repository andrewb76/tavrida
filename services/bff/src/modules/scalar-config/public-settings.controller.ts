import { Controller, Get } from '@nestjs/common';
import { AuctionSettingsReader } from './auction-settings.reader';
import { ClubSettingsReader } from './club-settings.reader';

export type PublicClubSettings = {
  'club.registration.inviteOnly': boolean;
  'club.landing.publicSections': string[];
  'auction.lot.image.aspectWidth': number;
  'auction.lot.image.aspectHeight': number;
};

@Controller('settings')
export class PublicSettingsController {
  constructor(
    private readonly clubSettings: ClubSettingsReader,
    private readonly auctionSettings: AuctionSettingsReader,
  ) {}

  @Get('public')
  async getPublic(): Promise<PublicClubSettings> {
    const [club, aspect] = await Promise.all([
      this.clubSettings.resolve(),
      this.auctionSettings.lotImageAspect(),
    ]);
    return {
      'club.registration.inviteOnly': club.registrationInviteOnly,
      'club.landing.publicSections': club.landingPublicSections,
      'auction.lot.image.aspectWidth': aspect.aspectWidth,
      'auction.lot.image.aspectHeight': aspect.aspectHeight,
    };
  }
}
