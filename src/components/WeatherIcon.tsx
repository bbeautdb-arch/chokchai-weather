import { useId } from 'react'
import type { SceneKey } from '../lib/weather'

interface IconProps {
  scene: SceneKey
  night?: boolean
  className?: string
}

export function WeatherIcon({ scene, night = false, className = '' }: IconProps) {
  const uid = useId().replace(/:/g, '')
  if (scene === 'sunny') {
    return night ? <MoonIcon uid={uid} className={className} /> : <SunIcon uid={uid} className={className} />
  }
  if (scene === 'rain' || scene === 'storm') {
    return <RainIcon uid={uid} storm={scene === 'storm'} night={night} className={className} />
  }
  if (scene === 'fog') {
    return <FogIcon uid={uid} night={night} className={className} />
  }
  if (scene === 'cloudy') {
    return <CloudIcon uid={uid} night={night} className={className} />
  }
  return night ? (
    <PartlyNightIcon uid={uid} className={className} />
  ) : (
    <PartlyDayIcon uid={uid} className={className} />
  )
}

export function BrandMark({ scene, night }: { scene: SceneKey; night: boolean }) {
  return (
    <span
      className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[14px] shadow-[0_8px_16px_rgba(20,40,60,0.28)]"
      style={{
        background: night ? '#1c1917' : '#f4efe6',
        color: night ? '#f6f1e7' : '#1c1917',
      }}
      aria-hidden="true"
    >
      <WeatherIcon scene={scene} night={night} className="mono-wx h-10 w-10" />
    </span>
  )
}

function SunIcon({ uid, className }: { uid: string; className: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <radialGradient id={`${uid}-sun`} cx="42%" cy="38%" r="60%">
          <stop offset="0%" stopColor="#FFF8DC" />
          <stop offset="50%" stopColor="#FFD056" />
          <stop offset="100%" stopColor="#F0A020" />
        </radialGradient>
      </defs>
      <g transform="translate(60 60)">
        <g stroke="#FFC84A" strokeWidth="4" strokeLinecap="round">
          <line x1="0" y1="-38" x2="0" y2="-48" />
          <line x1="27" y1="-27" x2="34" y2="-34" />
          <line x1="38" y1="0" x2="48" y2="0" />
          <line x1="27" y1="27" x2="34" y2="34" />
          <line x1="0" y1="38" x2="0" y2="48" />
          <line x1="-27" y1="27" x2="-34" y2="34" />
          <line x1="-38" y1="0" x2="-48" y2="0" />
          <line x1="-27" y1="-27" x2="-34" y2="-34" />
        </g>
        <circle r="26" fill={`url(#${uid}-sun)`} />
        <ellipse cx="-8" cy="-8" rx="8" ry="5" fill="#fff" opacity="0.55" />
      </g>
    </svg>
  )
}

function MoonIcon({ uid, className }: { uid: string; className: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <radialGradient id={`${uid}-moon`} cx="35%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#FFF8E4" />
          <stop offset="55%" stopColor="#F3E2B0" />
          <stop offset="100%" stopColor="#E0C27A" />
        </radialGradient>
      </defs>
      <g fill="#F7E7A8">
        <circle cx="28" cy="30" r="1.6" />
        <circle cx="92" cy="26" r="1.4" />
        <circle cx="98" cy="58" r="1.2" />
        <circle cx="24" cy="78" r="1.3" />
      </g>
      <path
        d="M78 28a28 28 0 1 0 14 48 22 22 0 1 1-14-48z"
        fill={`url(#${uid}-moon)`}
      />
    </svg>
  )
}

function CloudShape({ uid, cx, cy }: { uid: string; cx: number; cy: number }) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <ellipse cx="0" cy="8" rx="36" ry="20" fill={`url(#${uid}-cloud)`} />
      <circle cx="-18" cy="4" r="16" fill="#F4F7FB" />
      <circle cx="2" cy="-4" r="20" fill="#fff" />
      <circle cx="22" cy="4" r="14" fill="#D5DEE8" />
    </g>
  )
}

function CloudIcon({ uid, night, className }: { uid: string; night: boolean; className: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-cloud`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#C5D0E0" />
        </linearGradient>
      </defs>
      {night && <circle cx="78" cy="36" r="10" fill="#F3E2B0" />}
      <CloudShape uid={uid} cx={60} cy={58} />
    </svg>
  )
}

function PartlyDayIcon({ uid, className }: { uid: string; className: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <radialGradient id={`${uid}-sun`} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FFF6C8" />
          <stop offset="100%" stopColor="#F0A020" />
        </radialGradient>
        <linearGradient id={`${uid}-cloud`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#C5D0E0" />
        </linearGradient>
      </defs>
      <g transform="translate(78 40)">
        <g stroke="#FFC84A" strokeWidth="3" strokeLinecap="round">
          <line x1="0" y1="-22" x2="0" y2="-28" />
          <line x1="16" y1="-16" x2="20" y2="-20" />
          <line x1="22" y1="0" x2="28" y2="0" />
          <line x1="-16" y1="-16" x2="-20" y2="-20" />
        </g>
        <circle r="14" fill={`url(#${uid}-sun)`} />
      </g>
      <CloudShape uid={uid} cx={52} cy={68} />
    </svg>
  )
}

function PartlyNightIcon({ uid, className }: { uid: string; className: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-cloud`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#C5D0E0" />
        </linearGradient>
      </defs>
      <path d="M86 24a16 16 0 1 0 8 28 13 13 0 1 1-8-28z" fill="#F3E2B0" />
      <CloudShape uid={uid} cx={52} cy={70} />
    </svg>
  )
}

function RainIcon({
  uid,
  storm,
  night,
  className,
}: {
  uid: string
  storm: boolean
  night: boolean
  className: string
}) {
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-cloud`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#9AADC4" />
        </linearGradient>
        <linearGradient id={`${uid}-drop`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7EC8FF" />
          <stop offset="100%" stopColor="#2F6FA8" />
        </linearGradient>
      </defs>
      {night && <path d="M92 18a12 12 0 1 0 6 21 10 10 0 1 1-6-21z" fill="#F3E2B0" />}
      <CloudShape uid={uid} cx={58} cy={48} />
      <g fill={`url(#${uid}-drop)`}>
        <path d="M38 78c0 4-4 6-4 10a4 4 0 008 0c0-4-4-6-4-10z" />
        <path d="M58 84c0 4-4 6-4 10a4 4 0 008 0c0-4-4-6-4-10z" />
        <path d="M78 78c0 4-4 6-4 10a4 4 0 008 0c0-4-4-6-4-10z" />
      </g>
      {storm && (
        <path d="M64 70 L50 90 H60 L54 106 L80 82 H68 Z" fill="#FFD056" stroke="#C46A20" strokeWidth="1" />
      )}
    </svg>
  )
}

function FogIcon({ uid, night, className }: { uid: string; night: boolean; className: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-fog`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F7F8FA" />
          <stop offset="100%" stopColor="#B8C0CC" />
        </linearGradient>
      </defs>
      {night && <path d="M90 22a11 11 0 1 0 6 19 9 9 0 1 1-6-19z" fill="#F3E2B0" />}
      <g opacity="0.92">
        <ellipse cx="58" cy="46" rx="40" ry="16" fill={`url(#${uid}-fog)`} />
        <ellipse cx="48" cy="64" rx="34" ry="12" fill="#E4E8EF" />
        <ellipse cx="70" cy="78" rx="28" ry="10" fill="#D0D6E0" />
      </g>
    </svg>
  )
}
