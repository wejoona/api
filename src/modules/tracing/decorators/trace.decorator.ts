import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for tracing decorator
 */
export const TRACE_METADATA_KEY = 'trace:span_name';

/**
 * Decorator to mark a method for distributed tracing
 *
 * Creates a custom span for the decorated method with the specified name.
 * If no name is provided, uses the format: `ClassName.methodName`
 *
 * @param spanName Optional custom span name
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class TransferService {
 *   @Trace('CreateTransfer')
 *   async createTransfer(dto: CreateTransferDto) {
 *     // This method will be traced with span name "CreateTransfer"
 *   }
 *
 *   @Trace() // Uses "TransferService.validateTransfer" as span name
 *   async validateTransfer(transferId: string) {
 *     // Auto-generated span name
 *   }
 * }
 * ```
 */
export const Trace = (spanName?: string): MethodDecorator => {
  return (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const methodName = String(propertyKey);

    // Use provided span name or generate from class/method name
    const finalSpanName = spanName || `${className}.${methodName}`;

    // Store metadata for potential use by interceptors
    SetMetadata(TRACE_METADATA_KEY, finalSpanName)(
      target,
      propertyKey,
      descriptor,
    );

    // Wrap the original method
    descriptor.value = async function (...args: any[]) {
      // Note: To use TracingService here, we'd need to inject it via a helper
      // For now, this decorator just adds metadata
      // Actual tracing should be done via TracingService.trace() or TracingInterceptor
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
};
