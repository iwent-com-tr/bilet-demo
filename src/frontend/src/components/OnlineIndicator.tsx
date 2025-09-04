import React from 'react';

interface OnlineIndicatorProps {
  isOnline: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const OnlineIndicator: React.FC<OnlineIndicatorProps> = ({ 
  isOnline, 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3', 
    lg: 'w-4 h-4'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <div 
        className={`
          ${sizeClasses[size]} 
          rounded-full 
          ${isOnline ? 'bg-green-500' : 'bg-gray-400'}
          ${isOnline ? 'animate-pulse' : ''}
        `}
      />
      <span className={`${textSizes[size]} ${isOnline ? 'text-green-600' : 'text-gray-500'}`}>
        {isOnline ? 'çevrimiçi' : 'çevrimdışı'}
      </span>
    </div>
  );
};

export default OnlineIndicator; 