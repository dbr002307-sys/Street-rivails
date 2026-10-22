import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { ArrowLeft, Coins, Gauge, Lock, TrendingUp, Warehouse, X } from 'lucide-react';
import { getCar, XP_FOR_LEVEL, formatMoney } from '../game/data/cars';
import type { CarSpec } from '../game/types';
import { store } from '../game/systems/SaveManager';
import { audio } from '../game/systems/AudioManager';

export function useStoreRevision(){const [,setVersion]=useState(0);useEffect(()=>store.subscribe(()=>setVersion(v=>v+1)),[]);}

export function Button({children,className='',variant='primary',onClick,...props}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:'primary'|'secondary'|'ghost'|'danger'}){
  return <button {...props} onClick={e=>{audio.sfx('click');onClick?.(e);}} className={`game-button ${variant} ${className}`}>{children}</button>;
}
export function IconButton({children,className='',label,...props}:ButtonHTMLAttributes<HTMLButtonElement>&{label:string}){
  return <button {...props} aria-label={label} title={label} className={`icon-button ${className}`}>{children}</button>;
}
export function Panel({children,className=''}:{children:ReactNode;className?:string}){return <div className={`glass-panel ${className}`}>{children}</div>;}
export function BackButton({onClick,label='VOLTAR'}:{onClick:()=>void;label?:string}){return <Button variant="ghost" onClick={onClick} className="back-button"><ArrowLeft size={18}/>{label}</Button>;}
export function CloseButton({onClick}:{onClick:()=>void}){return <IconButton label="Fechar" onClick={onClick}><X size={20}/></IconButton>;}

export function TopBar({minimal=false}:{minimal?:boolean}){
  const level=store.data.level,xpNeeded=XP_FOR_LEVEL(level);
  return <div className="top-bar">
    <div className="brand-mini"><span className="brand-slash">SR</span><div><b>STREET RIVALS</b><small>RACING EMPIRE</small></div></div>
    <div className="top-resources">
      <div className="resource money"><Coins size={16}/><span>{formatMoney(store.data.credits)}</span></div>
      {!minimal&&<><div className="resource"><TrendingUp size={15}/><span>{formatMoney(store.income)}/s</span></div><div className="resource cars-owned"><Warehouse size={15}/><span>{store.data.owned.length}/15</span></div></>}
      <div className="level-chip"><span>NÍV. {level}</span><div><i style={{width:`${Math.min(100,store.data.xp/xpNeeded*100)}%`}}/></div></div>
    </div>
  </div>;
}

export function CarGlyph({car,color,className=''}:{car:CarSpec;color?:string;className?:string}){
  const paint=color||store.data.customizations[car.id]?.color||car.color,low=['super','hyper','legend'].includes(car.body),muscle=car.body==='muscle';
  const body=car.body==='hatch'||car.body==='sport-hatch'?'M22 50 L29 32 Q34 23 47 22 L74 22 Q87 25 96 39 L112 43 Q120 45 121 55 L116 61 L25 61 Q18 58 22 50Z':low?'M16 53 L32 43 L52 38 L69 26 Q82 25 95 40 L116 45 Q124 48 123 56 L116 60 L21 60 Q14 58 16 53Z':muscle?'M17 51 L27 39 L43 36 L52 25 L81 25 L93 37 L116 42 Q122 45 122 55 L116 61 L20 61 Q14 57 17 51Z':'M18 52 L29 39 L47 35 L57 25 L81 26 L95 39 L116 44 Q122 47 121 56 L115 61 L21 61 Q15 58 18 52Z';
  return <svg viewBox="0 0 140 76" className={`car-glyph ${className}`} aria-label={car.name} role="img">
    <ellipse cx="70" cy="65" rx="55" ry="5" fill="rgba(0,0,0,.35)"/>
    {low&&<path d="M89 30 L104 27 L105 31 L93 35Z" fill={car.accent}/>}<path d={body} fill={paint} stroke="rgba(255,255,255,.22)" strokeWidth="1"/>
    <path d={low?'M53 38 L70 28 Q81 27 91 39Z':'M48 35 L58 27 L79 28 L89 37Z'} fill="#172c3a" opacity=".9"/>
    <path d="M25 49 L45 45 L94 43 L116 48" fill="none" stroke={car.accent} strokeWidth="2" opacity=".8"/>
    <path d="M18 53 L33 53" stroke="#fff4cf" strokeWidth="3"/><path d="M112 51 L122 52" stroke="#ff4b4b" strokeWidth="2"/>
    {[38,103].map(x=><g key={x}><circle cx={x} cy="59" r="10" fill="#101216"/><circle cx={x} cy="59" r="5.5" fill="#7d8790"/><circle cx={x} cy="59" r="2" fill="#1d2329"/></g>)}
  </svg>;
}

export function StatBar({label,value,max,display}:{label:string;value:number;max:number;display?:string}){
  return <div className="stat-bar"><div><span>{label}</span><b>{display??Math.round(value)}</b></div><div className="bar-track"><i style={{width:`${Math.min(100,Math.max(2,value/max*100))}%`}}/></div></div>;
}
export function Locked({children}:{children:ReactNode}){return <span className="locked-label"><Lock size={13}/>{children}</span>;}
export function SectionTitle({eyebrow,title,description}:{eyebrow:string;title:string;description?:string}){
  return <div className="section-title"><span>{eyebrow}</span><h1>{title}</h1>{description&&<p>{description}</p>}</div>;
}
export function CarQuickStats({car}:{car:CarSpec}){
  return <div className="quick-stats"><span><Gauge size={14}/>{car.maxSpeed} km/h</span><span>0–100 <b>{car.zeroToHundred}s</b></span><span><Coins size={14}/>{formatMoney(car.income)}/s</span></div>;
}
export const formatTime=(seconds:number)=>{const min=Math.floor(seconds/60),sec=Math.floor(seconds%60),ms=Math.floor((seconds%1)*1000);return`${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}.${String(ms).padStart(3,'0')}`;};
export function CategoryBadge({car}:{car:CarSpec}){return <span className={`category-badge category-${car.category.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}`}>{car.category}</span>;}
export function ActiveCarName(){return <>{getCar(store.data.selected).name}</>;}
