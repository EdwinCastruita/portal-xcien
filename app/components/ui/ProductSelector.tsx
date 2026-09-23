"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, Check, ChevronDown, Package, X } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  price: number;
}

interface ProductSelectorProps {
  products: Product[];
  selectedId: number | string;
  onSelect: (product: Product | null) => void;
  label?: string;
}

export default function ProductSelector({ products, selectedId, onSelect, label = "Seleccione un producto" }: ProductSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedProduct = products.find(p => p.id === Number(selectedId));

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 50); // Limit to 50 for performance

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-base-content/[0.03] border ${isOpen ? 'border-(--brand-accent)/50 shadow-[0_0_20px_var(--brand-accent-glow)]' : 'border-base-content/10'} rounded-2xl px-6 py-5 cursor-pointer transition-all flex items-center justify-between group`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <Package className={`w-4 h-4 transition-colors ${selectedProduct ? 'text-(--brand-accent)' : 'text-base-content/40'}`} />
          <span className={`text-sm font-black uppercase truncate ${selectedProduct ? 'text-base-content' : 'text-base-content/40'}`}>
            {selectedProduct ? selectedProduct.name : label}
          </span>
        </div>
        <ChevronDown className={`w-5 h-5 text-base-content/40 group-hover:text-base-content transition-all ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 card-premium elevate-3 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-base-content/5 bg-base-content/[0.02] flex items-center gap-3">
            <Search className="w-4 h-4 text-base-content/40" />
            <input
              autoFocus
              type="text"
              placeholder="Buscar producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-bold w-full text-base-content placeholder:text-base-content/40 uppercase"
            />
            {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="hover:text-base-content text-base-content/40 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            )}
          </div>

          <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => {
                    onSelect(product);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                  className="flex items-center justify-between px-6 py-4 hover:bg-base-content/5 cursor-pointer transition-colors border-b border-base-content/[0.02] last:border-0 group"
                >
                  <div className="flex flex-col gap-0.5 max-w-[85%]">
                    <span className="text-[11px] font-black uppercase text-base-content/85 group-hover:text-base-content transition-colors">
                        {product.name}
                    </span>
                    <span className="text-[10px] font-mono text-(--brand-accent)/60 group-hover:text-(--brand-accent) transition-colors">
                        ${product.price ? product.price.toLocaleString('es-MX', { minimumFractionDigits: 2 }) : '0.00'}
                    </span>
                  </div>
                  {Number(selectedId) === product.id && (
                    <div className="w-6 h-6 rounded-full bg-(--brand-accent) flex items-center justify-center shadow-[0_0_15px_var(--brand-accent-glow)]">
                        <Check className="w-3 h-3 text-primary-content stroke-[4px]" />
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="px-6 py-10 text-center">
                <p className="text-[10px] font-black text-base-content/45 uppercase tracking-widest">No se encontraron productos</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
