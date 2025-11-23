'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, Share2, Maximize2, Package } from "lucide-react";
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
  products?: Product[];
}

export default function Home() {
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleUploadComplete = (url: string) => {
    const newProject: Project = {
      id: Date.now().toString(),
      current_image_url: url,
      original_image_url: url,
      products: [],
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
          const productResponse = await fetch('/api/products/lens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: data.imageUrl, prompt: userMsg }),
          });
          if (productResponse.ok) {
            const { product } = await productResponse.json();
            if (product) {
              setActiveProject(prev => {
                if (!prev) return prev;
                const existing = prev.products ?? [];
                const alreadyExists = existing.some(
                  (item) => item.linkUrl && product.linkUrl && item.linkUrl === product.linkUrl,
                );
                const updatedProducts = alreadyExists ? existing : [...existing, product];
                return {
                  ...prev,
                  products: updatedProducts,
                };
              });
            }
          } else {
            console.warn('Lens product lookup failed', await productResponse.text());
          }
        } catch (lensError) {
          console.warn('Error running lens search', lensError);
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

  // Empty State / Upload
  if (!activeProject) {
    return (
      <div className="relative min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-4 py-12 overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/20">
        {/* Sophisticated Background Effects */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] -z-10" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 via-transparent to-purple-50/40 -z-10" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob -z-10" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-200/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000 -z-10" />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-pink-200/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000 -z-10" />

        <div className="container mx-auto max-w-7xl relative z-10">
          {/* Hero Section */}
          <div className="text-center mb-16 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Badge */}
            <div className="inline-flex items-center gap-2.5 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 backdrop-blur-xl px-5 py-2.5 rounded-full border border-blue-200/50 shadow-lg shadow-blue-100/50 hover:shadow-xl hover:shadow-blue-100/60 transition-all duration-300">
              <div className="relative">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <Sparkles className="w-4 h-4 text-blue-600 absolute inset-0 animate-ping opacity-40" />
              </div>
              <span className="text-sm font-semibold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent">
                Powered by Advanced AI
              </span>
            </div>

            {/* Main Headline */}
            <div className="space-y-6">
              <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-none">
                <span className="block bg-gradient-to-br from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent drop-shadow-sm">
                  Transform Your
                </span>
                <span className="block mt-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-gradient">
                  Living Space
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-medium">
                Upload any room photo and watch our AI redesign it instantly with new styles,
                furniture, and decor. Get shoppable product recommendations.
              </p>
            </div>

            {/* CTA Stats */}
            <div className="flex items-center justify-center gap-8 text-sm text-slate-600 font-medium">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>AI Ready</span>
              </div>
              <div className="w-px h-4 bg-slate-300" />
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">Instant</span>
                <span>Results</span>
              </div>
              <div className="w-px h-4 bg-slate-300" />
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">Free</span>
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
            <div className="group relative bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-slate-200/60 shadow-lg shadow-slate-200/50 hover:shadow-2xl hover:shadow-blue-200/30 hover:border-blue-200 transition-all duration-500 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-200/50 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">AI Generation</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    State-of-the-art AI transforms your space with photorealistic results in seconds
                  </p>
                </div>
              </div>
            </div>

            <div className="group relative bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-slate-200/60 shadow-lg shadow-slate-200/50 hover:shadow-2xl hover:shadow-purple-200/30 hover:border-purple-200 transition-all duration-500 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-200/50 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <Package className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Smart Shopping</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Get instant product recommendations with direct Amazon links for easy purchasing
                  </p>
                </div>
              </div>
            </div>

            <div className="group relative bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-slate-200/60 shadow-lg shadow-slate-200/50 hover:shadow-2xl hover:shadow-pink-200/30 hover:border-pink-200 transition-all duration-500 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-50/50 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center shadow-lg shadow-pink-200/50 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <ArrowRight className="w-7 h-7 text-white" />
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
    <div className="min-h-[calc(100vh-64px)] flex flex-col lg:flex-row overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-white">

      {/* LEFT: Canvas / Image Preview */}
      <div className="w-full lg:w-[58%] h-[45vh] lg:h-full relative bg-gradient-to-br from-slate-100 via-white to-blue-50/30 flex items-center justify-center p-8 lg:p-16 border-b lg:border-b-0 lg:border-r border-slate-200/50">
        <div className="relative w-full h-full max-h-[85vh] flex items-center justify-center">
          {/* Decorative Elements */}
          <div className="absolute top-10 left-10 w-32 h-32 bg-blue-200/20 rounded-full mix-blend-multiply filter blur-2xl" />
          <div className="absolute bottom-10 right-10 w-32 h-32 bg-purple-200/20 rounded-full mix-blend-multiply filter blur-2xl" />

          {/* Image Container */}
          <div className="relative w-full h-full rounded-[2rem] overflow-hidden bg-white shadow-2xl shadow-slate-900/10 ring-1 ring-slate-900/5 transition-all duration-500 hover:shadow-3xl hover:shadow-slate-900/20">
            {/* Main Image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              id="main-canvas-image"
              src={activeProject.current_image_url}
              alt="Current Room"
              className="w-full h-full object-contain bg-gradient-to-br from-white via-slate-50/30 to-white"
            />

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
      </div>

      {/* RIGHT: Chat Interface */}
      <div className="w-full lg:w-[42%] h-[55vh] lg:h-full flex flex-col bg-white/95 backdrop-blur-xl">

        {/* Chat Header */}
        <div className="border-b border-slate-200/60 bg-gradient-to-r from-white via-blue-50/30 to-purple-50/30 backdrop-blur-xl">
          <div className="flex items-center justify-between px-8 py-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-blue-200/50">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm">
                  <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">AI Designer</h2>
                <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                  <span>Active & Ready</span>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveProject(null)}
              className="text-slate-700 hover:text-slate-900 border-slate-300 hover:border-slate-400 hover:bg-slate-100 transition-all rounded-xl font-semibold shadow-sm"
            >
              New Project
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2 scroll-smooth">
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
            <div className="flex w-full mb-6 justify-start animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="relative bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 border border-slate-200/60 rounded-[1.25rem] rounded-tl-sm p-6 shadow-xl shadow-slate-200/60 backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-[1.25rem] rounded-tl-sm" />
                <div className="relative flex gap-2 items-center">
                  <span className="w-3 h-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full animate-bounce shadow-sm"></span>
                  <span className="w-3 h-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.15s' }}></span>
                  <span className="w-3 h-3 bg-gradient-to-br from-pink-500 to-pink-600 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.3s' }}></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Products Section */}
        {activeProject.products && activeProject.products.length > 0 && (
          <div className="border-t border-slate-200/60 bg-gradient-to-b from-blue-50/30 via-purple-50/20 to-white backdrop-blur-sm">
            <div className="p-6 lg:p-7 border-b border-slate-200/60 bg-white/90 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 shadow-lg shadow-blue-200/50">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Shopping List</h3>
                    <p className="text-xs text-slate-600 font-medium">Curated recommendations for your design</p>
                  </div>
                </div>
                <div className="text-xs font-bold text-slate-700 bg-gradient-to-br from-slate-100 to-white px-4 py-2 rounded-xl border border-slate-200/50 shadow-sm">
                  {activeProject.products.length} {activeProject.products.length === 1 ? 'item' : 'items'}
                </div>
              </div>
            </div>
            <div className="p-5 lg:p-6 max-h-[340px] overflow-y-auto space-y-3.5 custom-scrollbar">
              {activeProject.products.map((product, idx) => (
                <div
                  key={idx}
                  className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-6 lg:p-8 bg-gradient-to-t from-slate-50 via-white to-white border-t border-slate-200/60">
          <form
            onSubmit={handleSendMessage}
            className="relative flex items-center gap-3 bg-white p-3 rounded-[1.25rem] border-2 border-slate-200 hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100 transition-all shadow-lg shadow-slate-200/50 hover:shadow-xl"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all hover:scale-110"
            >
              <Sparkles className="w-5 h-5" />
            </Button>

            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Describe your vision... e.g., make the walls sage green with gold accents"
              className="flex-1 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-400 h-12 text-sm font-medium"
            />

            <Button
              type="submit"
              disabled={!inputText.trim() || isAiThinking}
              className={cn(
                "shrink-0 rounded-xl transition-all duration-300 h-11 px-6 font-semibold shadow-lg",
                inputText.trim()
                  ? "bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white shadow-blue-200/50 hover:shadow-xl hover:shadow-blue-300/50 hover:scale-105"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
              )}
            >
              {isAiThinking ? (
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Send
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>
          <p className="text-center text-xs text-slate-500 mt-5 font-medium">
            ✨ Powered by AI • Results may vary
          </p>
        </div>

      </div>
    </div>
  );
}
