/** Set on the request by the Access & app shell epic's authentication. */
export interface Principal {
  userId: string;
  tenantId: string;
  roles: string[];
}
