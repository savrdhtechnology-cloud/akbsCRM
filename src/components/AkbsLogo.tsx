import React from 'react';
import akbsLogoImg from '../assets/images/akbs_rooster_logo_1790287505863.jpg';

interface AkbsLogoProps {
  className?: string;
  theme?: 'light' | 'dark';
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const AkbsLogo: React.FC<AkbsLogoProps> = ({
  className = '',
  theme = 'light',
  showTagline = true,
  size = 'md'
}) => {
  const width = { sm: 156, md: 190, lg: 240 }[size];

  return (
    <div
      className={`min-w-0 max-w-full select-none ${theme === 'dark' ? 'rounded-lg bg-white p-2' : ''} ${className}`}
      style={{ width }}
    >
      {/* Frame the original artwork, removing only its empty outer margins.
          Keep its proportions and lettering intact at every display size. */}
      <svg
        viewBox="130 145 840 325"
        role="img"
        aria-label={showTagline
          ? 'AKBS Poultry Farming — Healthy Birds | Better Tomorrow'
          : 'AKBS Poultry Farming'}
        className="block h-auto w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <image href={akbsLogoImg} width="1100" height="614" />
        {!showTagline && <rect x="450" y="400" width="520" height="70" fill="white" />}
      </svg>
    </div>
  );
};
