import { Controller, Get } from '@nestjs/common';
import { ClubSettingsReader } from './club-settings.reader';

export type PublicClubSettings = {
  'club.registration.inviteOnly': boolean;
  'club.landing.publicSections': string[];
};

@Controller('settings')
export class PublicSettingsController {
  constructor(private readonly clubSettings: ClubSettingsReader) {}

  @Get('public')
  async getPublic(): Promise<PublicClubSettings> {
    const club = await this.clubSettings.resolve();
    return {
      'club.registration.inviteOnly': club.registrationInviteOnly,
      'club.landing.publicSections': club.landingPublicSections,
    };
  }
}
