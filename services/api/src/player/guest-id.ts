import { BadRequestException } from '@nestjs/common';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Returns the guest id from the `x-guest-id` header, or throws 400 when missing or not a UUID. */
export function assertGuestId(header: string | undefined): string {
  if (!header || !UUID.test(header)) {
    throw new BadRequestException('x-guest-id header must be a UUID');
  }
  return header;
}
