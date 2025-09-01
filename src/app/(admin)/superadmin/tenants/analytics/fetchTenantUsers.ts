import { apiGet } from "@/utils/api";

export async function fetchTenantUsers(tenantId: string) {
  if (!tenantId) return [];
  try {
    const users = await apiGet(`/user?tenantId=${tenantId}`);
    return Array.isArray(users) ? users : [];
  } catch (err) {
    return [];
  }
}
