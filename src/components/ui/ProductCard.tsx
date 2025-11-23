import React from 'react';
import { ShoppingCart, Tag, Hash } from 'lucide-react';
import { Button } from './button';

interface Product {
  name: string;
  category: string;
  quantity?: number;
  description: string;
  searchTerms: string[];
}

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const amazonSearchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(product.searchTerms[0] || product.name)}`;

  return (
    <div className="group bg-white border border-stone-200 rounded-lg p-3 hover:border-stone-300 hover:shadow-sm transition-all">
      <div className="flex items-start gap-3">
        {/* Icon/Badge */}
        <div className="shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
          <Tag className="w-5 h-5 text-blue-600" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-medium text-sm text-stone-900 line-clamp-1">
              {product.name}
            </h4>
            {product.quantity && (
              <span className="shrink-0 inline-flex items-center gap-1 text-xs text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full">
                <Hash className="w-3 h-3" />
                {product.quantity}
              </span>
            )}
          </div>

          <p className="text-xs text-stone-500 line-clamp-2 mb-2">
            {product.description}
          </p>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-stone-400 capitalize bg-stone-50 px-2 py-0.5 rounded">
              {product.category}
            </span>

            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              onClick={() => window.open(amazonSearchUrl, '_blank')}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Find on Amazon
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
