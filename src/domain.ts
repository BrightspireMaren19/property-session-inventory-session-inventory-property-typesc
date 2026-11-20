export type Session = {
  session_id: string;
  user_id: string;
  device_label: string;
  last_seen_at: string;
};

export type MaintenanceRequest = {
  id: string;
  property_id: string;
  summary: string;
  status: "open" | "scheduled" | "closed";
};

export type TenantDocument = {
  id: string;
  tenant_id: string;
  kind: "lease" | "identity" | "insurance";
  expires_on: string;
};

export type InspectionReminder = {
  id: string;
  property_id: string;
  due_on: string;
  label: string;
};
