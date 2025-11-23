import React from 'react';
import { ExternalLink, ShoppingCart } from 'lucide-react';
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
  const amazonSearchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(product.searchTerms[0])}`;

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-stone-900 mb-1">{product.name}</h3>
          <p className="text-sm text-stone-500 mb-2">{product.description}</p>
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <span className="bg-stone-100 px-2 py-1 rounded">{product.category}</span>
            {product.quantity && (
              <span className="bg-stone-100 px-2 py-1 rounded">Qty: {product.quantity}</span>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 hover:bg-stone-900 hover:text-white transition-colors"
          onClick={() => window.open(amazonSearchUrl, '_blank')}
        >
          <ShoppingCart className="w-4 h-4 mr-1" />
          Shop
        </Button>
      </div>

      {/* Search terms for reference */}
      {product.searchTerms.length > 1 && (
        <div className="mt-3 pt-3 border-t border-stone-100">
          <div className="flex flex-wrap gap-1">
            {product.searchTerms.slice(1).map((term, idx) => (
              <a
                key={idx}
                href={`https://www.amazon.com/s?k=${encodeURIComponent(term)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
              >
                {term}
                <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
