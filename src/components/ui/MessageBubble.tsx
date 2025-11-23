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
        <div className={cn("flex w-full mb-4", isUser ? "justify-end" : "justify-start")}>
            <div className={cn(
                "max-w-[85%] md:max-w-[75%] rounded-2xl p-4 transition-all duration-200",
                isUser
                    ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 rounded-tr-sm"
                    : "bg-white border border-slate-200/70 text-slate-800 shadow-sm rounded-tl-sm"
            )}>
                {type === 'image' && imageUrl && (
                    <div className="mb-3 overflow-hidden rounded-lg border border-slate-200/50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={imageUrl}
                            alt="Room design"
                            className="w-full h-auto object-cover transition-transform hover:scale-[1.01] duration-300 cursor-zoom-in"
                        />
                    </div>
                )}
                {content && (
                    <p className={cn("text-sm leading-relaxed", isUser ? "text-white" : "text-slate-700")}>
                        {content}
                    </p>
                )}
            </div>
        </div>
    );
}
