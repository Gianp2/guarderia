import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg'
}) => {
  // Bulletproof lock of background scroll when modal or card is open
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto overscroll-contain"
      style={{ touchAction: 'pan-y' }}
    >
      {/* Glass Backdrop */}
      <div 
        className="fixed inset-0 bg-[#1A2621]/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        style={{ touchAction: 'none' }}
      />

      {/* Modal Dialog */}
      <div 
        className={`relative w-full ${maxWidthClasses[maxWidth]} bg-white rounded-3xl shadow-2xl border border-[#E9ECEF] overflow-hidden z-10 my-auto`}
        onClick={(e) => e.stopPropagation()}
        style={{ touchAction: 'auto' }}
      >
        {/* Header - Glass style, clean and professional */}
        <div className="sticky top-0 z-10 px-5 py-4 sm:px-6 sm:py-5 border-b border-[#F0F2F5] flex items-center justify-between bg-white/90 backdrop-blur-md backdrop-saturate-150 shrink-0">
          <div className="pr-2 min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-[#1B4332] truncate">{title}</h3>
            {subtitle && (
              <p className="text-xs text-[#52796F] mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0 cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - allows scroll inside modal only */}
        <div className="p-4 sm:p-6 max-h-[calc(85dvh-100px)] overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
};
