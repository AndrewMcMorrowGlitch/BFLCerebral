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
      // Call API to generate new image
      const response = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: activeProject.current_image_url,
          prompt: "photorealistic, interior design, " + userMsg, // Basic prompt engineering
        }),
      });

      if (!response.ok) throw new Error('Generation failed');

      const data = await response.json();

      if (data.imageUrl) {
        // Update project image
        setActiveProject(prev => prev ? ({ ...prev, current_image_url: data.imageUrl }) : null);

        // Add assistant response
        const aiMessageObj: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Here is a version with "${userMsg}". How does this look?`,
          imageUrl: data.imageUrl,
          type: 'image',
        };
        setMessages(prev => [...prev, aiMessageObj]);

        // Add mock products for UI demonstration
        setActiveProject(prev => prev ? ({
          ...prev,
          products: [
            {
              name: "Modern Velvet Sofa",
              category: "Furniture",
              quantity: 1,
              description: "Contemporary blue velvet 3-seater sofa with gold legs",
              searchTerms: ["blue velvet sofa", "modern couch", "velvet 3 seater"]
            },
            {
              name: "Abstract Canvas Wall Art",
              category: "Decor",
              quantity: 2,
              description: "Large abstract paintings for living room wall",
              searchTerms: ["abstract wall art", "large canvas painting", "modern wall decor"]
            },
            {
              name: "Gold Floor Lamp",
              category: "Lighting",
              quantity: 1,
              description: "Modern arc floor lamp with marble base",
              searchTerms: ["gold arc floor lamp", "modern standing lamp", "marble floor lamp"]
            },
            {
              name: "Decorative Throw Pillows",
              category: "Accessories",
              quantity: 4,
              description: "Textured cushions in complementary colors",
              searchTerms: ["throw pillows set", "decorative cushions", "velvet pillows"]
            }
          ]
        }) : null);

        // Analyze products in the background (disabled - add GOOGLE_API_KEY to enable)
        // if (activeProject.original_image_url) {
        //   analyzeProducts(activeProject.original_image_url, data.imageUrl);
        // }
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
      <div className="container mx-auto max-w-7xl px-4 min-h-[calc(100vh-64px)] flex flex-col items-center justify-center">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-stone-900 mb-6">
            Redesign your space<br />
            <span className="text-stone-400">in seconds.</span>
          </h1>
          <p className="text-lg text-stone-500 max-w-xl mx-auto">
            Upload a photo of your room and use AI to explore new styles, furniture, and colors instantly.
          </p>
        </div>

        <div className="w-full">
          <ImageUploader onUploadComplete={handleUploadComplete} />
        </div>
      </div>
    );
  }

  // Workspace State
  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col lg:flex-row overflow-hidden bg-stone-50">

      {/* LEFT: Canvas / Image Preview */}
      <div className="w-full lg:w-[60%] h-[40vh] lg:h-full relative bg-stone-100 flex items-center justify-center p-4 lg:p-12 border-b lg:border-b-0 lg:border-r border-stone-200">
        <div className="relative w-full h-full max-h-[800px] flex items-center justify-center shadow-2xl shadow-stone-200/50 rounded-2xl overflow-hidden bg-white">
          {/* Main Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            id="main-canvas-image"
            src={activeProject.current_image_url}
            alt="Current Room"
            className="w-full h-full object-contain bg-white"
          />

          {/* Floating Action Bar */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 bg-white/90 backdrop-blur-md p-2 rounded-full border border-stone-200/50 shadow-lg opacity-0 hover:opacity-100 transition-opacity duration-300">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-stone-100"
              title="Open Original"
              onClick={() => window.open(activeProject.current_image_url, '_blank')}
            >
              <Share2 className="w-4 h-4 text-stone-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-stone-100"
              title="Toggle Fullscreen"
              onClick={() => {
                const elem = document.getElementById('main-canvas-image');
                if (elem && elem.requestFullscreen) {
                  elem.requestFullscreen();
                }
              }}
            >
              <Maximize2 className="w-4 h-4 text-stone-600" />
            </Button>
          </div>
        </div>
      </div>

      {/* RIGHT: Chat Interface */}
      <div className="w-full lg:w-[40%] h-[60vh] lg:h-full flex flex-col bg-white">

        {/* Chat Header */}
        <div className="h-16 border-b border-stone-100 flex items-center justify-between px-6 bg-white z-10">
          <div>
            <h2 className="font-semibold text-stone-900">Design Assistant</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-xs text-stone-500 font-medium">Online</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveProject(null)}
            className="text-stone-500 hover:text-stone-900 border-stone-200"
          >
            New Project
          </Button>
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
          {/* Typing Indicator Placeholder */}
          {isAiThinking && (
            <div className="flex w-full mb-6 justify-start">
              <div className="bg-white border border-stone-100 rounded-2xl rounded-tl-none p-4 shadow-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                  <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Products Section */}
        {activeProject.products && activeProject.products.length > 0 && (
          <div className="border-t border-stone-200 bg-gradient-to-b from-stone-50 to-white">
            <div className="p-4 lg:p-5 border-b border-stone-100 bg-white/50 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-50">
                    <Package className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-stone-900">Shopping List</h3>
                    <p className="text-xs text-stone-500">Items to recreate this design</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-stone-600 bg-stone-100 px-3 py-1.5 rounded-full">
                  {activeProject.products.length} {activeProject.products.length === 1 ? 'item' : 'items'}
                </span>
              </div>
            </div>
            <div className="p-3 lg:p-4 max-h-[280px] overflow-y-auto space-y-2 custom-scrollbar">
              {activeProject.products.map((product, idx) => (
                <ProductCard key={idx} product={product} />
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 lg:p-6 bg-white border-t border-stone-100">
          <form
            onSubmit={handleSendMessage}
            className="relative flex items-center gap-2 bg-stone-50 p-2 rounded-2xl border border-stone-200 focus-within:border-stone-400 focus-within:ring-2 focus-within:ring-stone-100 transition-all"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-stone-400 hover:text-stone-600 hover:bg-stone-200/50 rounded-xl"
            >
              <Sparkles className="w-5 h-5" />
            </Button>

            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Make the sofa blue, change style to modern..."
              className="flex-1 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-stone-400 h-10"
            />

            <Button
              type="submit"
              disabled={!inputText.trim() || isAiThinking}
              className={cn(
                "rounded-xl transition-all duration-200",
                inputText.trim()
                  ? "bg-stone-900 hover:bg-stone-800 text-white shadow-md"
                  : "bg-stone-200 text-stone-400 cursor-not-allowed"
              )}
            >
              <ArrowRight className="w-5 h-5" />
            </Button>
          </form>
          <p className="text-center text-xs text-stone-400 mt-3 font-light">
            AI generated images may be inaccurate.
          </p>
        </div>

      </div>
    </div>
  );
}
