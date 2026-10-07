"use client";

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, Check, ChevronDown, LucideIcon, X } from 'lucide-react';

interface Option {
  id: number | string;
  name: string;
  subtitle?: string;
  extra?: string;
}

interface SmartSelectorProps {
  options: Option[];
  selectedId: number | string | null;
  onSelect: (option: Option | null) => void;
  label?: string;
  placeholder?: string;
  icon?: LucideIcon;
  renderOption?: (option: Option) => React.ReactNode;
}

export default function SmartSelector({ 
    options, 
    selectedId, 
    onSelect, 
    label, 
    placeholder = "Seleccionar...", 
    icon: Icon,
    renderOption
}: SmartSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null);

  const selectedOption = options.find(o => String(o.id) === String(selectedId));

  const filteredOptions = options.filter(o => 
    o.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (o.subtitle && o.subtitle.toLowerCase().includes(searchTerm.toLowerCase()))
  ).slice(0, 50);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        !containerRef.current?.contains(event.target as Node) &&
        !menuRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const below = window.innerHeight - rect.bottom - 16;
      const above = rect.top - 16;
      const openAbove = below < 220 && above > below;
      const maxHeight = Math.max(120, Math.min(380, openAbove ? above : below));
      setMenuPosition({
        left: rect.left,
        top: openAbove ? Math.max(8, rect.top - maxHeight - 8) : rect.bottom + 8,
        width: rect.width,
        maxHeight,
      });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && <p className="text-[10px] font-black text-base-content/50 uppercase tracking-[0.2em] mb-3 ml-1">{label}</p>}

      <div
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-base-content/[0.03] border ${isOpen ? 'border-(--brand-accent)/50 shadow-[0_0_30px_var(--brand-accent-glow)] ring-1 ring-(--brand-accent)/20' : 'border-base-content/10'} rounded-2xl px-6 py-5 cursor-pointer transition-all flex items-center justify-between group hover:bg-base-content/[0.05]`}
      >
        <div className="flex items-center gap-4 overflow-hidden">
          {Icon && <Icon className={`w-4 h-4 transition-colors ${selectedOption ? 'text-(--brand-accent)' : 'text-base-content/40'}`} />}
          <span className={`text-sm font-black uppercase truncate tracking-tight ${selectedOption ? 'text-base-content' : 'text-base-content/40'}`}>
            {selectedOption ? selectedOption.name : placeholder}
          </span>
        </div>
        <ChevronDown className={`w-5 h-5 text-base-content/40 group-hover:text-base-content transition-all ${isOpen ? 'rotate-180 text-(--brand-accent)' : ''}`} />
      </div>

      {isOpen && menuPosition && typeof document !== 'undefined' && createPortal(
        <div ref={menuRef} style={{ position: 'fixed', left: menuPosition.left, top: menuPosition.top, width: menuPosition.width, maxHeight: menuPosition.maxHeight }} className="z-[9999] card-premium elevate-3 rounded-[28px] overflow-hidden animate-in fade-in zoom-in-95 duration-200 backdrop-blur-3xl">
          <div className="p-5 border-b border-base-content/5 bg-base-content/[0.02] flex items-center gap-4">
            <Search className="w-5 h-5 text-base-content/40" />
            <input
              autoFocus
              type="text"
              placeholder="Escribe para buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-bold w-full text-base-content placeholder:text-base-content/40 uppercase tracking-wide"
            />
            {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="hover:text-(--brand-accent) text-base-content/40 transition-colors p-1">
                    <X className="w-4 h-4" />
                </button>
            )}
          </div>

          <div style={{ maxHeight: menuPosition.maxHeight - 80 }} className="overflow-y-auto custom-scrollbar p-2">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.id}
                  onClick={() => {
                    onSelect(option);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                  className={`flex items-center justify-between px-5 py-4 rounded-xl cursor-pointer transition-all mb-1 last:mb-0 group ${String(selectedId) === String(option.id) ? 'bg-(--brand-accent)/10' : 'hover:bg-base-content/5'}`}
                >
                  <div className="flex flex-col gap-1 max-w-[85%]">
                    {renderOption ? renderOption(option) : (
                        <>
                            <span className={`text-[11px] font-black uppercase tracking-tight transition-colors ${String(selectedId) === String(option.id) ? 'text-(--brand-accent)' : 'text-base-content/85 group-hover:text-base-content'}`}>
                                {option.name}
                            </span>
                            {(option.subtitle || option.extra) && (
                                <div className="flex items-center gap-2">
                                    {option.subtitle && <span className="text-[9px] font-bold text-base-content/55 uppercase">{option.subtitle}</span>}
                                    {option.extra && <span className="text-[9px] font-mono text-(--brand-accent)/60">{option.extra}</span>}
                                </div>
                            )}
                        </>
                    )}
                  </div>
                  {String(selectedId) === String(option.id) && (
                    <div className="w-7 h-7 rounded-full bg-(--brand-accent) flex items-center justify-center shadow-[0_0_20px_var(--brand-accent-glow)]">
                        <Check className="w-4 h-4 text-primary-content stroke-[4px]" />
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center">
                <Search className="w-8 h-8 text-base-content/30 mx-auto mb-4" strokeWidth={1.5} />
                <p className="text-[10px] font-black text-base-content/45 uppercase tracking-widest">No se encontraron resultados</p>
              </div>
            )}
          </div>
        </div>, document.body,
      )}
    </div>
  );
}
