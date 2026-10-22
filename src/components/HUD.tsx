import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Camera, ChevronUp, Flag, Hand, MapPin, Navigation, Pause, Play, RotateCcw, SlidersHorizontal, Zap } from 'lucide-react';
import { formatMoney, getCar } from '../game/data/cars';
import { MAP_ROADS } from '../game/world/World';
import { POIS, RACE_MAP, raceLockReason } from '../game/data/races';
import type { Telemetry } from '../game/types';
import type { GameEngine } from '../game/systems/GameEngine';
import { store } from '../game/systems/SaveManager';
import { Button, IconButton, Panel, formatTime } from './Common';

function MiniMap({telemetry,onMark}:{telemetry:Telemetry;onMark:(id:string)=>void}){
  const map=(x:number,z:number)=>({x:(x+750)/1500*120,y:120-(z+750)/1500*120});
  const player=map(telemetry.player.x,telemetry.player.z);
  return <div className="minimap"><svg viewBox="0 0 120 120" role="img" aria-label="Minimapa de Sunset Valley">
    <rect width="120" height="120" rx="12" fill="rgba(10,16,22,.84)"/>{MAP_ROADS.map((r,i)=>{const p=map(r.x,r.z);return <rect key={i} x={p.x-r.w/1500*120/2} y={p.y-r.d/1500*120/2} width={Math.max(1,r.w/1500*120)} height={Math.max(1,r.d/1500*120)} fill="#56616a" opacity=".72"/>;})}
    {telemetry.eventName&&RACE_MAP[Object.keys(RACE_MAP).find(id=>RACE_MAP[id].name===telemetry.eventName)??'rookie-rush']?.path.map((point,i,path)=>{if(i===0)return null;const a=map(path[i-1].x,path[i-1].z),b=map(point.x,point.z);return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#f3bd4c" strokeWidth="1.6"/>;})}
    {POIS.map(poi=>{const p=map(poi.x,poi.z),active=telemetry.nearby===poi.id||telemetry.nearby===poi.eventId;return <g key={poi.id} transform={`translate(${p.x} ${p.y})`} onPointerDown={e=>{e.stopPropagation();onMark(poi.eventId??poi.id);}} className="map-poi"><circle r="7" fill="transparent"/><circle r={active?4:2.8} fill={poi.kind==='race'?'#f06449':poi.kind==='shop'?'#f3bd4c':poi.kind==='workshop'?'#51c9ee':'#6ee7b7'} stroke="#101820" strokeWidth=".8"/><text y="1.6" textAnchor="middle" fontSize="3.2" fill="#0d151d" fontWeight="900">{poi.kind==='race'?'R':poi.kind==='shop'?'$':poi.kind==='workshop'?'W':'G'}</text></g>;})}
    {telemetry.opponents.map((opponent,i)=>{const p=map(opponent.x,opponent.z);return <circle key={i} cx={p.x} cy={p.y} r="1.8" fill={opponent.color} stroke="#fff" strokeWidth=".4"/>;})}
    <g transform={`translate(${player.x} ${player.y}) rotate(${telemetry.player.heading*180/Math.PI})`}><path d="M0 -5 L3.8 4 L0 2.4 L-3.8 4Z" fill="#fff" stroke="#f3bd4c" strokeWidth="1"/></g>
  </svg><div className="map-caption"><Navigation size={12} style={{transform:`rotate(${telemetry.direction}rad)`}}/><span>{telemetry.nextCheckpoint?'SIGA A ROTA':'TOQUE NUM ÍCONE'}</span></div></div>;
}

type Control='left'|'right'|'throttle'|'brake'|'nitro'|'handbrake';
function HoldButton({engine,control,children,className='',label}:{engine:GameEngine;control:Control;children:ReactNode;className?:string;label:string}){
  const release=(e:ReactPointerEvent<HTMLButtonElement>)=>{e.preventDefault();engine.input.set(control,false);};
  return <button aria-label={label} className={`drive-button ${className}`} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);engine.input.set(control,true);}} onPointerUp={release} onPointerCancel={release} onContextMenu={e=>e.preventDefault()}>{children}</button>;
}
function WheelControl({engine}:{engine:GameEngine}){
  const [value,setValue]=useState(0),dragging=useRef(false),ref=useRef<HTMLDivElement>(null);
  const update=(e:ReactPointerEvent<HTMLDivElement>)=>{if(!ref.current)return;const rect=ref.current.getBoundingClientRect(),next=Math.max(-1,Math.min(1,(e.clientX-(rect.left+rect.width/2))/(rect.width*.36)));setValue(next);engine.input.setWheel(next);};
  const release=()=>{dragging.current=false;setValue(0);engine.input.setWheel(0);};
  return <div ref={ref} className="wheel-control" onPointerDown={e=>{dragging.current=true;e.currentTarget.setPointerCapture(e.pointerId);update(e);}} onPointerMove={e=>{if(dragging.current)update(e);}} onPointerUp={release} onPointerCancel={release}><div className="wheel-ring" style={{transform:`rotate(${value*115}deg)`}}><i/><i/><i/><span/></div><small>VOLANTE</small></div>;
}
function Speedometer({telemetry}:{telemetry:Telemetry}){
  const ratio=Math.min(1,telemetry.speed/Math.max(1,telemetry.maxSpeed)),gear=telemetry.gear<0?'R':telemetry.gear===0?'N':telemetry.gear;
  return <div className="speedometer"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="48" className="speed-bg" strokeDasharray="225 400" transform="rotate(135 60 60)"/><circle cx="60" cy="60" r="48" className="speed-value" strokeDasharray={`${ratio*225} 400`} transform="rotate(135 60 60)"/></svg><div className="speed-readout"><b>{Math.round(telemetry.speed)}</b><span>KM/H</span><small>MÁX {Math.round(telemetry.maxSpeed)}</small></div><div className="gear"><small>MARCHA</small><b>{gear}</b></div><div className="rpm"><i style={{width:`${telemetry.rpm*100}%`}}/></div><div className="nitro-meter"><Zap size={13}/><div><i style={{width:`${telemetry.nitro*100}%`}}/></div><span>NITRO</span></div></div>;
}

interface HudProps{engine:GameEngine;telemetry:Telemetry;onPause:()=>void;onInteract:(id:string)=>void;onMark:(id:string)=>void}
export function HUD({engine,telemetry,onPause,onInteract,onMark}:HudProps){
  const settings=store.data.settings,nearby=POIS.find(p=>p.id===telemetry.nearby||p.eventId===telemetry.nearby),race=nearby?.eventId?RACE_MAP[nearby.eventId]:null,lock=race?raceLockReason(race,store.data,getCar):null;
  return <div className={`hud ${telemetry.boosting?'boosting':''}`} style={{'--control-scale':settings.controlSize,'--control-opacity':settings.controlOpacity} as React.CSSProperties}>
    {telemetry.boosting&&<div className="speed-lines"/>}<div className="hud-top-left"><MiniMap telemetry={telemetry} onMark={onMark}/></div>
    <div className="race-hud">{telemetry.eventName?<><div className="position-display"><b>{telemetry.position}</b><span>/{telemetry.racers}</span><small>POSIÇÃO</small></div><div className="race-info"><b>{telemetry.eventName}</b><span>{formatTime(telemetry.raceTime)} • CP {telemetry.checkpoint}/{telemetry.checkpoints}</span><div><i style={{width:`${telemetry.progress*100}%`}}/></div></div></>:<div className="free-mode-label"><span>EXPLORAÇÃO LIVRE</span><b>{telemetry.surface==='asphalt'?'ASFALTO':telemetry.surface==='grass'?'GRAMA • ADERÊNCIA REDUZIDA':'TERRA • POEIRA'}</b></div>}<div className="score-display"><small>SCORE</small><b>{telemetry.score.toLocaleString('pt-BR')}</b></div></div>
    <div className="hud-top-right"><div className="hud-money"><span>{formatMoney(store.data.credits)}</span><small>+{formatMoney(store.income)}/s</small></div><IconButton label="Trocar câmera" onClick={()=>engine.cycleCamera()}><Camera/></IconButton>{telemetry.eventName&&<IconButton label="Reiniciar corrida" onClick={()=>engine.restartRace()}><RotateCcw/></IconButton>}<IconButton label="Pausar" onClick={onPause}><Pause/></IconButton></div>
    {telemetry.message&&<div className="drive-message">{telemetry.message}</div>}
    {telemetry.state==='countdown'&&<div className="countdown"><span>PREPARAR</span><b>{Math.max(1,Math.min(3,Math.ceil(telemetry.countdown)))}</b></div>}
    {telemetry.drift>0&&<div className="drift-callout">DRIFT <b>+{Math.round(telemetry.drift*5)}</b></div>}
    {!telemetry.eventName&&nearby&&['race','garage','shop','workshop'].includes(nearby.kind)&&<div className="interaction-prompt"><MapPin size={18}/><div><small>PONTO DE INTERESSE</small><b>{nearby.name}</b></div><Button disabled={!!lock} onClick={()=>onInteract(nearby.eventId??nearby.id)}>{lock??(nearby.kind==='race'?'INICIAR':'ENTRAR')}</Button></div>}
    <Speedometer telemetry={telemetry}/>
    <div className="steering-controls">{settings.steeringMode==='wheel'?<WheelControl engine={engine}/>:<><HoldButton engine={engine} control="left" label="Virar à esquerda" className="steer"><ArrowLeft/></HoldButton><HoldButton engine={engine} control="right" label="Virar à direita" className="steer"><ArrowRight/></HoldButton></>}<HoldButton engine={engine} control="handbrake" label="Freio de mão e drift" className="handbrake"><Hand/><span>DRIFT</span></HoldButton></div>
    <div className="pedal-controls"><HoldButton engine={engine} control="nitro" label="Ativar nitro" className="nitro-button"><Zap fill="currentColor"/><i style={{height:`${telemetry.nitro*100}%`}}/></HoldButton><HoldButton engine={engine} control="brake" label="Frear e marcha à ré" className="brake-button"><span>FREIO</span></HoldButton><HoldButton engine={engine} control="throttle" label="Acelerar" className="throttle-button"><ChevronUp/><span>ACELERAR</span></HoldButton></div>
    <div className="keyboard-hint">WASD / SETAS • SHIFT NITRO • ESPAÇO DRIFT • C CÂMERA</div>
  </div>;
}

export function PauseOverlay({onResume,onRestart,onSettings,onExit,inRace}:{onResume:()=>void;onRestart:()=>void;onSettings:()=>void;onExit:()=>void;inRace:boolean}){
  return <div className="modal-backdrop pause-backdrop"><Panel className="pause-modal"><span>JOGO PAUSADO</span><h1>PIT STOP</h1><p>A renda da sua frota continua ativa.</p><Button onClick={onResume}><Play size={18}/> CONTINUAR</Button>{inRace&&<Button variant="secondary" onClick={onRestart}><RotateCcw size={17}/> REINICIAR CORRIDA</Button>}<Button variant="secondary" onClick={onSettings}><SlidersHorizontal size={17}/> CONFIGURAÇÕES</Button><Button variant="ghost" onClick={onExit}><Flag size={17}/> SAIR PARA O MENU</Button><small>ESC para continuar</small></Panel></div>;
}
