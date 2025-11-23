'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, Share2, Maximize2, Package, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ImageUploader from "@/components/ui/ImageUploader";
import MessageBubble from "@/components/ui/MessageBubble";
import ProductCard from "@/components/ui/ProductCard";
import { cn } from "@/lib/utils";

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

interface ProductGroup {
  id: string;
  timestamp: number;
  prompt: string;
  products: Product[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content?: string;
  imageUrl?: string;
  type: 'text' | 'image';
}

interface Project {
  id: string;
  current_image_url: string;
  original_image_url?: string;
  productGroups?: ProductGroup[];
}

type SpatialBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type SpatialRegion = {
  id: string;
  label?: string;
  box: SpatialBox;
  note?: string;
};

type SpatialPath = {
  id: string;
  points: Array<{ x: number; y: number }>;
  label?: string;
};

type SpatialMeasurement = {
  id: string;
  label?: string;
  description?: string;
  width_ratio?: number;
  height_ratio?: number;
  region_ref?: string;
};

type ProportionMetrics = {
  sofa_room_width_ratio?: number | null;
  sofa_room_height_ratio?: number | null;
  walkway_width_ratio?: number | null;
  estimated_room_depth?: number | null;
  window_wall_ratio?: number | null;
  door_wall_ratio?: number | null;
};

type SpatialInsights = {
  windows?: SpatialRegion[];
  doors?: SpatialRegion[];
  furniture?: SpatialRegion[];
  walkways?: SpatialPath[];
  empty_zones?: SpatialRegion[];
  obstructions?: SpatialRegion[];
  depth_cues?: string[];
  metadata?: {
    notes?: string[];
    circulation?: string[];
  };
  proportions?: ProportionMetrics;
  measurements?: SpatialMeasurement[];
};

type DesignSuggestionEntry = {
  id: string;
  description: string;
  region_ref?: string;
};

type ProductSuggestion = {
  id: string;
  query: string;
  notes?: string;
  region_ref?: string;
};

type DesignSuggestions = {
  layout_issues?: DesignSuggestionEntry[];
  improvement_suggestions?: DesignSuggestionEntry[];
  product_suggestions?: ProductSuggestion[];
  measurements?: DesignSuggestionEntry[];
};

export default function Home() {
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [spatialViewEnabled, setSpatialViewEnabled] = useState(false);
  const [spatialDataMap, setSpatialDataMap] = useState<Record<string, SpatialInsights>>({});
  const [spatialLoading, setSpatialLoading] = useState(false);
  const [spatialError, setSpatialError] = useState<string | null>(null);
  const [designSuggestionsMap, setDesignSuggestionsMap] = useState<Record<string, DesignSuggestions>>({});
  const [designSuggestionsLoading, setDesignSuggestionsLoading] = useState(false);
  const [designSuggestionsError, setDesignSuggestionsError] = useState<string | null>(null);
  const [highlightedRegion, setHighlightedRegion] = useState<string | null>(null);
  const [suggestionsCollapsed, setSuggestionsCollapsed] = useState(false);
  const [shoppingListCollapsed, setShoppingListCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setSpatialViewEnabled(false);
    setSpatialError(null);
    setSpatialLoading(false);
    setDesignSuggestionsError(null);
    setDesignSuggestionsLoading(false);
    setHighlightedRegion(null);
  }, [activeProject?.current_image_url]);

  const handleUploadComplete = (url: string) => {
    const newProject: Project = {
      id: Date.now().toString(),
      current_image_url: url,
      original_image_url: url,
      productGroups: [],
    };
    setActiveProject(newProject);
    setMessages([
      {
        id: 'init',
        role: 'assistant',
        content: "I've loaded your room. What would you like to change? You can ask to change colors, furniture, or style.",
        type: 'text',
      },
    ]);
  };

  const fetchSpatialInsights = async (): Promise<SpatialInsights | undefined> => {
    if (!activeProject) return;
    const key = activeProject.current_image_url;
    if (spatialDataMap[key]) {
      return spatialDataMap[key];
    }

    setSpatialLoading(true);
    setSpatialError(null);
    try {
      const response = await fetch('/api/spatial/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: key,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Spatial analysis failed');
      }

      const data = await response.json();
      setSpatialDataMap((prev) => ({
        ...prev,
        [key]: data,
      }));
      return data;
    } catch (error) {
      console.error('Spatial analysis error', error);
      setSpatialError(
        error instanceof Error ? error.message : 'Spatial analysis failed',
      );
      return;
    } finally {
      setSpatialLoading(false);
    }
  };

  const fetchDesignSuggestions = async (spatialOverride?: SpatialInsights) => {
    if (!activeProject) return;
    const key = activeProject.current_image_url;
    if (designSuggestionsMap[key]) {
      return;
    }
    const spatial = spatialOverride ?? spatialDataMap[key];
    if (!spatial) {
      return;
    }
    try {
      setDesignSuggestionsLoading(true);
      setDesignSuggestionsError(null);
      const response = await fetch('/api/design/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: key,
          spatialJson: spatial,
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Design suggestions failed');
      }
      const data = await response.json();
      setDesignSuggestionsMap((prev) => ({
        ...prev,
        [key]: data,
      }));
    } catch (error) {
      console.error('Design suggestions error', error);
      setDesignSuggestionsError(
        error instanceof Error ? error.message : 'Design suggestions failed',
      );
    } finally {
      setDesignSuggestionsLoading(false);
    }
  };

  const handleSpatialToggle = () => {
    const next = !spatialViewEnabled;
    setSpatialViewEnabled(next);
    if (next) {
      fetchSpatialInsights().then((data) => {
        fetchDesignSuggestions(data);
      });
    } else {
      setHighlightedRegion(null);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeProject) return;

    const userMsg = inputText;
    setInputText("");

    // Add user message
    const userMessageObj: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMsg,
      type: 'text',
    };
    setMessages(prev => [...prev, userMessageObj]);

    setIsAiThinking(true);

    try {
      const referenceImageUrls: string[] = [];

      // Call API to generate new image
      const response = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: activeProject.current_image_url,
          prompt: "photorealistic, interior design, " + userMsg, // Basic prompt engineering
          referenceImageUrls,
        }),
      });

      if (!response.ok) throw new Error('Generation failed');

      const data = await response.json();

      if (data.imageUrl) {
        // Update project image
        setActiveProject(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            current_image_url: data.imageUrl,
          };
        });

        // Add assistant response
        const aiMessageObj: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Here is a version with "${userMsg}". How does this look?`,
          imageUrl: data.imageUrl,
          type: 'image',
        };
        setMessages(prev => [...prev, aiMessageObj]);

        try {
          const productResponse = await fetch('/api/products/smart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageUrl: data.imageUrl,
              userPrompt: userMsg,
            }),
          });
          if (productResponse.ok) {
            const { products } = await productResponse.json();
            if (Array.isArray(products) && products.length > 0) {
              setActiveProject(prev => {
                if (!prev) return prev;
                const existingGroups = prev.productGroups ?? [];

                const newGroup: ProductGroup = {
                  id: Date.now().toString(),
                  timestamp: Date.now(),
                  prompt: userMsg,
                  products: products,
                };

                return {
                  ...prev,
                  productGroups: [...existingGroups, newGroup],
                };
              });
            }
          } else {
            console.warn('Smart product lookup failed', await productResponse.text());
          }
        } catch (smartError) {
          console.warn('Error running smart product search', smartError);
        }
      } else {
        throw new Error(data.warning || 'No image returned');
      }

    } catch (error) {
      console.error('Generation error:', error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I couldn't generate that change. Please try again.",
        type: 'text',
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsAiThinking(false);
    }
  };

  const analyzeProducts = async (originalUrl: string, decoratedUrl: string) => {
    try {
      const response = await fetch('/api/decoration/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalImage: originalUrl,
          decoratedImage: decoratedUrl,
          provider: 'gemini',
        }),
      });

      if (!response.ok) {
        console.error('Product analysis failed');
        return;
      }

      const data = await response.json();
      if (data.products && data.products.products) {
        setActiveProject(prev => prev ? ({ ...prev, products: data.products.products }) : null);
      }
    } catch (error) {
      console.error('Error analyzing products:', error);
    }
  };

  const currentSpatialData = activeProject
    ? spatialDataMap[activeProject.current_image_url]
    : null;
  const currentDesignSuggestions = activeProject
    ? designSuggestionsMap[activeProject.current_image_url]
    : null;
  const showDesignPanel =
    Boolean(currentDesignSuggestions) ||
    designSuggestionsLoading ||
    Boolean(designSuggestionsError);

  // Empty State / Upload
  if (!activeProject) {
    return (
      <div className="relative min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-4 py-12 overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-white">
        {/* Sophisticated Background Effects */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#3b82f608_1px,transparent_1px),linear-gradient(to_bottom,#3b82f608_1px,transparent_1px)] bg-[size:80px_80px] -z-10" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 via-transparent to-indigo-50/40 -z-10" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-400/10 rounded-full mix-blend-multiply filter blur-[100px] animate-blob -z-10" />
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-indigo-400/10 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-2000 -z-10" />
        <div className="absolute bottom-0 left-1/3 w-[600px] h-[600px] bg-violet-400/10 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-4000 -z-10" />

        <div className="container mx-auto max-w-7xl relative z-10">
          {/* Hero Section */}
          <div className="text-center mb-16 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Badge */}
            <div className="inline-flex items-center gap-2.5 bg-white/80 backdrop-blur-xl px-5 py-2.5 rounded-full border border-blue-200/60 shadow-lg shadow-blue-500/5 hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-300/80 transition-all duration-300">
              <div className="relative">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <Sparkles className="w-4 h-4 text-blue-400 absolute inset-0 animate-ping opacity-30" />
              </div>
              <span className="text-sm font-semibold text-slate-700">
                Powered by Advanced AI
              </span>
            </div>

            {/* Main Headline */}
            <div className="space-y-6">
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-[-0.02em] leading-[0.95]">
                <span className="block text-slate-900">
                  Transform Your
                </span>
                <span className="block mt-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  Living Space
                </span>
              </h1>
              <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Upload any room photo and watch AI redesign it instantly with new styles,
                furniture, and decor—complete with shoppable recommendations.
              </p>
            </div>

            {/* CTA Stats */}
            <div className="flex items-center justify-center gap-6 text-sm text-slate-600 font-medium">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" />
                <span>AI Ready</span>
              </div>
              <div className="w-px h-4 bg-slate-200" />
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-900">Instant</span>
                <span>Results</span>
              </div>
              <div className="w-px h-4 bg-slate-200" />
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-900">Free</span>
                <span>to Try</span>
              </div>
            </div>
          </div>

          {/* Upload Area */}
          <div className="max-w-4xl mx-auto mb-20 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
            <ImageUploader onUploadComplete={handleUploadComplete} />
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <div className="group relative bg-white/90 backdrop-blur-xl p-8 rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-300/50 transition-all duration-300 hover:-translate-y-0.5">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative space-y-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-all duration-300">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">AI Generation</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    State-of-the-art AI transforms your space with photorealistic results in seconds
                  </p>
                </div>
              </div>
            </div>

            <div className="group relative bg-white/90 backdrop-blur-xl p-8 rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-lg hover:shadow-indigo-500/10 hover:border-indigo-300/50 transition-all duration-300 hover:-translate-y-0.5">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/40 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative space-y-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-all duration-300">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Smart Shopping</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Get instant product recommendations with direct links for easy purchasing
                  </p>
                </div>
              </div>
            </div>

            <div className="group relative bg-white/90 backdrop-blur-xl p-8 rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-lg hover:shadow-violet-500/10 hover:border-violet-300/50 transition-all duration-300 hover:-translate-y-0.5">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-50/40 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative space-y-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-md shadow-violet-500/20 group-hover:scale-105 transition-all duration-300">
                  <ArrowRight className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Instant Results</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Chat naturally with AI and see real-time design changes as you describe your vision
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Workspace State
  return (
    <div className="h-[calc(100vh-64px)] flex flex-col lg:flex-row overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50/20">

      {/* LEFT: Canvas / Image Preview */}
      <div className="w-full lg:w-[58%] h-[45vh] lg:h-[calc(100vh-64px)] relative bg-gradient-to-br from-white via-slate-50/30 to-blue-50/20 flex flex-col gap-6 p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-slate-200/60 overflow-y-auto">
        <div className="relative w-full flex-1 flex items-center justify-center min-h-0">
          {/* Decorative Elements */}
          <div className="absolute top-10 left-10 w-32 h-32 bg-blue-200/20 rounded-full mix-blend-multiply filter blur-2xl pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-32 h-32 bg-purple-200/20 rounded-full mix-blend-multiply filter blur-2xl pointer-events-none" />

          {/* Image Container */}
          <div className="relative w-full h-full max-h-[calc(100vh-200px)] rounded-2xl overflow-hidden bg-white shadow-xl shadow-slate-200/60 ring-1 ring-slate-200/60 transition-all duration-300">
            <div className="absolute top-4 right-4 z-20 flex items-center gap-3 bg-white/95 backdrop-blur-xl px-4 py-2.5 rounded-xl border border-slate-200/70 shadow-md">
              <span className="text-xs font-semibold text-slate-700">Proportion Mode</span>
              <button
                onClick={handleSpatialToggle}
                className={cn(
                  'relative w-12 h-6 rounded-full transition-colors duration-300',
                  spatialViewEnabled ? 'bg-blue-600' : 'bg-slate-300',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300',
                    spatialViewEnabled ? 'translate-x-6' : '',
                  )}
                />
              </button>
            </div>
            {/* Main Image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              id="main-canvas-image"
              src={activeProject.current_image_url}
              alt="Current Room"
              className="w-full h-full object-contain bg-gradient-to-br from-white via-slate-50/30 to-white"
            />
            {spatialViewEnabled && (
              <>
                {spatialLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm z-20">
                    <div className="flex flex-col items-center gap-2 text-slate-700">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" />
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0.15s' }} />
                        <span className="w-2 h-2 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: '0.3s' }} />
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-wide">Analyzing spatial layout...</p>
                    </div>
                  </div>
                )}
                {spatialError && !spatialLoading && (
                  <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-white/95 border border-red-200 text-red-600 px-4 py-2 rounded-xl shadow z-20">
                    <p className="text-xs font-semibold">{spatialError}</p>
                  </div>
                )}
                {currentSpatialData && (
                  <ProportionOverlay
                    data={currentSpatialData}
                    highlightedRegion={highlightedRegion}
                  />
                )}
              </>
            )}

            {/* Floating Action Bar */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 bg-white/98 backdrop-blur-2xl p-3 rounded-[1.25rem] border border-slate-200/60 shadow-2xl shadow-slate-900/10 opacity-0 hover:opacity-100 transition-all duration-300 hover:scale-105 group">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100 hover:text-blue-600 transition-all duration-300 group-hover:scale-110"
                title="Share Image"
                onClick={() => window.open(activeProject.current_image_url, '_blank')}
              >
                <Share2 className="w-4.5 h-4.5" />
              </Button>
              <div className="w-px h-6 bg-slate-200" />
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl hover:bg-gradient-to-br hover:from-purple-50 hover:to-purple-100 hover:text-purple-600 transition-all duration-300 group-hover:scale-110"
                title="Fullscreen"
                onClick={() => {
                  const elem = document.getElementById('main-canvas-image');
                  if (elem && elem.requestFullscreen) {
                    elem.requestFullscreen();
                  }
                }}
              >
                <Maximize2 className="w-4.5 h-4.5" />
              </Button>
            </div>
          </div>
        </div>

        {showDesignPanel && (
          <div className="w-full rounded-xl bg-white/95 backdrop-blur-xl border border-slate-200/70 shadow-lg mt-4">
            <div className="px-5 py-3 border-b border-slate-200/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/20">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">AI Design Insights</h3>
                  <p className="text-[10px] text-slate-600">Spatial layout analysis</p>
                </div>
              </div>
              <button
                onClick={() => setSuggestionsCollapsed((prev) => !prev)}
                className="text-[10px] font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                {suggestionsCollapsed ? 'Expand' : 'Collapse'}
              </button>
            </div>
            {!suggestionsCollapsed && (
              <div className="px-4 py-3 max-h-[220px] overflow-y-auto space-y-3 custom-scrollbar">
                {designSuggestionsLoading && (
                  <p className="text-[11px] text-slate-500 italic">Analyzing layout...</p>
                )}
                {designSuggestionsError && (
                  <p className="text-[11px] text-red-600 font-semibold">{designSuggestionsError}</p>
                )}
                {currentDesignSuggestions?.layout_issues?.length ? (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Layout issues</p>
                    <div className="space-y-2">
                      {currentDesignSuggestions.layout_issues.map((issue) => (
                        <SuggestionCard
                          key={issue.id}
                          title="Issue"
                          description={issue.description}
                          regionRef={issue.region_ref}
                          onHover={setHighlightedRegion}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
                {currentDesignSuggestions?.improvement_suggestions?.length ? (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Improvements</p>
                    <div className="space-y-1.5">
                      {currentDesignSuggestions.improvement_suggestions.map((item) => (
                        <SuggestionCard
                          key={item.id}
                          title="Idea"
                          description={item.description}
                          regionRef={item.region_ref}
                          onHover={setHighlightedRegion}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
                {currentDesignSuggestions?.measurements?.length ? (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Measurements</p>
                    <div className="space-y-1.5">
                      {currentDesignSuggestions.measurements.map((measurement) => (
                        <SuggestionCard
                          key={measurement.id}
                          title="Measurement"
                          description={measurement.description}
                          regionRef={measurement.region_ref}
                          onHover={setHighlightedRegion}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
                {currentDesignSuggestions?.product_suggestions?.length ? (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Product ideas</p>
                    <div className="space-y-1.5">
                      {currentDesignSuggestions.product_suggestions.map((product) => (
                        <div
                          key={product.id}
                          className="rounded-lg border border-slate-200/70 bg-white/90 px-3 py-2 text-[11px] text-slate-700 font-medium"
                        >
                          <p>{product.query}</p>
                          {product.notes && (
                            <p className="text-slate-500 text-[10px] mt-0.5">{product.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT: Chat Interface */}
      <div className="w-full lg:w-[42%] h-[55vh] lg:h-[calc(100vh-64px)] flex flex-col bg-white/95 backdrop-blur-xl">

        {/* Chat Header */}
        <div className="shrink-0 border-b border-slate-200/60 bg-white/95 backdrop-blur-xl">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white">
                  <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                </div>
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">AI Designer</h2>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span>Active & Ready</span>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveProject(null)}
              className="text-slate-700 hover:text-slate-900 border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-all rounded-lg font-semibold"
            >
              New Project
            </Button>
          </div>
        </div>

        {/* Messages Area - Scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 custom-scrollbar">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              imageUrl={msg.imageUrl}
              type={msg.type}
            />
          ))}
          {/* Typing Indicator */}
          {isAiThinking && (
            <div className="flex w-full justify-start animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="relative bg-white border border-slate-200/60 rounded-2xl rounded-tl-sm px-4 py-3 shadow-md">
                <div className="flex gap-1.5 items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                  <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Products Section */}
        {activeProject.productGroups && activeProject.productGroups.length > 0 && (
          <div className="shrink-0 border-t border-slate-200/60 bg-white/95">
            <div className="px-5 py-3 border-b border-slate-200/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md shadow-blue-500/20">
                      <Package className="w-4 h-4 text-white" />
                    </div>
                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Shopping List</h3>
                    <p className="text-[10px] text-slate-600">{activeProject.productGroups.length} {activeProject.productGroups.length === 1 ? 'group' : 'groups'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShoppingListCollapsed(!shoppingListCollapsed)}
                  className="text-[10px] font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1"
                >
                  {shoppingListCollapsed ? (
                    <>
                      Expand <ChevronDown className="w-3 h-3" />
                    </>
                  ) : (
                    <>
                      Collapse <ChevronUp className="w-3 h-3" />
                    </>
                  )}
                </button>
              </div>
            </div>
            {!shoppingListCollapsed && (
              <div className="px-5 py-3 max-h-[240px] overflow-y-auto space-y-3 custom-scrollbar">
                {activeProject.productGroups.map((group) => {
                  const isExpanded = expandedGroups.has(group.id);
                  const displayProducts = isExpanded ? group.products : group.products.slice(0, 1);
                  const hasMore = group.products.length > 1;

                  return (
                    <div
                      key={group.id}
                      className="border border-slate-200/70 rounded-lg bg-slate-50/50 p-2.5"
                    >
                      <div className="text-[10px] text-slate-500 mb-2 font-medium">
                        &ldquo;{group.prompt}&rdquo;
                      </div>
                      <div className="space-y-2">
                        {displayProducts.map((product: Product, idx: number) => (
                          <div
                            key={idx}
                            className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                            style={{ animationDelay: `${idx * 100}ms` }}
                          >
                            <ProductCard product={product} />
                          </div>
                        ))}
                      </div>
                      {hasMore && (
                        <button
                          onClick={() => {
                            setExpandedGroups(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(group.id)) {
                                newSet.delete(group.id);
                              } else {
                                newSet.add(group.id);
                              }
                              return newSet;
                            });
                          }}
                          className="mt-2 w-full text-[10px] font-semibold text-blue-600 hover:text-blue-700 py-1.5 px-2 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-1"
                        >
                          {isExpanded ? (
                            <>
                              Show Less <ChevronUp className="w-3 h-3" />
                            </>
                          ) : (
                            <>
                              Show {group.products.length - 1} More <ChevronDown className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Input Area */}
        <div className="shrink-0 px-5 py-4 bg-white/98 border-t border-slate-200/60">
          <form
            onSubmit={handleSendMessage}
            className="relative flex items-center gap-2 bg-slate-50/80 p-2 rounded-xl border border-slate-200 hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            >
              <Sparkles className="w-4 h-4" />
            </Button>

            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Describe your design vision..."
              className="flex-1 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-400 h-9 text-sm"
            />

            <Button
              type="submit"
              disabled={!inputText.trim() || isAiThinking}
              className={cn(
                "shrink-0 rounded-lg transition-all duration-200 h-8 px-4 font-semibold text-sm",
                inputText.trim()
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm hover:shadow-md"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              )}
            >
              {isAiThinking ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-1 h-1 bg-white rounded-full animate-bounce" />
                  <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  Send
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              )}
            </Button>
          </form>
          <p className="text-center text-[10px] text-slate-500 mt-2.5">
            Powered by AI • Results may vary
          </p>
        </div>

      </div>
    </div>
  );
}

const ProportionOverlay = ({
  data,
  highlightedRegion,
}: {
  data: SpatialInsights;
  highlightedRegion: string | null;
}) => {
  const clamp = (value: number) => Math.max(0, Math.min(1, value));
  const toPoint = (value: number) => clamp(value) * 100;
  const pointsToString = (points: Array<{ x: number; y: number }>) =>
    points.map((p) => `${toPoint(p.x)},${toPoint(p.y)}`).join(' ');
  const approxFeet = (ratio?: number | null, base = 14) =>
    ratio ? (ratio * base).toFixed(1) : null;
  const isHighlighted = (id?: string) =>
    !!(id && highlightedRegion && highlightedRegion === id);

  const proportionInsights: string[] = [];
  if (data.proportions?.sofa_room_width_ratio) {
    proportionInsights.push(
      `Sofa spans ${(data.proportions.sofa_room_width_ratio * 100).toFixed(0)}% of room width`,
    );
  }
  if (data.proportions?.sofa_room_height_ratio) {
    proportionInsights.push(
      `Sofa height is ${(data.proportions.sofa_room_height_ratio * 100).toFixed(0)}% of frame`,
    );
  }
  if (data.proportions?.walkway_width_ratio) {
    const feet = approxFeet(data.proportions.walkway_width_ratio, 10);
    proportionInsights.push(
      `Walkway width approx ${feet ? `${feet} ft` : `${(data.proportions.walkway_width_ratio * 100).toFixed(0)}%`}`,
    );
  }
  if (data.proportions?.window_wall_ratio) {
    proportionInsights.push(
      `Windows cover ${(data.proportions.window_wall_ratio * 100).toFixed(0)}% of the wall`,
    );
  }
  if (data.proportions?.door_wall_ratio) {
    proportionInsights.push(
      `Doors occupy ${(data.proportions.door_wall_ratio * 100).toFixed(0)}% of width`,
    );
  }
  if (data.proportions?.estimated_room_depth) {
    const depthFeet = approxFeet(data.proportions.estimated_room_depth, 16);
    proportionInsights.push(
      `Estimated room depth ≈ ${depthFeet ? `${depthFeet} ft` : 'balanced perspective'}`,
    );
  }
  data.measurements?.forEach((measurement) => {
    const ratio = measurement.width_ratio ?? measurement.height_ratio;
    if (measurement.description) {
      proportionInsights.push(measurement.description);
    } else if (measurement.label && ratio) {
      proportionInsights.push(
        `${measurement.label} ≈ ${(ratio * 100).toFixed(0)}% of frame`,
      );
    }
  });

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {data.empty_zones?.map((zone) => (
          <rect
            key={zone.id}
            x={toPoint(zone.box.x)}
            y={toPoint(zone.box.y)}
            width={toPoint(zone.box.width)}
            height={toPoint(zone.box.height)}
            fill="#f9731688"
            stroke={isHighlighted(zone.id) ? '#f97316' : '#ea580c'}
            strokeWidth={isHighlighted(zone.id) ? 1 : 0.3}
            strokeDasharray="1.5 1.5"
            opacity={0.3}
          />
        ))}
        {data.windows?.map((window) => (
          <rect
            key={window.id}
            x={toPoint(window.box.x)}
            y={toPoint(window.box.y)}
            width={toPoint(window.box.width)}
            height={toPoint(window.box.height)}
            fill="#38bdf899"
            stroke={isHighlighted(window.id) ? '#f97316' : '#0ea5e9'}
            strokeWidth={isHighlighted(window.id) ? 1 : 0.45}
            opacity={0.35}
          />
        ))}
        {data.doors?.map((door) => (
          <rect
            key={door.id}
            x={toPoint(door.box.x)}
            y={toPoint(door.box.y)}
            width={toPoint(door.box.width)}
            height={toPoint(door.box.height)}
            fill="none"
            stroke={isHighlighted(door.id) ? '#f97316' : '#6366f1'}
            strokeWidth={isHighlighted(door.id) ? 1 : 0.5}
            strokeDasharray="1 1"
          />
        ))}
        {data.furniture?.map((item) => {
          const x = toPoint(item.box?.x ?? 0);
          const y = toPoint(item.box?.y ?? 0);
          const width = toPoint(item.box?.width ?? 0);
          const height = toPoint(item.box?.height ?? 0);
          if ([x, y, width, height].some((value) => Number.isNaN(value))) {
            return null;
          }
          return (
            <g key={item.id}>
              <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill="none"
                stroke={isHighlighted(item.id) ? '#f97316' : '#2563eb'}
                strokeWidth={isHighlighted(item.id) ? 1.2 : 0.6}
                rx={0.8}
              />
              {item.label && (
                <text
                  x={x + width / 2}
                  y={y - 0.5}
                  textAnchor="middle"
                  fill="#1d4ed8"
                  fontSize="2"
                  fontWeight="600"
                >
                  {item.label}
                </text>
              )}
            </g>
          );
        })}
        {data.walkways?.map((path) => (
          <polyline
            key={path.id}
            points={pointsToString(path.points)}
            fill="none"
            stroke={isHighlighted(path.id) ? '#f97316' : '#22c55e'}
            strokeWidth={isHighlighted(path.id) ? 1.1 : 0.7}
            strokeDasharray="2 1"
            opacity={0.85}
          />
        ))}
        {data.obstructions?.map((obs) => (
          <rect
            key={obs.id}
            x={toPoint(obs.box.x)}
            y={toPoint(obs.box.y)}
            width={toPoint(obs.box.width)}
            height={toPoint(obs.box.height)}
            fill="#ef444466"
            stroke={isHighlighted(obs.id) ? '#f97316' : '#b91c1c'}
            strokeWidth={isHighlighted(obs.id) ? 1 : 0.5}
          />
        ))}
        {data.measurements?.map((measurement, idx) => {
          const ratio = measurement.width_ratio ?? measurement.height_ratio;
          if (!ratio) return null;
          const y = 92 - idx * 4;
          const label = measurement.label ?? measurement.id;
          const feet = approxFeet(ratio);
          return (
            <g key={measurement.id}>
              <line
                x1={5}
                x2={5 + ratio * 90}
                y1={y}
                y2={y}
                stroke="#0ea5e9"
                strokeWidth={0.35}
                strokeDasharray="1 1"
              />
              <text
                x={5 + (ratio * 90) / 2}
                y={y - 1}
                textAnchor="middle"
                fill="#0f172a"
                fontSize="2"
                fontWeight="600"
              >
                {label} · {feet ? `${feet} ft` : `${(ratio * 100).toFixed(0)}%`}
              </text>
            </g>
          );
        })}
      </svg>
      {(proportionInsights.length ||
        data.metadata?.notes?.length ||
        data.depth_cues?.length) && (
        <div className="absolute bottom-4 left-4 bg-white/98 backdrop-blur-xl px-3 py-2.5 rounded-lg text-[11px] text-slate-700 shadow-lg max-w-[60%] border border-slate-200/80">
          <div className="space-y-2">
            {proportionInsights.length > 0 && (
              <div>
                <p className="font-bold uppercase tracking-wider text-[9px] text-slate-500 mb-1">
                  Proportion insights
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-[10px] leading-snug">
                  {proportionInsights.slice(0, 5).map((insight, idx) => (
                    <li key={`prop-${idx}`}>{insight}</li>
                  ))}
                </ul>
              </div>
            )}
            {data.metadata?.notes && data.metadata.notes.length > 0 && (
              <div>
                <p className="font-bold uppercase tracking-wider text-[9px] text-slate-500 mb-1">
                  Spatial notes
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-[10px] leading-snug">
                  {data.metadata.notes.slice(0, 4).map((note, idx) => (
                    <li key={`note-${idx}`}>{note}</li>
                  ))}
                </ul>
              </div>
            )}
            {data.depth_cues && data.depth_cues.length > 0 && (
              <div>
                <p className="font-bold uppercase tracking-wider text-[9px] text-slate-500 mb-1">
                  Depth cues
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-[10px] leading-snug">
                  {data.depth_cues.slice(0, 4).map((cue, idx) => (
                    <li key={`cue-${idx}`}>{cue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const SuggestionCard = ({
  title,
  description,
  regionRef,
  onHover,
}: {
  title: string;
  description: string;
  regionRef?: string;
  onHover: (region: string | null) => void;
}) => (
  <div
    className="rounded-lg border border-slate-200/70 bg-white/95 px-3 py-2 text-[11px] text-slate-700 font-medium hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
    onMouseEnter={() => onHover(regionRef ?? null)}
    onMouseLeave={() => onHover(null)}
  >
    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-0.5">{title}</p>
    <p className="leading-snug">{description}</p>
    {regionRef && (
      <p className="text-[10px] text-slate-400 mt-0.5">Region: {regionRef}</p>
    )}
  </div>
);
