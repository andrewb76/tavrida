import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InfluxDB, Point, WriteApi } from '@influxdata/influxdb-client';

@Injectable()
export class InfluxService implements OnModuleDestroy {
  private readonly logger = new Logger(InfluxService.name);
  private readonly writeApi: WriteApi | null = null;
  private readonly enabled: boolean;

  constructor() {
    const url = process.env.INFLUXDB_URL;
    const token = process.env.INFLUXDB_TOKEN;
    const org = process.env.INFLUXDB_ORG ?? 'tavrida';

    if (!url || !token) {
      this.logger.warn('InfluxDB not configured (INFLUXDB_URL/INFLUXDB_TOKEN missing) — analytics disabled');
      this.enabled = false;
      return;
    }

    this.enabled = true;
    const client = new InfluxDB({ url, token });
    const bucket = process.env.INFLUXDB_BUCKET ?? 'presence';
    this.writeApi = client.getWriteApi(org, bucket, 'ns', {
      flushInterval: 10_000,
    });
    this.logger.log(`InfluxDB connected: ${url}`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.writeApi) {
      await this.writeApi.close();
    }
  }

  writePresenceChange(userId: string, status: string): void {
    if (!this.enabled || !this.writeApi) return;
    const point = new Point('presence_change')
      .tag('user_id', userId)
      .tag('status', status)
      .floatField('value', 1);
    this.writeApi.writePoint(point);
  }

  writeSnapshot(statusCounts: Record<string, number>): void {
    if (!this.enabled || !this.writeApi) return;
    for (const [status, count] of Object.entries(statusCounts)) {
      const point = new Point('presence_snapshot')
        .tag('status', status)
        .intField('count', count);
      this.writeApi.writePoint(point);
    }
  }

  writeSessionDuration(userId: string, durationSeconds: number): void {
    if (!this.enabled || !this.writeApi) return;
    const point = new Point('session_duration')
      .tag('user_id', userId)
      .floatField('duration_seconds', durationSeconds);
    this.writeApi.writePoint(point);
  }
}
