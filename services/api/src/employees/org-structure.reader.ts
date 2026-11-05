export interface OrgOption {
  id: string;
  name: string;
}

/** Owned by the Organization structure epic; the only source of department, job title and manager choices. */
export interface OrgStructureReader {
  departments(tenantId: string): Promise<OrgOption[]>;
  jobTitles(tenantId: string): Promise<OrgOption[]>;
  managers(tenantId: string): Promise<OrgOption[]>;
}
