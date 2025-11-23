export interface DecorateImageRequest {
  image: File;
  prompt: string;
}

export interface DecorateImageResponse {
  decoratedImage: string;
}

export interface AnalyzeProductsRequest {
  originalImage: string;
  decoratedImage: string;
  theme?: string;
}

export interface Product {
  name: string;
  category: string;
  quantity?: number;
  description: string;
  searchTerms: string[];
}

export interface ProductAnalysisResponse {
  products: {
    products: Product[];
    overallTheme: string;
    colorScheme: string[];
    estimatedTotalItems: number;
  };
}

export type DecorationTheme = 
  | 'halloween'
  | 'christmas'
  | 'easter'
  | 'thanksgiving'
  | 'valentines'
  | 'birthday'
  | 'wedding'
  | 'baby-shower'
  | 'new-year'
  | 'fourth-of-july'
  | 'custom';

export interface DecorationSession {
  id: string;
  originalImage: string;
  decoratedImage?: string;
  theme: DecorationTheme;
  prompt: string;
  products?: Product[];
  createdAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}