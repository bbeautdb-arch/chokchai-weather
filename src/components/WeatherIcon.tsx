import type { SceneKey } from '../lib/weather'

export function WeatherIcon({ scene, className = '' }: { scene: SceneKey; className?: string }) {
  if (scene === 'sunny') {
    return (
      <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
        <defs>
          <radialGradient id="sunCore" cx="45%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#FFF6C8" />
            <stop offset="45%" stopColor="#FFD056" />
            <stop offset="100%" stopColor="#F0A020" />
          </radialGradient>
          <filter id="softS">
            <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#2a3a50" floodOpacity="0.25" />
          </filter>
        </defs>
        <g filter="url(#softS)" transform="translate(60 58)">
          <circle r="26" fill="url(#sunCore)" />
          <g stroke="#FFC84A" strokeWidth="3.5" strokeLinecap="round" opacity="0.9">
            <line x1="0" y1="-36" x2="0" y2="-44" />
            <line x1="26" y1="-26" x2="32" y2="-32" />
            <line x1="36" y1="0" x2="44" y2="0" />
            <line x1="26" y1="26" x2="32" y2="32" />
            <line x1="0" y1="36" x2="0" y2="44" />
            <line x1="-26" y1="26" x2="-32" y2="32" />
            <line x1="-36" y1="0" x2="-44" y2="0" />
            <line x1="-26" y1="-26" x2="-32" y2="-32" />
          </g>
          <ellipse cx="-8" cy="-8" rx="9" ry="5" fill="#fff" opacity="0.5" />
        </g>
      </svg>
    )
  }

  if (scene === 'rain' || scene === 'storm') {
    return (
      <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
        <defs>
          <linearGradient id="cloudBodyR" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="55%" stopColor="#E8EEF5" />
            <stop offset="100%" stopColor="#9AADC4" />
          </linearGradient>
          <linearGradient id="drop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7EC8FF" />
            <stop offset="100%" stopColor="#2F6FA8" />
          </linearGradient>
          <filter id="softR">
            <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#2a3a50" floodOpacity="0.28" />
          </filter>
        </defs>
        <g filter="url(#softR)" transform="translate(10 18)">
          <ellipse cx="55" cy="42" rx="40" ry="24" fill="url(#cloudBodyR)" />
          <circle cx="34" cy="38" r="20" fill="#F2F5FA" />
          <circle cx="58" cy="30" r="24" fill="#fff" />
          <circle cx="80" cy="40" r="17" fill="#C5D0E0" />
        </g>
        <g fill="url(#drop)">
          <path d="M36 78c0 5-5 7-5 12a5 5 0 0010 0c0-5-5-7-5-12z" />
          <path d="M56 82c0 5-5 7-5 12a5 5 0 0010 0c0-5-5-7-5-12z" opacity="0.9" />
          <path d="M76 78c0 5-5 7-5 12a5 5 0 0010 0c0-5-5-7-5-12z" />
          {scene === 'storm' && (
            <path d="M62 70 L48 92 H58 L52 108 L78 82 H66 Z" fill="#FFD056" stroke="#C46A20" strokeWidth="1" />
          )}
        </g>
      </svg>
    )
  }

  if (scene === 'fog') {
    return (
      <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
        <defs>
          <linearGradient id="fogG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F5F7FA" />
            <stop offset="100%" stopColor="#B8C0CC" />
          </linearGradient>
          <filter id="softF">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#2a3a50" floodOpacity="0.2" />
          </filter>
        </defs>
        <g filter="url(#softF)" opacity="0.85">
          <ellipse cx="60" cy="48" rx="42" ry="18" fill="url(#fogG)" />
          <ellipse cx="48" cy="62" rx="36" ry="14" fill="#E4E8EF" opacity="0.9" />
          <ellipse cx="72" cy="72" rx="30" ry="12" fill="#D0D6E0" opacity="0.85" />
        </g>
      </svg>
    )
  }

  // cloudy / partly / default
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <radialGradient id="sunCoreC" cx="35%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#FFF6C8" />
          <stop offset="45%" stopColor="#FFD056" />
          <stop offset="100%" stopColor="#F0A020" />
        </radialGradient>
        <linearGradient id="cloudBodyC" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="55%" stopColor="#F2F5FA" />
          <stop offset="100%" stopColor="#C5D0E0" />
        </linearGradient>
        <filter id="softC">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#2a3a50" floodOpacity="0.25" />
        </filter>
      </defs>
      <g opacity="0.85" transform="translate(42 38)" filter="url(#softC)">
        <circle r="18" fill="url(#sunCoreC)" />
        <g stroke="#FFC84A" strokeWidth="3" strokeLinecap="round" opacity="0.85">
          <line x1="0" y1="-28" x2="0" y2="-34" />
          <line x1="20" y1="-20" x2="24" y2="-25" />
          <line x1="28" y1="0" x2="34" y2="0" />
          <line x1="-20" y1="-20" x2="-24" y2="-25" />
        </g>
      </g>
      <g filter="url(#softC)" transform="translate(8 28)">
        <ellipse cx="58" cy="52" rx="38" ry="22" fill="url(#cloudBodyC)" />
        <circle cx="38" cy="48" r="18" fill="#E8EEF5" />
        <circle cx="58" cy="40" r="22" fill="#fff" />
        <circle cx="78" cy="48" r="16" fill="#C5D0E0" />
        <ellipse cx="48" cy="38" rx="16" ry="8" fill="#fff" opacity="0.55" />
      </g>
    </svg>
  )
}
