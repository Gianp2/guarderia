import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  const modalNode = (
    <div 
      className="fixed inset-0 z-[9999] overflow-y-auto"
      aria-modal="true"
      role="dialog"
    >
      {/* Glass Backdrop covering entire screen */}
      <div 
        className="fixed inset-0 bg-[#1A2621]/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Centering Wrapper: outer backdrop flex items-center justify-center p-4 */}
      <div 
        className="flex min-h-full items-center justify-center p-4 text-center"
        onClick={onClose}
      >
        {/* Modal Dialog Card */}
        <div 
          className={`relative z-10 w-full ${maxWidthClasses[maxWidth]} my-auto transform overflow-hidden rounded-2xl sm:rounded-3xl bg-white text-left shadow-2xl border border-[#E9ECEF] transition-all flex flex-col max-h-[85vh]`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Glass style, clean and sticky */}
          <div className="px-5 py-4 sm:px-6 sm:py-4.5 border-b border-[#F0F2F5] flex items-center justify-between bg-white shrink-0">
            <div className="pr-3 min-w-0 flex-1">
              <h3 className="text-sm sm:text-base md:text-lg font-bold text-[#1B4332] truncate">{title}</h3>
              {subtitle && (
                <p className="text-[11px] sm:text-xs text-[#52796F] mt-0.5 truncate font-medium">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 -mr-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0 cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Inner Container - max-h-[85vh] overflow-y-auto */}
          <div className="p-4 sm:p-6 max-h-[85vh] overflow-y-auto overscroll-contain flex-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
};
