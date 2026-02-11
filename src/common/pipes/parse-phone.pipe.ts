import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParsePhonePipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!value) throw new BadRequestException('Phone number is required');
    const cleaned = value.replace(/[\s\-()]/g, '');
    if (!/^\+\d{8,15}$/.test(cleaned)) {
      throw new BadRequestException('Invalid phone number. Must be E.164 (e.g., +2250700000000)');
    }
    return cleaned;
  }
}
