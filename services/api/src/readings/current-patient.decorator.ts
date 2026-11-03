import { UnauthorizedException, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { PatientContext } from './readings.service';

/** Reads only `request.auth` (set by the token guard, ADR-0012), never the body, headers or query. */
export function currentPatientFromRequest(request?: { auth?: Partial<PatientContext>; [other: string]: unknown }): PatientContext {
  const auth = request?.auth;
  if (!auth?.tenantId || !auth?.patientId) throw new UnauthorizedException();
  return { tenantId: auth.tenantId, patientId: auth.patientId };
}

export const CurrentPatient = createParamDecorator((_data: unknown, host: ExecutionContext) =>
  currentPatientFromRequest(host.switchToHttp().getRequest()),
);
