import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'blue' | 'amber' | 'purple' | 'red' | 'gray';
  size?: 'sm' | 'md';
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'gray',
  size = 'md',
  className = '',
  icon
}) => {
  const variantStyles = {
    green: 'bg-[#EBF3ED] text-[#245436] border-[#D1E4D7]',
    blue: 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]',
    amber: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
    purple: 'bg-[#F3E8FF] text-[#6B21A8] border-[#E9D5FF]',
    red: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]',
    gray: 'bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {icon && <span className="inline-block">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
