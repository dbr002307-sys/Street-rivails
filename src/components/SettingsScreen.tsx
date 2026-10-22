import { useState } from 'react';
import { CloudRain, Expand, Gamepad2, Moon, Music, RotateCcw, Smartphone, Sun, Sunset, Volume2, Vibrate } from 'lucide-react';
import type { GameSettings } from '../game/types';
import { store } from '../game/systems/SaveManager';
import { BackButton, Button, Panel, SectionTitle, TopBar } from './Common';

function Toggle({label,description,value,onChange}:{label:string;description:string;value:boolean;onChange:(value:boolean)=>void}){
  return <label className="setting-toggle"><div><b>{label}</b><small>{description}</small></div><input type="checkbox" checked={value} onChange={e=>onChange(e.target.checked)}/><i><span/></i></label>;
}
function Slider({label,value,min,max,step,display,onChange}:{label:string;value:number;min:number;max:number;step:number;display:string;onChange:(value:number)=>void}){
  return <label className="setting-slider"><div><b>{label}</b><span>{display}</span></div><input type="range" value={value} min={min} max={max} step={step} onChange={e=>onChange(Number(e.target.value))}/></label>;
}
export function SettingsScreen({onBack,onReset,overlay=false}:{onBack:()=>void;onReset:()=>void;overlay?:boolean}){
  const s=store.data.settings,[confirmReset,setConfirmReset]=useState(false);
  const update=(patch:Partial<GameSettings>)=>store.updateSettings(patch);
  const fullscreen=()=>{if(document.fullscreenElement)void document.exitFullscreen();else void document.documentElement.requestFullscreen?.().catch(()=>{});};
  return <div className={`screen settings-screen ${overlay?'overlay-screen':''}`}><TopBar minimal/><div className="screen-heading"><BackButton onClick={onBack}/><SectionTitle eyebrow="PREFERÊNCIAS SALVAS AUTOMATICAMENTE" title="CONFIGURAÇÕES" description="Ajustes otimizados para telas pequenas, desktops e diferentes aparelhos."/></div>
    <div className="settings-grid">
      <Panel><h2><Gamepad2/> CONTROLES</h2><div className="option-row"><button className={s.steeringMode==='buttons'?'selected':''} onClick={()=>update({steeringMode:'buttons'})}>BOTÕES DE SETA</button><button className={s.steeringMode==='wheel'?'selected':''} onClick={()=>update({steeringMode:'wheel'})}>VOLANTE VIRTUAL</button></div>
        <Slider label="Tamanho dos botões" value={s.controlSize} min={.75} max={1.35} step={.05} display={`${Math.round(s.controlSize*100)}%`} onChange={controlSize=>update({controlSize})}/><Slider label="Opacidade dos controles" value={s.controlOpacity} min={.3} max={1} step={.05} display={`${Math.round(s.controlOpacity*100)}%`} onChange={controlOpacity=>update({controlOpacity})}/><Slider label="Sensibilidade da direção" value={s.sensitivity} min={.55} max={1.6} step={.05} display={`${s.sensitivity.toFixed(2)}×`} onChange={sensitivity=>update({sensitivity})}/>
        <Toggle label="Aceleração automática" description="O carro acelera quando o freio não está pressionado." value={s.autoAccelerate} onChange={autoAccelerate=>update({autoAccelerate})}/><Toggle label="Vibração" description="Resposta háptica em nitro e colisões, quando suportada." value={s.vibration} onChange={vibration=>update({vibration})}/>
      </Panel>
      <Panel><h2><Smartphone/> VÍDEO E CÂMERA</h2><label className="select-setting"><b>Câmera preferida</b><select value={s.camera} onChange={e=>update({camera:e.target.value as GameSettings['camera']})}><option value="near">Próxima • 6 m</option><option value="far">Distante • 9 m</option><option value="hood">Capô</option></select></label><label className="select-setting"><b>Qualidade gráfica</b><select value={s.quality} onChange={e=>update({quality:e.target.value as GameSettings['quality']})}><option value="low">Baixa • mais desempenho</option><option value="medium">Média • equilibrada</option><option value="high">Alta • sombras e resolução</option></select></label>
        <Slider label="Distância de renderização" value={s.renderDistance} min={300} max={1000} step={50} display={`${s.renderDistance} m`} onChange={renderDistance=>update({renderDistance})}/><Button variant="secondary" onClick={fullscreen}><Expand size={16}/> ALTERNAR TELA CHEIA</Button>
      </Panel>
      <Panel><h2><Sunset/> AMBIENTE</h2><div className="option-row environment-options"><button className={s.timeOfDay==='day'?'selected':''} onClick={()=>update({timeOfDay:'day'})}><Sun/> DIA</button><button className={s.timeOfDay==='sunset'?'selected':''} onClick={()=>update({timeOfDay:'sunset'})}><Sunset/> PÔR DO SOL</button><button className={s.timeOfDay==='night'?'selected':''} onClick={()=>update({timeOfDay:'night'})}><Moon/> NOITE</button></div><Toggle label="Chuva simplificada" description="Chuva visível e aderência reduzida no asfalto." value={s.weather==='rain'} onChange={rain=>update({weather:rain?'rain':'clear'})}/>{s.weather==='rain'&&<div className="weather-note"><CloudRain/> Pista molhada: aderência dos pneus reduzida em 14%.</div>}
      </Panel>
      <Panel><h2><Volume2/> ÁUDIO</h2><Slider label="Música ambiente" value={s.musicVolume} min={0} max={1} step={.05} display={`${Math.round(s.musicVolume*100)}%`} onChange={musicVolume=>update({musicVolume})}/><Slider label="Efeitos" value={s.effectsVolume} min={0} max={1} step={.05} display={`${Math.round(s.effectsVolume*100)}%`} onChange={effectsVolume=>update({effectsVolume})}/><Slider label="Motores" value={s.engineVolume} min={0} max={1} step={.05} display={`${Math.round(s.engineVolume*100)}%`} onChange={engineVolume=>update({engineVolume})}/><div className="audio-note"><Music/> Áudio sintetizado localmente: motor varia com velocidade e aceleração, sem downloads.</div>
      </Panel>
      <Panel className="save-panel"><h2><Vibrate/> DADOS E DISPOSITIVO</h2><p>O progresso é salvo automaticamente neste navegador. A renda offline é limitada a 8 horas.</p><Button variant="danger" onClick={()=>{if(confirmReset){store.reset();setConfirmReset(false);onReset();}else{setConfirmReset(true);setTimeout(()=>setConfirmReset(false),4000);}}}><RotateCcw size={16}/>{confirmReset?'TOQUE NOVAMENTE PARA APAGAR':'APAGAR PROGRESSO'}</Button>
      </Panel>
    </div>
  </div>;
}
