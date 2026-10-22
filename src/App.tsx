import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Coins, Keyboard, Play, Smartphone, Trophy } from 'lucide-react';
import { GameEngine } from './game/systems/GameEngine';
import { store } from './game/systems/SaveManager';
import { economy } from './game/systems/EconomyManager';
import { audio } from './game/systems/AudioManager';
import { formatFullMoney, getCar } from './game/data/cars';
import { RACE_MAP, raceLockReason } from './game/data/races';
import type { RaceResult, Telemetry } from './game/types';
import { Button, Panel, TopBar, useStoreRevision } from './components/Common';
import { CustomizeScreen, GarageScreen, MainMenu, ShopScreen, WorkshopScreen } from './components/MenuScreens';
import { RaceMenu, RecordsScreen, ResultOverlay } from './components/RaceScreens';
import { SettingsScreen } from './components/SettingsScreen';
import { HUD, PauseOverlay } from './components/HUD';

type Screen='start'|'menu'|'drive'|'garage'|'shop'|'workshop'|'customize'|'races'|'settings'|'records';
const initialTelemetry:Telemetry={speed:0,maxSpeed:120,rpm:0,gear:0,nitro:1,boosting:false,position:1,racers:1,raceTime:0,progress:0,checkpoint:0,checkpoints:0,countdown:0,score:0,drift:0,surface:'asphalt',state:'showcase',eventName:'',nearby:null,direction:0,nextCheckpoint:null,player:{x:0,z:0,heading:0},opponents:[],message:''};

export default function App(){
  useStoreRevision();
  const canvasRef=useRef<HTMLCanvasElement>(null),engineRef=useRef<GameEngine|null>(null);
  const [screen,setScreen]=useState<Screen>('start'),[previewId,setPreviewId]=useState(store.data.selected),[telemetry,setTelemetry]=useState<Telemetry>(initialTelemetry);
  const [paused,setPaused]=useState(false),[settingsOpen,setSettingsOpen]=useState(false),[result,setResult]=useState<RaceResult|null>(null);
  const screenRef=useRef(screen),pausedRef=useRef(paused),resultRef=useRef(result),settingsRef=useRef(settingsOpen);
  screenRef.current=screen;pausedRef.current=paused;resultRef.current=result;settingsRef.current=settingsOpen;
  const settingsKey=JSON.stringify(store.data.settings);
  // Keep the economy referenced at app level: it runs independently from every screen.
  void economy;

  const togglePause=()=>{
    if(screenRef.current!=='drive'||resultRef.current)return;
    if(settingsRef.current){setSettingsOpen(false);return;}
    const next=!pausedRef.current;setPaused(next);engineRef.current?.setPaused(next);
  };
  const pauseCallback=useRef(togglePause);pauseCallback.current=togglePause;

  useEffect(()=>{
    if(!canvasRef.current)return;
    const engine=new GameEngine(canvasRef.current,{
      onTelemetry:value=>{if(screenRef.current==='drive')setTelemetry(value);},
      onResult:value=>{setResult(value);setPaused(false);},
      onPause:()=>pauseCallback.current(),
    });engineRef.current=engine;
    return()=>{engine.dispose();engineRef.current=null;};
  },[]);
  useEffect(()=>{if(screen!=='drive')engineRef.current?.setShowcase(previewId);},[screen,previewId]);
  useEffect(()=>{engineRef.current?.applySettings();},[settingsKey]);

  const goMenu=()=>{setPaused(false);setSettingsOpen(false);setResult(null);setPreviewId(store.data.selected);setScreen('menu');};
  const playFree=()=>{setResult(null);setPaused(false);setSettingsOpen(false);setScreen('drive');engineRef.current?.startFreeDrive();};
  const startRace=(id:string)=>{
    const event=RACE_MAP[id];if(!event)return;const lock=raceLockReason(event,store.data,getCar);if(lock)return;
    setResult(null);setPaused(false);setSettingsOpen(false);setScreen('drive');engineRef.current?.startRace(id);
  };
  const navigate=(next:Screen)=>{setResult(null);setPaused(false);setSettingsOpen(false);setScreen(next);};
  const interact=(id:string)=>{if(RACE_MAP[id])startRace(id);else if(id==='garage'||id==='dealer'||id==='workshop')navigate(id==='dealer'?'shop':id);};
  const exitDrive=()=>{if(!telemetry.eventName&&telemetry.score>=50)store.saveFreeScore(telemetry.score);goMenu();};
  const resetSave=()=>{setPreviewId('sparrow-s1');setScreen('start');};

  return <main className="game-root" onPointerDown={()=>audio.unlock(store.data.settings)}>
    <canvas ref={canvasRef} className="game-canvas" aria-label="Street Rivals 3D"/>
    <div className="vignette"/>
    {screen==='start'&&<div className="screen start-screen"><TopBar minimal/><div className="start-content"><div className="sunset-label"><span/> APRESENTA <span/></div><h1><span>STREET</span><strong>RIVALS</strong></h1><div className="racing-empire">RACING EMPIRE</div><p>Seu império começa com uma chave.<br/>A cidade está esperando.</p><Button className="start-button" onClick={()=>{audio.unlock(store.data.settings);setScreen('menu');}}><Play fill="currentColor"/> ENTRAR NO IMPÉRIO <ChevronRight/></Button><div className="start-features"><span><Smartphone/> CONTROLES TOQUE</span><span><Keyboard/> TECLADO</span><span><Trophy/> RECORDES LOCAIS</span></div></div><div className="start-footer"><span>SUNSET VALLEY • 1,5 × 1,5 KM</span><span>SAVE LOCAL AUTOMÁTICO</span></div></div>}
    {screen==='menu'&&<MainMenu onPlay={playFree} onNavigate={navigate}/>} 
    {screen==='garage'&&<GarageScreen previewId={previewId} onPreview={setPreviewId} onBack={goMenu} onPlay={playFree} onShop={()=>navigate('shop')} onWorkshop={()=>navigate('workshop')} onCustomize={()=>navigate('customize')}/>} 
    {screen==='shop'&&<ShopScreen previewId={previewId} onPreview={setPreviewId} onBack={goMenu} onDrive={playFree}/>} 
    {screen==='workshop'&&<WorkshopScreen previewId={previewId} onPreview={setPreviewId} onBack={goMenu} onCustomize={()=>navigate('customize')}/>} 
    {screen==='customize'&&<CustomizeScreen previewId={previewId} onPreviewCustom={custom=>engineRef.current?.updatePreview(custom)} onBack={()=>navigate('garage')}/>} 
    {screen==='races'&&<RaceMenu onBack={goMenu} onStart={startRace}/>} 
    {screen==='settings'&&<SettingsScreen onBack={goMenu} onReset={resetSave}/>} 
    {screen==='records'&&<RecordsScreen onBack={goMenu}/>} 
    {screen==='drive'&&<HUD engine={engineRef.current!} telemetry={telemetry} onPause={togglePause} onInteract={interact} onMark={id=>engineRef.current?.markPOI(id)}/>} 
    {screen==='drive'&&paused&&!settingsOpen&&!result&&<PauseOverlay inRace={!!telemetry.eventName} onResume={togglePause} onRestart={()=>{setPaused(false);setResult(null);engineRef.current?.restartRace();}} onSettings={()=>setSettingsOpen(true)} onExit={exitDrive}/>} 
    {screen==='drive'&&settingsOpen&&<SettingsScreen overlay onBack={()=>setSettingsOpen(false)} onReset={resetSave}/>} 
    {result&&<ResultOverlay result={result} onRestart={()=>startRace(result.eventId)} onMap={playFree}/>} 
    {store.pendingOffline.amount>0&&<div className="modal-backdrop offline-backdrop"><Panel className="offline-modal"><span>BEM-VINDO DE VOLTA</span><h1>VOCÊ VOLTOU!</h1><div className="offline-coin"><Coins/></div><p>Seus carros produziram</p><h2>{formatFullMoney(store.pendingOffline.amount)}</h2><p>enquanto você estava fora.</p><small>{Math.floor(store.pendingOffline.seconds/3600)}h {Math.floor(store.pendingOffline.seconds%3600/60)}min de produção • limite de 8 horas</small><Button onClick={()=>{store.collectOffline();audio.sfx('purchase');}}>COLETAR <ChevronRight size={18}/></Button></Panel></div>}
  </main>;
    }
      
