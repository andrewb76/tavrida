
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../../modules/metrics/metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const path = req.route?.path || req.url;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const status = context.switchToHttp().getResponse().statusCode;
          const duration = (Date.now() - start) / 1000;
          this.metrics.httpRequestsTotal.inc({ method, path, status });
          this.metrics.httpRequestDuration.observe({ method, path, status }, duration);
        },
        error: (error) => {
          const status = error.status || 500;
          const duration = (Date.now() - start) / 1000;
          this.metrics.httpRequestsTotal.inc({ method, path, status });
          this.metrics.httpRequestDuration.observe({ method, path, status }, duration);
        },
      }),
    );
  }
}
