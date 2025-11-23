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
  price?: string;
  asin?: string;
}

interface ProductCardProps {
  product: Product;
}

const categoryColors: Record<string, { bg: string; text: string; icon: string }> = {
  furniture: { bg: 'from-amber-50 to-orange-50', text: 'text-amber-700', icon: 'bg-amber-500' },
  lighting: { bg: 'from-yellow-50 to-amber-50', text: 'text-yellow-700', icon: 'bg-yellow-500' },
  decor: { bg: 'from-purple-50 to-pink-50', text: 'text-purple-700', icon: 'bg-purple-500' },
  accessories: { bg: 'from-blue-50 to-indigo-50', text: 'text-blue-700', icon: 'bg-blue-500' },
  default: { bg: 'from-slate-50 to-slate-100', text: 'text-slate-700', icon: 'bg-slate-500' },
};

export default function ProductCard({ product }: ProductCardProps) {
  const fallbackSearch = `https://www.amazon.com/s?k=${encodeURIComponent(product.searchTerms[0] || product.name)}`;
  const targetUrl = product.linkUrl || fallbackSearch;
  const colors = categoryColors[product.category.toLowerCase()] || categoryColors.default;

  return (
    <div className="group relative bg-white rounded-xl p-4 border border-slate-200/70 hover:border-slate-300 hover:shadow-md transition-all duration-200 overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} opacity-0 group-hover:opacity-20 transition-opacity duration-200`} />

      <div className="relative flex items-start gap-3.5">
        {product.imageUrl ? (
          <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shadow-sm group-hover:scale-105 transition-transform duration-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className={`shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br ${colors.bg} border border-slate-200/50 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200`}>
            <Tag className={`w-5 h-5 ${colors.text}`} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h4 className="font-semibold text-sm text-slate-900 line-clamp-1">
              {product.name}
            </h4>
            {product.quantity && (
              <div className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                <Hash className="w-3 h-3" />
                <span>{product.quantity}</span>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">
            {product.description}
          </p>

          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <span className={`text-xs font-medium ${colors.text} capitalize bg-gradient-to-r ${colors.bg} px-2.5 py-1 rounded-lg border border-slate-200/50`}>
                {product.category}
              </span>
              {product.price && (
                <span className="text-xs font-semibold text-slate-900">
                  {product.price}
                </span>
              )}
            </div>

            <Button
              size="sm"
              className="h-8 px-3 text-xs gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm hover:shadow transition-all duration-200 group/btn"
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
