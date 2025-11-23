import React from 'react';
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
    role: string;
    content?: string;
    imageUrl?: string;
    type?: string;
}

export default function MessageBubble({ role, content, imageUrl, type }: MessageBubbleProps) {
    const isUser = role === 'user';

    return (
        <div className={cn("flex w-full mb-6", isUser ? "justify-end" : "justify-start")}>
            <div className={cn(
                "max-w-[85%] md:max-w-[70%] rounded-2xl p-4 shadow-sm transition-all duration-200",
                isUser
                    ? "bg-stone-900 text-white rounded-tr-none"
                    : "bg-white border border-stone-100 text-stone-800 rounded-tl-none"
            )}>
                {type === 'image' && imageUrl && (
                    <div className="mb-3 overflow-hidden rounded-xl border border-stone-100/50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={imageUrl}
                            alt="Room design"
                            className="w-full h-auto object-cover transition-transform hover:scale-[1.02] duration-300 cursor-zoom-in"
                        />
                    </div>
                )}
                {content && (
                    <p className={cn("text-sm md:text-base leading-relaxed font-light", isUser ? "text-stone-100" : "text-stone-600")}>
                        {content}
                    </p>
                )}
            </div>
        </div>
    );
}
