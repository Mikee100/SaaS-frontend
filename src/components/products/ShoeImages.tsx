import React from 'react';
import { FiUpload, FiX } from 'react-icons/fi';
import Image from 'next/image';

interface ProductImage {
  id: string;
  file: File;
  url: string;
  alt: string;
}

interface ShoeImagesProps {
  productImages: ProductImage[];
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (imageId: string) => void;
}

export default function ShoeImages({ productImages, onImageUpload, onRemoveImage }: ShoeImagesProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Product Images</h2>
      <div className="space-y-4">
        {/* Image Upload Area */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
          <div className="mt-4">
            <label htmlFor="image-upload" className="cursor-pointer">
              <span className="mt-2 block text-sm font-medium text-gray-900">
                Upload shoe images
              </span>
              <span className="mt-1 block text-sm text-gray-500">
                PNG, JPG, GIF up to 10MB each
              </span>
            </label>
            <input
              id="image-upload"
              name="images"
              type="file"
              multiple
              accept="image/*"
              onChange={onImageUpload}
              className="sr-only"
            />
          </div>
        </div>

        {/* Image Preview */}
        {productImages.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {productImages.map((image) => (
              <div key={image.id} className="relative group">
                <Image
                  src={image.url}
                  alt={image.alt}
                  width={200}
                  height={96}
                  className="w-full h-24 object-cover rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => onRemoveImage(image.id)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <FiX className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
