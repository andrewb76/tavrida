import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserProfileClient {
  private readonly baseUrl: string;
  private readonly logger = new Logger(UserProfileClient.name);

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('USER_PROFILE_URL', 'http://localhost:3007');
  }

  async adjustCounts(userId: string, input: { postDelta?: number; commentDelta?: number }): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/internal/v1/ratings/${encodeURIComponent(userId)}/counts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        this.logger.warn(`adjustCounts failed for ${userId}: ${res.status} ${await res.text()}`);
      }
    } catch (err) {
      this.logger.warn(`adjustCounts network error for ${userId}: ${err}`);
    }
  }
}
