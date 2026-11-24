import React from 'react';
import { BoosterType } from '../game/types';

export const TitleLockupSvg: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 640 175"
    className={className}
    role="img"
    aria-label="Baldo's Basics: Integrales Dobles"
  >
    {/* Subtle tilted cream paper sheet behind title (echoes Baldi's Basics Classic reference) */}
    <g transform="rotate(-3 320 88)">
      <rect
        x="18"
        y="12"
        width="604"
        height="148"
        rx="8"
        fill="#fffef7"
        stroke="#18181b"
        strokeWidth="4"
      />
      <line x1="32" y1="42" x2="608" y2="42" stroke="#dbeafe" strokeWidth="2" />
      <line x1="32" y1="74" x2="608" y2="74" stroke="#dbeafe" strokeWidth="2" />
      <line x1="32" y1="106" x2="608" y2="106" stroke="#dbeafe" strokeWidth="2" />
      <line x1="32" y1="138" x2="608" y2="138" stroke="#dbeafe" strokeWidth="2" />
      <line x1="76" y1="14" x2="76" y2="158" stroke="#fca5a5" strokeWidth="2.5" />
    </g>

    {/* Wooden school ruler accent on the left */}
    <g transform="translate(36, 20) rotate(-11)">
      <rect
        x="0"
        y="0"
        width="26"
        height="132"
        rx="2"
        fill="#facc15"
        stroke="#18181b"
        strokeWidth="3"
      />
      <rect x="2" y="2" width="6" height="128" fill="#fef08a" opacity="0.65" />
      {[12, 26, 40, 54, 68, 82, 96, 110, 122].map((y, idx) => (
        <line
          key={y}
          x1="15"
          y1={y}
          x2="26"
          y2={y}
          stroke="#18181b"
          strokeWidth={idx % 2 === 0 ? '2.5' : '1.5'}
        />
      ))}
    </g>

    {/* Tilted vibrant green "Baldo's" comic wordmark */}
    <text
      x="105"
      y="92"
      transform="rotate(-9 160 80)"
      fill="#16c60c"
      stroke="#14532d"
      strokeWidth="5"
      paintOrder="stroke fill"
      fontFamily="Comic Neue, Comic Sans MS, cursive"
      fontWeight="700"
      fontSize="66"
    >
      Baldo&apos;s
    </text>

    {/* Crisp black 90s Times-serif "BASICS" */}
    <text
      x="342"
      y="86"
      fill="#111827"
      fontFamily="Libre Baskerville, Georgia, Times New Roman, serif"
      fontWeight="700"
      fontSize="58"
      letterSpacing="2"
    >
      BASICS
    </text>

    {/* Handwritten bright red "Integrales Dobles" subtitle */}
    <text
      x="338"
      y="136"
      textAnchor="middle"
      fill="#dc2626"
      stroke="#7f1d1d"
      strokeWidth="2.5"
      paintOrder="stroke fill"
      fontFamily="Comic Neue, Comic Sans MS, cursive"
      fontWeight="700"
      fontStyle="italic"
      fontSize="36"
    >
      ∬ Integrales Dobles
    </text>
  </svg>
);

export const NotebookIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 28 28" className={className} aria-hidden="true">
    <rect x="6" y="3" width="18" height="22" rx="2" fill="#2563eb" stroke="#18181b" strokeWidth="2.2" />
    <rect x="9" y="7" width="12" height="10" rx="1" fill="#fef9c3" stroke="#18181b" strokeWidth="1.4" />
    <text x="11.2" y="15.2" fontSize="9.5" fontFamily="Georgia, serif" fontWeight="700" fill="#18181b">
      ∬
    </text>
    <line x1="3.5" y1="7" x2="7.5" y2="7" stroke="#18181b" strokeWidth="2.2" strokeLinecap="round" />
    <line x1="3.5" y1="12" x2="7.5" y2="12" stroke="#18181b" strokeWidth="2.2" strokeLinecap="round" />
    <line x1="3.5" y1="17" x2="7.5" y2="17" stroke="#18181b" strokeWidth="2.2" strokeLinecap="round" />
    <line x1="3.5" y1="22" x2="7.5" y2="22" stroke="#18181b" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

export const BoosterIcon: React.FC<{ type: BoosterType; className?: string }> = ({
  type,
  className = 'w-7 h-7',
}) => {
  if (type === 'coffee') {
    return (
      <svg viewBox="0 0 28 28" className={className} aria-hidden="true">
        <path d="M7 9H21L19 24H9L7 9Z" fill="#92400e" stroke="#18181b" strokeWidth="2" />
        <rect x="8.5" y="13.5" width="11" height="5.5" fill="#fef3c7" stroke="#18181b" strokeWidth="1.2" />
        <rect x="5.5" y="6" width="17" height="3.5" rx="1" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
        <path d="M12 4.5C12 2.5 16 2.5 16 4.5" stroke="#d97706" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === 'energy') {
    return (
      <svg viewBox="0 0 28 28" className={className} aria-hidden="true">
        <g transform="rotate(-18 14 14)">
          <rect x="3" y="8.5" width="22" height="11" rx="2" fill="#dc2626" stroke="#18181b" strokeWidth="2" />
          <rect x="7" y="10.2" width="14" height="7.6" fill="#facc15" />
          <path d="M14.5 11L11.5 14.5H14L13.5 17.5L16.8 13.8H14.2L14.5 11Z" fill="#18181b" />
        </g>
      </svg>
    );
  }
  if (type === 'scissors') {
    return (
      <svg viewBox="0 0 28 28" className={className} aria-hidden="true">
        <line x1="11" y1="15" x2="23" y2="6" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
        <line x1="11" y1="13" x2="23" y2="21" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
        <line x1="11" y1="15" x2="23" y2="6" stroke="#18181b" strokeWidth="1" />
        <circle cx="8" cy="10" r="3.6" fill="none" stroke="#2563eb" strokeWidth="2.6" />
        <circle cx="8" cy="18.5" r="3.6" fill="none" stroke="#2563eb" strokeWidth="2.6" />
      </svg>
    );
  }
  // oil (WD-NoSquee)
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden="true">
      <rect x="8" y="9" width="11" height="15" rx="1.5" fill="#0f766e" stroke="#18181b" strokeWidth="2" />
      <rect x="8" y="13.5" width="11" height="6" fill="#facc15" stroke="#18181b" strokeWidth="1.2" />
      <rect x="10.5" y="5.5" width="6" height="3.5" fill="#e2e8f0" stroke="#18181b" strokeWidth="1.6" />
      <line x1="16.5" y1="6.8" x2="24" y2="5" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
};

export const BaldicatorEarIcon: React.FC<{ heard: boolean; angry: boolean }> = ({
  heard,
  angry,
}) => (
  <svg viewBox="0 0 36 36" className="w-8 h-8" aria-hidden="true">
    <circle
      cx="18"
      cy="18"
      r="15"
      fill={heard ? '#ef4444' : angry ? '#fef08a' : '#dcfce7'}
      stroke="#18181b"
      strokeWidth="2.5"
    />
    {/* Retro stylized ear / ruler alert */}
    <path
      d="M14 12C14 8.5 22 8.5 22 14.5C22 18.5 18 19.5 18 22.5C18 24.5 15 25 14 23.5"
      fill="none"
      stroke={heard ? '#ffffff' : '#18181b'}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <circle cx="17.5" cy="15.5" r="1.8" fill={heard ? '#ffffff' : '#18181b'} />
    {heard && (
      <>
        <path d="M26 11C28.5 13.5 28.5 21.5 26 24" fill="none" stroke="#fef08a" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M10 11C7.5 13.5 7.5 21.5 10 24" fill="none" stroke="#fef08a" strokeWidth="2.4" strokeLinecap="round" />
      </>
    )}
  </svg>
);

export const VolumeIcon: React.FC<{ muted: boolean }> = ({ muted }) => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path d="M4 9H8L13 5V19L8 15H4V9Z" fill="currentColor" />
    {muted ? (
      <path d="M16 9L21 15M21 9L16 15" stroke="#ef4444" strokeWidth="2.4" strokeLinecap="round" />
    ) : (
      <path
        d="M16.5 8.5C18.2 10.2 18.2 13.8 16.5 15.5M19 6C22 9 22 15 19 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    )}
  </svg>
);

export const PauseIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <rect x="6" y="5" width="4.5" height="14" rx="1" fill="currentColor" />
    <rect x="13.5" y="5" width="4.5" height="14" rx="1" fill="currentColor" />
  </svg>
);
