'use client';

/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { Loader2 } from 'lucide-react';

interface RenderPreviewProps {
  imageUrl: string | null;
  isLoading: boolean;
}

export default function RenderPreview({ imageUrl, isLoading }: RenderPreviewProps) {
  return (
    <div className="h-full w-full bg-neutral-900 flex items-center justify-center relative overflow-hidden border-l border-neutral-800">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      )}

      {imageUrl ? (
        <img src={imageUrl} alt="Photorealistic Render" className="max-w-full max-h-full object-contain" />
      ) : (
        <div className="text-neutral-500 text-sm">Make changes and press Regenerate to see the render.</div>
      )}
    </div>
  );
}
