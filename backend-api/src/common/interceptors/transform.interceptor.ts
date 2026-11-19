import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: any;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((res) => {
        // If response is already formatted as ApiResponse, pass it through
        if (res && typeof res === 'object' && 'success' in res && 'data' in res) {
          return res;
        }

        // Check if response contains custom message or meta
        if (res && typeof res === 'object' && ('_message' in res || '_meta' in res)) {
          const { _message, _meta, ...cleanData } = res;
          return {
            success: true,
            message: _message || 'Thao tác thành công',
            data: cleanData.data !== undefined ? cleanData.data : cleanData,
            meta: _meta,
          };
        }

        // If response contains { data, meta } structure
        if (res && typeof res === 'object' && 'data' in res && 'meta' in res) {
          return {
            success: true,
            message: 'Thao tác thành công',
            data: res.data,
            meta: res.meta,
          };
        }

        return {
          success: true,
          message: 'Thao tác thành công',
          data: res ?? null,
        };
      }),
    );
  }
}

