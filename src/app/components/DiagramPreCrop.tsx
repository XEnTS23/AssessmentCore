import React, { useState, useRef, useEffect } from 'react';
import { X, Check, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

export interface CropBox {
  id: string;
  /** [y, x, height, width] in percentages (0-100) */
  coordinates: [number, number, number, number];
  type?: 'stem' | 'option';
  optionLabel?: 'A' | 'B' | 'C' | 'D';
  /** 1-based question number for deterministic diagram assignment */
  questionNumber?: number;
}

export interface DiagramPreCropProps {
  imageUrl: string;
  onApprove: (crops: CropBox[]) => void;
  onCancel?: () => void;
  allPages?: Array<{ filename: string; base64: string }>;
  currentPageIndex?: number;
  onPageChange?: (index: number) => void;
}

export function DiagramPreCrop({ imageUrl, onApprove, onCancel, allPages = [], currentPageIndex = 0, onPageChange }: DiagramPreCropProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [crops, setCrops] = useState<CropBox[]>([]);
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentBox, setCurrentBox] = useState<CropBox | null>(null);
  
  // Tagging state
  const [selectedCropId, setSelectedCropId] = useState<string | null>(null);
  const [popoverMode, setPopoverMode] = useState<'main' | 'options' | 'qnumber'>('main');

  // Pending tag state (held while user enters Q number)
  const [pendingType, setPendingType] = useState<'stem' | 'option' | null>(null);
  const [pendingLabel, setPendingLabel] = useState<'A' | 'B' | 'C' | 'D' | undefined>(undefined);
  const [qNumberInput, setQNumberInput] = useState('');
  
  // Zoom state
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const zoomLevels = [1.0, 1.25, 1.5, 1.75, 2.0];
  
  const handleZoomIn = () => {
    const currentIndex = zoomLevels.indexOf(zoomLevel);
    if (currentIndex < zoomLevels.length - 1) {
      setZoomLevel(zoomLevels[currentIndex + 1]);
    }
  };
  
  const handleZoomOut = () => {
    const currentIndex = zoomLevels.indexOf(zoomLevel);
    if (currentIndex > 0) {
      setZoomLevel(zoomLevels[currentIndex - 1]);
    }
  };
  
  const handleZoomReset = () => {
    setZoomLevel(1.0);
  };

  const getRelativePosition = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    
    // Calculate percentage (0 to 100)
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    
    return { 
      x: Math.max(0, Math.min(100, x)), 
      y: Math.max(0, Math.min(100, y)) 
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    // Only start drawing if we are not clicking on an existing popover or box button
    if ((e.target as HTMLElement).closest('.ignore-draw')) return;
    
    // Prevent default to stop scrolling on touch
    if (e.type !== 'mousedown') {
       // Cannot always prevent default on touchstart if it's passive, but we'll try in a real app.
    }

    const pos = getRelativePosition(e);
    setIsDrawing(true);
    setStartPos(pos);
    
    // Close any open popover
    if (selectedCropId) {
      setSelectedCropId(null);
      setPopoverMode('main');
    }
    
    const newBox: CropBox = {
      id: Math.random().toString(36).substring(2, 9),
      coordinates: [pos.y, pos.x, 0, 0], // y, x, h, w
    };
    setCurrentBox(newBox);
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !currentBox) return;
    
    const currentPos = getRelativePosition(e);
    
    // Calculate width and height (can be negative if dragging left/up)
    const rawW = currentPos.x - startPos.x;
    const rawH = currentPos.y - startPos.y;
    
    // Normalize to top-left x,y and positive width, height
    const x = rawW < 0 ? currentPos.x : startPos.x;
    const y = rawH < 0 ? currentPos.y : startPos.y;
    const w = Math.abs(rawW);
    const h = Math.abs(rawH);
    
    setCurrentBox({
      ...currentBox,
      coordinates: [y, x, h, w],
    });
  };

  const handlePointerUp = () => {
    if (!isDrawing || !currentBox) return;
    setIsDrawing(false);
    
    const [, , h, w] = currentBox.coordinates;
    // Only save if it's large enough (e.g., > 2% width and height)
    if (w > 2 && h > 2) {
      setCrops((prev) => [...prev, currentBox]);
      setSelectedCropId(currentBox.id);
      setPopoverMode('main');
    }
    setCurrentBox(null);
  };

  // Add global mouse up to stop drawing if dragged outside
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDrawing) handlePointerUp();
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [isDrawing, currentBox]);

  const updateCropTag = (id: string, type: 'stem' | 'option', label?: 'A' | 'B' | 'C' | 'D', questionNumber?: number) => {
    setCrops((prev) =>
      prev.map((c) => (c.id === id ? { ...c, type, optionLabel: label, questionNumber } : c))
    );
    setSelectedCropId(null);
    setPopoverMode('main');
    setPendingType(null);
    setPendingLabel(undefined);
    setQNumberInput('');
  };

  const startQNumberStep = (type: 'stem' | 'option', label?: 'A' | 'B' | 'C' | 'D') => {
    setPendingType(type);
    setPendingLabel(label);
    setQNumberInput('');
    setPopoverMode('qnumber');
  };

  const handleAssignQNumber = () => {
    if (!selectedCropId || !pendingType) return;
    const qNum = parseInt(qNumberInput, 10);
    if (isNaN(qNum) || qNum < 1) return;
    updateCropTag(selectedCropId, pendingType, pendingLabel, qNum);
  };

  const deleteCrop = (id: string) => {
    setCrops((prev) => prev.filter((c) => c.id !== id));
    if (selectedCropId === id) setSelectedCropId(null);
  };

  const renderBox = (crop: CropBox, isCurrent = false) => {
    const [y, x, h, w] = crop.coordinates;
    const isSelected = selectedCropId === crop.id;
    
    let borderColor = 'border-yellow-400';
    let bgColor = 'bg-yellow-400/20';
    let label = 'Untagged';

    if (crop.type === 'stem') {
      borderColor = 'border-blue-500';
      bgColor = 'bg-blue-500/20';
      label = crop.questionNumber ? `Q${crop.questionNumber} Stem` : 'Question Stem';
    } else if (crop.type === 'option') {
      borderColor = 'border-emerald-500';
      bgColor = 'bg-emerald-500/20';
      label = crop.questionNumber ? `Q${crop.questionNumber} Opt ${crop.optionLabel}` : `Option ${crop.optionLabel}`;
    }

    // Un-tagged boxes pulse slightly to attract attention
    const isUntagged = !crop.type && !isCurrent;

    return (
      <div
        key={crop.id}
        className={`absolute border-2 ${borderColor} ${bgColor} ${isCurrent ? 'border-dashed' : 'border-solid'} ${isUntagged ? 'animate-pulse' : ''} transition-colors`}
        style={{
          top: `${y}%`,
          left: `${x}%`,
          height: `${h}%`,
          width: `${w}%`,
        }}
        onClick={(e) => {
          if (!isCurrent) {
            e.stopPropagation();
            setSelectedCropId(crop.id);
            setPopoverMode('main');
          }
        }}
      >
        {/* Label Badge */}
        {!isCurrent && crop.type && (
          <div className={`absolute -top-6 left-[-2px] px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider rounded-t-sm whitespace-nowrap ${crop.type === 'stem' ? 'bg-blue-500' : 'bg-emerald-500'}`}
            style={{ transform: `scale(${1 / zoomLevel})`, transformOrigin: 'bottom left' }}>
            {label}
          </div>
        )}
        
        {/* Popover logic */}
        {isSelected && !isCurrent && (
          <div 
            className="ignore-draw absolute top-full mt-2 left-1/2 z-50 min-w-[200px] bg-card rounded-lg shadow-xl border border-border p-3"
            onClick={(e) => e.stopPropagation()}
            style={{ transform: `translate(-50%, 0) scale(${1 / zoomLevel})`, transformOrigin: 'center top' }}
          >
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-semibold text-foreground">
                {popoverMode === 'main' ? 'What is this image?' : popoverMode === 'options' ? 'Select Option' : 'Question Number'}
              </h4>
              <button onClick={() => deleteCrop(crop.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1" title="Delete box">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {popoverMode === 'main' ? (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => startQNumberStep('stem')} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                  Stem
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPopoverMode('options')} className="flex-1">
                  Option →
                </Button>
              </div>
            ) : popoverMode === 'options' ? (
              <div className="flex gap-1.5">
                {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                  <Button 
                    key={opt} 
                    size="sm" 
                    variant="outline" 
                    onClick={() => startQNumberStep('option', opt)}
                    className="flex-1 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                  >
                    {opt}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground">
                  {pendingType === 'stem' ? 'Stem diagram' : `Option ${pendingLabel} diagram`} — assign to:
                </p>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min="1"
                    value={qNumberInput}
                    onChange={(e) => setQNumberInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAssignQNumber(); }}
                    placeholder="Q no."
                    autoFocus
                    className="ignore-draw w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <Button
                    size="sm"
                    onClick={handleAssignQNumber}
                    disabled={!qNumberInput || parseInt(qNumberInput, 10) < 1}
                    className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Assign
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const allTagged = crops.length > 0 && crops.every(c => c.type && c.questionNumber);

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar with page thumbnails */}
      {allPages.length > 0 && (
        <div className="w-48 border-r border-border bg-card overflow-y-auto">
          <div className="p-3 border-b border-border">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">Pages</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">{allPages.length} total</p>
          </div>
          <div className="p-2 space-y-2">
            {allPages.map((page, index) => (
              <button
                key={index}
                onClick={() => onPageChange?.(index)}
                className={`w-full rounded-lg border-2 overflow-hidden transition-all ${
                  index === currentPageIndex
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="relative aspect-[8.5/11] bg-muted">
                  <img
                    src={`data:image/jpeg;base64,${page.base64}`}
                    alt={`Page ${index + 1}`}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                    <p className="text-[10px] font-semibold text-white text-center">
                      Page {index + 1}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Main image area */}
        <div className="flex-1 p-4 flex justify-center items-center overflow-auto bg-muted/30">
          <div 
            ref={containerRef}
            className="relative inline-block border-2 border-border bg-card shadow-2xl max-w-full cursor-crosshair touch-none rounded-lg overflow-hidden transition-transform duration-200"
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            style={{ 
              userSelect: 'none',
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'center center'
            }}
          >
            {/* Prevent image drag */}
            <img 
              src={imageUrl} 
              alt="PDF Page Preview" 
              className="block w-full h-auto max-h-[calc(100vh-120px)] object-contain pointer-events-none" 
              draggable={false}
            />
            
            {/* Render committed crops */}
            {crops.map((crop) => renderBox(crop))}
            
            {/* Render box currently being drawn */}
            {currentBox && renderBox(currentBox, true)}
          </div>

        {/* Zoom level indicator - top right (fixed position) */}
        <div className="ignore-draw fixed top-6 right-6 bg-card border border-border rounded-lg px-3 py-1.5 shadow-lg z-20">
          <span className="text-xs font-semibold text-foreground">{Math.round(zoomLevel * 100)}%</span>
        </div>

        {/* Floating action buttons - bottom right (fixed position) */}
        <div className="ignore-draw fixed bottom-6 right-6 flex flex-col gap-2 z-20">
          {/* Zoom controls - icon only buttons */}
          <button
            onClick={handleZoomIn}
            disabled={zoomLevel >= 2.0}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-card border border-border shadow-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="h-5 w-5 text-foreground" />
          </button>
          <button
            onClick={handleZoomOut}
            disabled={zoomLevel <= 1.0}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-card border border-border shadow-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="h-5 w-5 text-foreground" />
          </button>
          <button
            onClick={handleZoomReset}
            disabled={zoomLevel === 1.0}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-card border border-border shadow-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Reset Zoom"
          >
            <Maximize2 className="h-5 w-5 text-foreground" />
          </button>

          {/* Divider */}
          <div className="h-px bg-border my-1"></div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
              {onCancel && (
                <Button variant="outline" onClick={onCancel} className="shadow-lg">
                  Cancel
                </Button>
              )}
              <Button 
                onClick={() => onApprove(crops)} 
                disabled={crops.length > 0 && !allTagged}
                className={`shadow-lg ${crops.length === 0 || allTagged ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
              >
                {crops.length === 0 ? (
                  <span className="flex items-center"><Check className="w-4 h-4 mr-2" /> Skip (No Diagrams)</span>
                ) : (
                  <span className="flex items-center"><Check className="w-4 h-4 mr-2" /> Approve & Extract</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
