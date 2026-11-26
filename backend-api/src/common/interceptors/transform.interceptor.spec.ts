import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor (API Response Envelope)', () => {
  let interceptor: TransformInterceptor<unknown>;
  const mockContext = {} as ExecutionContext;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  it('should wrap plain array/object into standard { success, message, data } envelope', async () => {
    const next: CallHandler = {
      handle: () => of([{ id: 'u1', fullName: 'Nguyễn Văn A' }]),
    };

    const result = await lastValueFrom(interceptor.intercept(mockContext, next));

    expect(result).toEqual({
      success: true,
      message: 'Thao tác thành công',
      data: [{ id: 'u1', fullName: 'Nguyễn Văn A' }],
    });
  });

  it('should preserve { data, meta } pagination envelope', async () => {
    const next: CallHandler = {
      handle: () =>
        of({
          data: [{ id: 'u1' }],
          meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
        }),
    };

    const result = await lastValueFrom(interceptor.intercept(mockContext, next));

    expect(result).toEqual({
      success: true,
      message: 'Thao tác thành công',
      data: [{ id: 'u1' }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  });

  it('should pass through already-formatted ApiResponse without double wrapping', async () => {
    const preformatted = {
      success: true,
      message: 'Custom message',
      data: { id: 'f1' },
    };
    const next: CallHandler = {
      handle: () => of(preformatted),
    };

    const result = await lastValueFrom(interceptor.intercept(mockContext, next));
    expect(result).toEqual(preformatted);
  });
});
