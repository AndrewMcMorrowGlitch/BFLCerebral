'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import RenderPreview from '@/components/RenderPreview';
import { SceneEditor, SceneEditorHandle } from '@/components/SceneEditor';
import { createObject, INITIAL_ROOM_STATE, RoomObject, RoomState } from '@/lib/roomState';
import {
  Armchair,
  Box,
  Download,
  Flower2,
  Lamp,
  LayoutGrid,
  Library,
  Loader2,
  Maximize2,
  Move3d,
  Palette,
  Plus,
  RefreshCw,
  Sofa,
  Trash2,
  Type
} from 'lucide-react';

export default function Home() {
  const [roomState, setRoomState] = useState<RoomState>(INITIAL_ROOM_STATE);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<SceneEditorHandle>(null);
  const isGeneratingRef = useRef(false);

  useEffect(() => {
    isGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  const updateObject = (id: string, updates: Partial<RoomObject>) => {
    setRoomState((prev) => ({
      ...prev,
      objects: prev.objects.map((obj) =>
        obj.id === id
          ? {
            ...obj,
            ...updates,
            position: updates.position ? { ...obj.position, ...updates.position } : obj.position,
            size: updates.size ? { ...obj.size, ...updates.size } : obj.size,
            material: updates.material ? { ...obj.material, ...updates.material } : obj.material,
          }
          : obj,
      ),
    }));
  };

  const removeSelectedObject = () => {
    if (!selectedObjectId) return;
    setRoomState((prev) => ({
      ...prev,
      objects: prev.objects.filter((obj) => obj.id !== selectedObjectId),
    }));
    setSelectedObjectId(null);
  };

  const addObject = (type: string) => {
    const newObj = createObject(type);
    setRoomState((prev) => ({
      ...prev,
      objects: [...prev.objects, newObj],
    }));
    setSelectedObjectId(newObj.id);
  };

  const triggerRender = useCallback(
    async (reason: 'auto' | 'manual') => {
      if (!editorRef.current) return;
      if (isGeneratingRef.current && reason === 'auto') return;

      const clayImage = editorRef.current.captureClay();
      if (!clayImage) return;

      setIsGenerating(true);
      setError(null);
      try {
        const response = await fetch('/api/render', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clayImage, roomState }),
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        if (data.imageUrl) {
          setPreviewUrl(data.imageUrl);
          setRoomState((prev) => ({
            ...prev,
            styleReferenceImages: [...prev.styleReferenceImages, data.imageUrl],
          }));
        }

        if (data.warning) {
          console.warn(data.warning);
        }
      } catch (err: any) {
        console.error('Render failed', err);
        setError(err.message || 'Failed to generate image');
      } finally {
        setIsGenerating(false);
      }
    },
    [roomState],
  );

  // Auto-regenerate whenever objects/camera change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => triggerRender('auto'), 1000);
    return () => clearTimeout(timer);
  }, [roomState.objects, roomState.camera, triggerRender]);

  const handleDownload = () => {
    if (previewUrl) {
      const link = document.createElement('a');
      link.href = previewUrl;
      link.download = `room-render-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <main className="flex h-screen w-screen bg-neutral-950 text-white overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Sidebar */}
      <div className="w-16 flex flex-col items-center py-4 border-r border-neutral-800 bg-neutral-900 z-20">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-900/20">
          <Move3d size={20} className="text-white" />
        </div>

        <div className="flex flex-col gap-4 w-full px-2">
          <div className="group relative flex justify-center">
            <button onClick={() => addObject('sofa')} className="p-3 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-all">
              <Sofa size={20} />
            </button>
            <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-neutral-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-neutral-700">Add Sofa</span>
          </div>
          <div className="group relative flex justify-center">
            <button onClick={() => addObject('chair')} className="p-3 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-all">
              <Armchair size={20} />
            </button>
            <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-neutral-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-neutral-700">Add Chair</span>
          </div>
          <div className="group relative flex justify-center">
            <button onClick={() => addObject('table')} className="p-3 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-all">
              <Box size={20} />
            </button>
            <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-neutral-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-neutral-700">Add Table</span>
          </div>
          <div className="group relative flex justify-center">
            <button onClick={() => addObject('shelf')} className="p-3 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-all">
              <Library size={20} />
            </button>
            <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-neutral-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-neutral-700">Add Shelf</span>
          </div>
          <div className="group relative flex justify-center">
            <button onClick={() => addObject('plant')} className="p-3 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-all">
              <Flower2 size={20} />
            </button>
            <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-neutral-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-neutral-700">Add Plant</span>
          </div>
          <div className="group relative flex justify-center">
            <button onClick={() => addObject('lamp')} className="p-3 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-all">
              <Lamp size={20} />
            </button>
            <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-neutral-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-neutral-700">Add Lamp</span>
          </div>
          <div className="group relative flex justify-center">
            <button onClick={() => addObject('rug')} className="p-3 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-all">
              <LayoutGrid size={20} />
            </button>
            <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-neutral-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-neutral-700">Add Rug</span>
          </div>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-16 border-b border-neutral-800 flex items-center justify-between px-6 bg-neutral-900/50 backdrop-blur z-10">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Studio</h1>
            <p className="text-xs text-neutral-500">Design your space in 3D</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => triggerRender('manual')}
              disabled={isGenerating}
              className="px-4 py-2 bg-white text-black hover:bg-neutral-200 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg shadow-white/5"
            >
              <RefreshCw size={16} className={isGenerating ? "animate-spin" : ""} />
              {isGenerating ? 'Rendering...' : 'Regenerate'}
            </button>
          </div>
        </div>

        <div className="flex-1 flex relative">
          {/* 3D Canvas */}
          <div className="flex-1 relative bg-neutral-100/5">
            <SceneEditor
              ref={editorRef}
              roomState={roomState}
              onRoomStateChange={setRoomState}
              selectedObjectId={selectedObjectId}
              onSelect={setSelectedObjectId}
            />

            {/* Floating Object Inspector */}
            {selectedObjectId && (
              <div className="absolute top-6 right-6 w-72 bg-neutral-900/95 backdrop-blur-xl border border-neutral-800 rounded-xl p-4 shadow-2xl animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-sm font-medium text-white">Properties</h3>
                    <p className="text-xs text-neutral-500 font-mono mt-0.5">{selectedObjectId.slice(0, 8)}</p>
                  </div>
                  <button
                    onClick={removeSelectedObject}
                    className="text-neutral-400 hover:text-red-400 p-1.5 rounded-md hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-neutral-400 mb-2 flex items-center gap-1">
                      <Palette size={12} /> Material Color
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {['#ffffff', '#e5e5e5', '#888888', '#1a1a1a', '#8b4513', '#d2691e', '#228b22', '#4682b4', '#ff6347', '#ffd700'].map(
                        (color) => (
                          <button
                            key={color}
                            onClick={() => updateObject(selectedObjectId, { material: { color } })}
                            className={`w-8 h-8 rounded-full border border-neutral-700 hover:scale-110 transition-transform shadow-sm ${roomState.objects.find((o) => o.id === selectedObjectId)?.material.color === color
                                ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-900'
                                : ''
                              }`}
                            style={{ backgroundColor: color }}
                          />
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Preview Panel */}
          <div className="w-[45%] border-l border-neutral-800 bg-neutral-950 flex flex-col relative">
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              {previewUrl && (
                <button
                  onClick={handleDownload}
                  className="p-2 bg-black/50 hover:bg-black/70 backdrop-blur rounded-lg text-white border border-white/10 transition-colors"
                  title="Download Image"
                >
                  <Download size={16} />
                </button>
              )}
              <button className="p-2 bg-black/50 hover:bg-black/70 backdrop-blur rounded-lg text-white border border-white/10 transition-colors">
                <Maximize2 size={16} />
              </button>
            </div>

            <div className="flex-1 relative">
              <RenderPreview imageUrl={previewUrl} isLoading={isGenerating} />

              {error && (
                <div className="absolute bottom-4 left-4 right-4 bg-red-900/90 text-red-100 p-3 rounded-lg text-sm border border-red-800 shadow-lg backdrop-blur">
                  Error: {error}
                </div>
              )}
            </div>

            {/* Status Bar */}
            <div className="h-10 border-t border-neutral-800 bg-neutral-900 flex items-center px-4 justify-between text-xs text-neutral-500">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
                {isGenerating ? 'Processing...' : 'Ready'}
              </div>
              <div>
                {roomState.objects.length} Objects • {roomState.styleReferenceImages.length} Refs
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
