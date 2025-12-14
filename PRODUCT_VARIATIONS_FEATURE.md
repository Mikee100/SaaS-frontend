# Product Variations Feature - Frontend

This document describes the frontend implementation of the product variations feature.

## Components

### VariationManager

Location: `src/components/products/VariationManager.tsx`

A comprehensive component for managing product variations.

**Props:**
- `productId`: The product ID
- `baseSku`: Base SKU for generating variation SKUs
- `basePrice`: Base price (used as default)
- `baseCost`: Base cost (used as default)
- `branchId`: Optional branch ID
- `onVariationsChange`: Callback when variations change

**Features:**
- View all variations in a table
- Generate variations from attributes (all combinations)
- Create individual variations manually
- Edit variation prices, costs, and stock
- Delete variations

**Usage:**
```tsx
<VariationManager
  productId={product.id}
  baseSku={product.sku}
  basePrice={product.price}
  baseCost={product.cost}
  branchId={selectedBranchId}
  onVariationsChange={(variations) => {
    console.log('Variations updated:', variations);
  }}
/>
```

### ProductAttributesManager

Location: `src/components/products/ProductAttributesManager.tsx`

Component for managing product attributes (Color, Size, Storage, etc.).

**Features:**
- View all attributes
- Create new attributes
- Add/remove attribute values
- Support for color picker for color attributes
- Delete attributes

**Usage:**
```tsx
<ProductAttributesManager />
```

## API Integration

All API calls are handled through:
- `src/lib/api/product-variations.ts`

### Product Attributes API

```typescript
import { productAttributesApi } from '@/lib/api/product-variations';

// Get all attributes
const attributes = await productAttributesApi.getAll();

// Create attribute
await productAttributesApi.create({
  name: 'Color',
  displayName: 'Color',
  type: 'color',
  values: [
    { value: 'Black', displayName: 'Black' },
    { value: 'Grey', displayName: 'Grey' },
  ],
});

// Add value to attribute
await productAttributesApi.addValue(attributeId, {
  value: 'White',
  displayName: 'White',
  color: '#FFFFFF',
});
```

### Product Variations API

```typescript
import { productVariationsApi } from '@/lib/api/product-variations';

// Get variations for a product
const variations = await productVariationsApi.getByProduct(productId);

// Generate variations
const result = await productVariationsApi.generate(productId, {
  productId,
  attributes: [
    { attributeName: 'Color', values: ['Black', 'Grey'] },
    { attributeName: 'Size', values: ['38', '39', '40'] },
  ],
  skuPrefix: 'PROD',
});

// Create single variation
await productVariationsApi.create(productId, {
  productId,
  sku: 'PROD-BLK-38',
  attributes: { Color: 'Black', Size: '38' },
  price: 50,
  cost: 30,
  stock: 10,
});
```

## Integration with Product Pages

### Product Detail Page

Add the VariationManager to the product detail page:

```tsx
import VariationManager from '@/components/products/VariationManager';

// In your product detail component
{product.hasVariations && (
  <VariationManager
    productId={product.id}
    baseSku={product.sku}
    basePrice={product.price}
    baseCost={product.cost}
    branchId={selectedBranchId}
  />
)}
```

### Product Creation/Edit Form

Add variation support to product forms:

```tsx
import { useState } from 'react';
import VariationManager from '@/components/products/VariationManager';

function ProductForm({ product }) {
  const [hasVariations, setHasVariations] = useState(product?.hasVariations || false);

  return (
    <form>
      {/* Product fields */}
      
      <div>
        <label>
          <input
            type="checkbox"
            checked={hasVariations}
            onChange={(e) => setHasVariations(e.target.checked)}
          />
          This product has variations
        </label>
      </div>

      {hasVariations && product?.id && (
        <VariationManager
          productId={product.id}
          baseSku={product.sku}
          basePrice={product.price}
          baseCost={product.cost}
        />
      )}
    </form>
  );
}
```

## Types

All types are defined in:
- `src/types/product-variations.ts`

Key types:
- `ProductAttribute`: Attribute definition
- `ProductAttributeValue`: Attribute value
- `ProductVariation`: Product variation
- `VariationAttributeInput`: For generating variations
- `CreateVariationRequest`: For creating variations

## Styling

Components use Tailwind CSS classes. Customize as needed for your design system.

## Future Enhancements

- [ ] Variation image upload
- [ ] Drag-and-drop attribute value ordering
- [ ] Bulk edit variations
- [ ] Variation templates
- [ ] Variation analytics dashboard
- [ ] Export variations to CSV/Excel
