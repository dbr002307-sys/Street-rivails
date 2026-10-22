import { useState } from 'react';
import { Car, Check, ChevronRight, Clock3, Flag, Lock, Map, RotateCcw, Trophy, Users, Zap } from 'lucide-react';
import { formatMoney, getCar } from '../game/data/cars';
import { RACES, RIVALS, raceLockReason } from '../game/data/races';
import type { RaceResult, RaceType } from '../game/types';
import { store } from '../game/systems/SaveManager';
import { BackButton, Button, CarGlyph, Panel, SectionTitle, TopBar, formatTime } from './Common';

const filters:('Todos'|RaceType)[]=['Todos','Rua','Arrancada','Circuito','Alta velocidade','Lendário'];
export function RaceMenu({onBack,onStart}:{onBack:()=>void;onStart:(id:string)=>void}){
  const [filter,setFilter]=useState<(typeof filters)[number]>('Todos');
  const races=RACES.filter(r=>filter==='Todos'||r.type===filter);
  return <div className="screen race-menu-screen"><TopBar/><div className="screen-heading"><BackButton onClick={onBack}/><SectionTitle eyebrow="SUNSET VALLEY RACING LEAGUE" title="CORRIDAS E RIVAIS" description="Checkpoints obrigatórios. Recompensas por colocação. Rivais com linhas de pilotagem próprias."/></div>
    <div className="category-tabs race-filters">{filters.map(item=><button key={item} className={filter===item?'active':''} onClick={()=>setFilter(item)}>{item}</button>)}</div>
    <div className="race-grid">{races.map(event=>{
      const rival=RIVALS.find(r=>r.id===event.rivalId),lock=raceLockReason(event,store.data,getCar),wins=store.data.wins[event.id]??0;
      return <Panel key={event.id} className={`race-card ${lock?'locked':''}`}>
        <div className="race-card-top"><span className="race-type">{event.type}</span><span className="difficulty">DIFICULDADE <b>{event.difficulty}/10</b></span></div><h2>{event.name}</h2><p>{event.description}</p>
        <div className="race-meta"><span><Flag size={14}/>{event.laps} {event.laps===1?'VOLTA':'VOLTAS'}</span><span><Users size={14}/>{event.opponents+1} CARROS</span>{event.targetSpeed&&<span><Zap size={14}/>META {event.targetSpeed} KM/H</span>}</div>
        {rival&&<div className="rival-strip"><CarGlyph car={getCar(rival.carId)} color={rival.color}/><div><small>RIVAL • {rival.title}</small><b>{rival.name}</b><q>“{rival.quote}”</q></div></div>}
        <div className="race-reward"><div><small>PRÊMIO DE VITÓRIA</small><strong>{formatMoney(event.reward)}</strong><span>+{event.xp} XP</span></div>{wins>0?<span className="won-tag"><Check size={14}/> {wins} {wins===1?'VITÓRIA':'VITÓRIAS'}</span>:<span className="won-tag">INÉDITO</span>}</div>
        {lock?<Button variant="secondary" disabled><Lock size={16}/>{lock}</Button>:<Button onClick={()=>onStart(event.id)}>CORRER AGORA <ChevronRight size={17}/></Button>}
      </Panel>;})}</div>
  </div>;
}

export function ResultOverlay({result,onRestart,onMap}:{result:RaceResult;onRestart:()=>void;onMap:()=>void}){
  return <div className="modal-backdrop result-backdrop"><Panel className={`result-modal ${result.won?'victory':''}`}><div className="result-kicker">{result.won?'BANDEIRADA • VITÓRIA':'FIM DE CORRIDA'}</div>{result.won?<Trophy className="result-trophy"/>:<Flag className="result-trophy"/>}<h1>{result.won?'VOCÊ DOMINOU':'PROVA CONCLUÍDA'}</h1><div className="result-position">{result.position}<sup>º</sup><span>/ {result.racers}</span></div><h2>{result.eventName}</h2>
    <div className="result-stats"><div><Clock3/><small>TEMPO</small><b>{formatTime(result.time)}</b></div><div><Trophy/><small>RECOMPENSA</small><b>{formatMoney(result.reward)}</b></div><div><Zap/><small>EXPERIÊNCIA</small><b>+{result.xp} XP</b></div></div>
    <div className="result-score"><span>PONTUAÇÃO</span><b>{result.score.toLocaleString('pt-BR')}</b>{result.newBest&&<strong>NOVO RECORDE LOCAL</strong>}</div>
    <div className="button-row"><Button variant="secondary" onClick={onMap}><Map size={17}/> VOLTAR AO MAPA</Button><Button onClick={onRestart}><RotateCcw size={17}/> CORRER NOVAMENTE</Button></div>
  </Panel></div>;
}

export function RecordsScreen({onBack}:{onBack:()=>void}){
  return <div className="screen records-screen"><TopBar/><div className="screen-heading"><BackButton onClick={onBack}/><SectionTitle eyebrow="DADOS DESTE DISPOSITIVO" title="RECORDES LOCAIS" description="As dez melhores pontuações ficam salvas no navegador."/></div><div className="records-layout"><Panel className="records-table"><div className="record-header"><span>#</span><span>EVENTO</span><span>POSIÇÃO</span><span>PONTOS</span><span>DATA</span></div>{store.data.highScores.length===0?<div className="empty-records"><Trophy/><h3>SUA PRIMEIRA MARCA ESPERA POR VOCÊ</h3><p>Complete uma corrida ou some pontos na exploração livre.</p></div>:store.data.highScores.map((score,index)=><div className="record-row" key={`${score.date}-${index}`}><b>{String(index+1).padStart(2,'0')}</b><strong>{score.event}</strong><span>{score.position}º</span><b>{score.score.toLocaleString('pt-BR')}</b><small>{score.date}</small></div>)}</Panel>
      <Panel className="driver-profile"><span>PERFIL DO PILOTO</span><h2>NÍVEL {store.data.level}</h2><div><Car/><b>{store.data.owned.length}</b><small>carros na coleção</small></div><div><Flag/><b>{store.data.racesCompleted}</b><small>corridas completas</small></div><div><Trophy/><b>{Object.values(store.data.wins).reduce((a,b)=>a+b,0)}</b><small>vitórias</small></div><div><Zap/><b>{Math.round(store.data.bestSpeed)} km/h</b><small>velocidade recorde</small></div><p>{(store.data.totalDistance/1000).toFixed(1)} km percorridos em Sunset Valley</p></Panel></div>
  </div>;
}
