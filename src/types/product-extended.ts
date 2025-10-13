import { ProductAttribute } from './product';

export interface CategoryConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  attributes: ProductAttribute[];
  requiredFields: string[];
  recommendedFields: string[];
  customFields: string[];
}
