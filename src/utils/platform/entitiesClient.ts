import { apiGet, apiPost } from '@/utils/api';

export type PlatformEntityType = 'MENU_ITEM' | 'PRODUCT_STYLE' | 'RETAIL_PRODUCT' | 'SERVICE';

export interface PlatformWorkflowStep {
  key: string;
  label: string;
  required: boolean;
}

export interface PlatformEntityWorkflowResponse {
  tenantId: string;
  entityType: PlatformEntityType;
  workflow: PlatformWorkflowStep[];
}

export interface CreatePlatformEntityPayload {
  entityType: PlatformEntityType;
  name: string;
  category?: string;
  sku?: string;
  basePrice: number;
  quantity?: number;
  attributes?: Record<string, unknown>;
  variantAttributes?: Array<Record<string, unknown>>;
  durationMinutes?: number;
}

export async function createPlatformEntity(
  payload: CreatePlatformEntityPayload,
  branchId?: string,
) {
  return apiPost('/platform/entities', payload, branchId ? { 'x-branch-id': branchId } : undefined);
}

export async function getPlatformEntityWorkflow(
  entityType: PlatformEntityType,
  branchId?: string,
): Promise<PlatformEntityWorkflowResponse> {
  return apiGet<PlatformEntityWorkflowResponse>(
    `/platform/entities/workflow/${entityType}`,
    branchId ? { 'x-branch-id': branchId } : undefined,
  );
}
