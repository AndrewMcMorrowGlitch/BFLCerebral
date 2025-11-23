import React from 'react';
import { ShoppingCart, Tag, Hash, ExternalLink } from 'lucide-react';
import { Button } from './button';

interface Product {
  name: string;
  category: string;
  quantity?: number;
  description: string;
  searchTerms: string[];
  linkUrl?: string;
  imageUrl?: string;
}

interface ProductCardProps {
  product: Product;
}

const categoryColors: Record<string, { bg: string; text: string; icon: string }> = {
  furniture: { bg: 'from-amber-50 to-orange-50', text: 'text-amber-700', icon: 'bg-amber-500' },
  lighting: { bg: 'from-yellow-50 to-amber-50', text: 'text-yellow-700', icon: 'bg-yellow-500' },
  decor: { bg: 'from-purple-50 to-pink-50', text: 'text-purple-700', icon: 'bg-purple-500' },
  accessories: { bg: 'from-blue-50 to-cyan-50', text: 'text-blue-700', icon: 'bg-blue-500' },
  default: { bg: 'from-stone-50 to-stone-100', text: 'text-stone-700', icon: 'bg-stone-500' },
};

export default function ProductCard({ product }: ProductCardProps) {
  const fallbackSearch = `https://www.amazon.com/s?k=${encodeURIComponent(product.searchTerms[0] || product.name)}`;
  const targetUrl = product.linkUrl || fallbackSearch;
  const colors = categoryColors[product.category.toLowerCase()] || categoryColors.default;

  return (
    <div className="group relative bg-white rounded-xl p-4 border border-stone-200/60 hover:border-stone-300 hover:shadow-lg hover:shadow-stone-200/50 transition-all duration-300 overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} opacity-0 group-hover:opacity-30 transition-opacity duration-300`} />

      <div className="relative flex items-start gap-4">
        {product.imageUrl ? (
          <div className="shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-stone-200 bg-stone-50 shadow-sm group-hover:scale-105 transition-transform duration-300">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className={`shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${colors.bg} border border-stone-200/50 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}>
            <Tag className={`w-5 h-5 ${colors.text}`} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h4 className="font-semibold text-sm text-stone-900 line-clamp-1 group-hover:text-stone-950 transition-colors">
              {product.name}
            </h4>
            {product.quantity && (
              <div className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-stone-700 bg-gradient-to-br from-stone-100 to-stone-50 px-2.5 py-1 rounded-lg border border-stone-200/50 shadow-sm">
                <Hash className="w-3 h-3" />
                <span>{product.quantity}</span>
              </div>
            )}
          </div>

          <p className="text-xs text-stone-600 line-clamp-2 mb-3 leading-relaxed">
            {product.description}
          </p>

          <div className="flex items-center justify-between gap-3">
            <span className={`text-xs font-medium ${colors.text} capitalize bg-gradient-to-r ${colors.bg} px-3 py-1 rounded-lg border border-stone-200/40`}>
              {product.category}
            </span>

            <Button
              size="sm"
              className="h-8 px-3 text-xs gap-1.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm hover:shadow-md transition-all duration-200 group/btn"
              onClick={() => window.open(targetUrl, '_blank')}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Shop</span>
              <ExternalLink className="w-3 h-3 opacity-0 group-hover/btn:opacity-100 -ml-1 group-hover/btn:ml-0 transition-all duration-200" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
