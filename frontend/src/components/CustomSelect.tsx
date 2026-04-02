import { useState, useEffect, useRef } from "react";
import { CaretDown, MagnifyingGlass, Check } from "@phosphor-icons/react";

export interface CustomSelectProps {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  onChange: (val: string) => void;
}

export default function CustomSelect({ label, value, options, placeholder, onChange }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
    if (!open) setSearch("");
  }, [open]);

  const filtered = search
    ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4" ref={ref}>
      <label className="block text-[10px] font-medium text-neutral-500 mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-neutral-50 border border-neutral-200 text-sm outline-none hover:border-neutral-300 focus:border-orange-400 transition-colors"
      >
        <span className={value ? "text-neutral-900" : "text-neutral-400"}>{value || placeholder}</span>
        <CaretDown size={14} weight="bold" className={`text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-1.5 border border-neutral-200 rounded-lg bg-white shadow-lg overflow-hidden">
          <div className="p-1.5 border-b border-neutral-100">
            <div className="relative">
              <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-7 pr-2 py-1.5 text-xs bg-neutral-50 border border-neutral-100 rounded-md outline-none focus:border-orange-400 text-neutral-700 placeholder:text-neutral-400 transition-colors"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <p className="text-xs text-neutral-400 text-center py-4">Nenhum resultado</p>
            )}
            {filtered.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between ${
                  value === opt
                    ? "bg-orange-50 text-orange-600 font-bold"
                    : "text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {opt}
                {value === opt && <Check size={12} weight="bold" className="text-orange-500" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
