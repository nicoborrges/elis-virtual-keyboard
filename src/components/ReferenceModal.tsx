import React from 'react';
import { X, BookOpen } from 'lucide-react';
import { ELIS_STEPS, ELIS_VISOGRAFEMAS } from '../data/elisMap';

interface ReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReferenceModal: React.FC<ReferenceModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tabela de Referência ELiS Decodificada"
      className="absolute inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md animate-fadeIn"
    >
      {/* Modal Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/90">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-bold text-slate-100">
            ELiS Decodificada (95 Visografemas)
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar guia de referência"
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Table of All 95 Visografemas */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {ELIS_STEPS.map((stepDef) => {
          const stepItems = ELIS_VISOGRAFEMAS.filter(
            (item) => item.step === stepDef.step
          );
          return (
            <div key={stepDef.step} className="space-y-2">
              <div className="sticky top-0 z-10 bg-slate-950/95 py-1 border-b border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  {stepDef.fullTitle}
                </h3>
                <p className="text-[11px] text-slate-400">{stepDef.groupName}</p>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {stepItems.map((item) => (
                  <div
                    key={`${item.step}-${item.id}`}
                    className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/80 border border-slate-800/80"
                  >
                    <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-950 border border-slate-800 font-elis text-2xl text-indigo-300 shrink-0">
                      {item.char}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-mono text-slate-400">
                          #{item.id}
                        </span>
                        <span className="text-[10px] font-mono text-indigo-400/80">
                          [{item.char}]
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 font-medium truncate">
                        {item.label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
