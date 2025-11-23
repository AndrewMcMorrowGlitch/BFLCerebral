import React, { useCallback, useState } from 'react';
import { UploadCloud, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
    onUploadComplete: (url: string) => void;
}

export default function ImageUploader({ onUploadComplete }: ImageUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const handleUpload = useCallback(async (file: File) => {
        setIsUploading(true);
        try {
            // Convert to base64 for local usage/API
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                onUploadComplete(base64String);
                setIsUploading(false);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error("Upload failed", error);
            setIsUploading(false);
        }
    }, [onUploadComplete]);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setIsDragging(true);
        } else if (e.type === "dragleave") {
            setIsDragging(false);
        }
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            await handleUpload(e.dataTransfer.files[0]);
        }
    }, [handleUpload]);

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            await handleUpload(e.target.files[0]);
        }
    };

    return (
        <div
            className={cn(
                "relative group w-full max-w-2xl mx-auto h-80 rounded-2xl border-2 border-dashed transition-all duration-200 ease-out flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden",
                isDragging
                    ? "border-blue-500 bg-blue-50/50 scale-[1.01] shadow-lg shadow-blue-500/10"
                    : "border-slate-300 bg-white/80 hover:border-blue-400 hover:bg-blue-50/30 hover:shadow-md"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                onChange={handleChange}
                accept="image/*"
                disabled={isUploading}
            />

            <div className="z-0 flex flex-col items-center px-6 transition-all duration-200 group-hover:-translate-y-0.5">
                <div className={cn(
                    "w-16 h-16 mb-6 rounded-xl flex items-center justify-center transition-all duration-200",
                    isDragging
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105"
                        : "bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:shadow-md"
                )}>
                    {isUploading ? (
                        <Loader2 className="w-8 h-8 animate-spin" />
                    ) : (
                        <UploadCloud className="w-8 h-8" />
                    )}
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    {isUploading ? "Uploading..." : "Upload your room"}
                </h3>
                <p className="text-slate-600 text-sm max-w-xs leading-relaxed">
                    Drag & drop or click to select a photo to start designing
                </p>
            </div>
        </div>
    );
}
