import React from 'react';
import akbsLogoImg from '../assets/images/akbs_rooster_logo_1790287505863.jpg';

interface AkbsLogoProps {
  className?: string;
  theme?: 'light' | 'dark'; // 'light' has white background like Image 2, 'dark' has white text on dark bg
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const AkbsLogo: React.FC<AkbsLogoProps> = ({
  className = '',
  theme = 'light',
  showTagline = true,
  size = 'md'
}) => {
  const isLight = theme === 'light';

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 select-none ${className}`}>
      {/* Rooster Emblem with Black body & Bright Red Comb */}
      <div className="relative shrink-0 flex items-center justify-center">
        <svg
          viewBox="0 0 64 64"
          className={
            size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10'
          }
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Red Crest / Comb on head */}
          <path
            d="M34 10C34 10 32 6 28 7C25 7.8 25 11 25 11C25 11 22 9 19 11C16 13 17 16 17 16C17 16 14 16 14 19C14 22 17 23 18 23L22 22C24 20 28 17 34 10Z"
            fill="#E53935"
          />
          {/* Red Wattle below beak */}
          <path
            d="M36 26C36 29 33 32 31 32C29 32 29 28 30 26C31 24 36 24 36 26Z"
            fill="#E53935"
          />
          {/* Rooster Head, Beak & Body in Black/Dark */}
          <path
            d="M24 16C27 16 30 18 33 21L39 23L34 26C34 28 33 31 31 33C29 36 29 39 31 43C33 47 34 50 33 53H27C27 50 26 47 24 45C22 43 20 40 19 36C18 31 19 25 21 21C22 18 23 16 24 16Z"
            fill={isLight ? '#111827' : '#FFFFFF'}
          />
          {/* Beak in warm golden yellow */}
          <path
            d="M34 22L41 23.5L34 26.5V22Z"
            fill="#F59E0B"
          />
          {/* Rooster Eye */}
          <circle cx="28" cy="20" r="1.5" fill="#FFFFFF" />
          <circle cx="28.3" cy="20" r="0.7" fill="#111827" />
          {/* Curved Tail Feathers */}
          <path
            d="M20 32C17 28 12 26 8 28C6 29 5 32 7 34C11 37 15 39 18 41C14 39 10 39 7 42C5 44 6 47 9 47C13 47 16 46 19 45C16 46 13 48 11 51C10 53 12 55 15 54C19 53 22 49 24 45"
            fill={isLight ? '#111827' : '#FFFFFF'}
          />
        </svg>
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col text-left leading-tight">
        <span
          className={`font-['Outfit',sans-serif] font-black tracking-tight ${
            size === 'sm'
              ? 'text-base'
              : size === 'lg'
              ? 'text-2xl'
              : 'text-xl'
          } ${isLight ? 'text-slate-950' : 'text-white'}`}
        >
          AKBS
        </span>
        <span
          className={`font-['Outfit',sans-serif] font-bold tracking-tight -mt-0.5 ${
            size === 'sm'
              ? 'text-[11px]'
              : size === 'lg'
              ? 'text-sm'
              : 'text-[12.5px]'
          } ${isLight ? 'text-slate-900' : 'text-slate-100'}`}
        >
          Poultry Farming
        </span>
        {showTagline && (
          <span
            className={`font-['Outfit',sans-serif] font-medium tracking-[0.03em] mt-0.5 ${
              size === 'sm' ? 'text-[8.5px]' : 'text-[9.5px]'
            } ${isLight ? 'text-slate-700' : 'text-emerald-300'}`}
          >
            Healthy Birds | Better Tomorrow
          </span>
        )}
      </div>
    </div>
  );
};
