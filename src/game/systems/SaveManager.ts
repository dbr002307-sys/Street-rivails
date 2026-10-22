import { CAR_MAP, CARS, UPGRADES, XP_FOR_LEVEL, getCar, getCustomization, totalIncome, upgradeCost } from '../data/cars';
import type { Customization, GameSettings, HighScore, SaveData, UpgradeKey } from '../types';

const KEY = 'street-rivals-racing-empire-v3';
const MAX_MONEY = 1e15;
export const DEFAULT_SETTINGS: GameSettings = {
  camera:'near', controlSize:1, controlOpacity:.72, steeringMode:'buttons', sensitivity:1,
  vibration:true, autoAccelerate:false, quality:'medium', renderDistance:650,
  musicVolume:.25, effectsVolume:.65, engineVolume:.55, timeOfDay:'sunset', weather:'clear',
};
const freshSave = ():SaveData => ({
  version:3, credits:0, owned:['sparrow-s1'], selected:'sparrow-s1', upgrades:{}, customizations:{},
  level:1, xp:0, wins:{}, racesCompleted:0, discovered:[], highScores:[], lastSession:Date.now(),
  incomeSnapshot:5, settings:{...DEFAULT_SETTINGS}, totalDistance:0, bestSpeed:0,
});
const finite = (value:unknown, fallback=0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const clamp = (n:number, a:number, b:number) => Math.min(b, Math.max(a,n));

export class SaveManager {
  data:SaveData;
  pendingOffline = { amount:0, seconds:0 };
  sessionEarned = 0;
  private listeners = new Set<() => void>();
  private hadSave = false;

  constructor() {
    this.hadSave = !!this.safeRead();
    this.data = this.load();
    if (this.hadSave) this.calculateOffline();
  }

  private safeRead():string | null {
    try { return localStorage.getItem(KEY); } catch { return null; }
  }

  private load():SaveData {
    const raw = this.safeRead();
    if (!raw) return freshSave();
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return freshSave();
      const base = freshSave();
      const owned = Array.isArray(parsed.owned) ? [...new Set(parsed.owned.filter((id:unknown) => typeof id === 'string' && !!CAR_MAP[id as string]))] as string[] : ['sparrow-s1'];
      if (!owned.includes('sparrow-s1')) owned.unshift('sparrow-s1');
      const upgrades:SaveData['upgrades'] = {};
      if (parsed.upgrades && typeof parsed.upgrades === 'object') {
        for (const id of owned) {
          const source = parsed.upgrades[id];
          if (!source || typeof source !== 'object') continue;
          upgrades[id] = {};
          for (const def of UPGRADES) upgrades[id]![def.key] = Math.floor(clamp(finite(source[def.key]),0,10));
        }
      }
      const customizations:Record<string,Customization> = {};
      for (const id of owned) customizations[id] = getCustomization(id, parsed.customizations?.[id]);
      const settings = { ...DEFAULT_SETTINGS, ...(parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {}) };
      settings.controlSize = clamp(finite(settings.controlSize,1),.75,1.35);
      settings.controlOpacity = clamp(finite(settings.controlOpacity,.72),.3,1);
      settings.sensitivity = clamp(finite(settings.sensitivity,1),.55,1.6);
      settings.renderDistance = clamp(finite(settings.renderDistance,650),300,1000);
      for (const key of ['musicVolume','effectsVolume','engineVolume'] as const) settings[key] = clamp(finite(settings[key]),0,1);
      if (!['near','far','hood'].includes(settings.camera)) settings.camera = 'near';
      if (!['low','medium','high'].includes(settings.quality)) settings.quality = 'medium';
      if (!['buttons','wheel'].includes(settings.steeringMode)) settings.steeringMode = 'buttons';
      if (!['sunset','day','night'].includes(settings.timeOfDay)) settings.timeOfDay = 'sunset';
      if (!['clear','rain'].includes(settings.weather)) settings.weather = 'clear';
      settings.vibration = settings.vibration !== false; settings.autoAccelerate = settings.autoAccelerate === true;
      const selected = owned.includes(parsed.selected) ? parsed.selected : owned[0];
      const wins:Record<string,number> = {};
      if(parsed.wins&&typeof parsed.wins==='object')for(const [id,value] of Object.entries(parsed.wins))wins[id]=Math.floor(clamp(finite(value),0,1e6));
      const highScores:HighScore[] = Array.isArray(parsed.highScores) ? parsed.highScores.slice(0,10).map((s:HighScore) => ({
        score:clamp(finite(s?.score),0,1e12), event:String(s?.event ?? 'Livre').slice(0,50), position:Math.floor(clamp(finite(s?.position,1),1,7)), date:String(s?.date ?? ''),
      })) : [];
      return {
        ...base, credits:clamp(finite(parsed.credits),0,MAX_MONEY), owned, selected, upgrades, customizations,
        level:Math.floor(clamp(finite(parsed.level,1),1,60)), xp:clamp(finite(parsed.xp),0,1e12),
        wins, racesCompleted:Math.floor(clamp(finite(parsed.racesCompleted),0,1e7)),
        discovered:Array.isArray(parsed.discovered) ? parsed.discovered.filter((x:unknown) => typeof x === 'string').slice(0,100) : [],
        highScores, lastSession:clamp(finite(parsed.lastSession,Date.now()),0,Date.now()),
        incomeSnapshot:clamp(finite(parsed.incomeSnapshot,totalIncome({owned,upgrades})),0,1e12), settings,
        totalDistance:clamp(finite(parsed.totalDistance),0,1e12), bestSpeed:clamp(finite(parsed.bestSpeed),0,1000),
      };
    } catch { return freshSave(); }
  }

  private calculateOffline() {
    const elapsed = Math.max(0, (Date.now() - this.data.lastSession) / 1000);
    const seconds = Math.min(8 * 3600, elapsed);
    if (seconds < 10) return;
    const rate = clamp(this.data.incomeSnapshot || totalIncome(this.data),0,1e12);
    this.pendingOffline = { amount:clamp(rate * seconds,0,MAX_MONEY), seconds };
  }

  subscribe = (listener:() => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  notify = () => this.listeners.forEach(listener => listener());
  save() {
    this.data.lastSession = Date.now();
    this.data.incomeSnapshot = this.income;
    try { localStorage.setItem(KEY,JSON.stringify(this.data)); } catch { /* storage may be disabled; gameplay continues */ }
  }
  commit(save=true) { this.data.incomeSnapshot = this.income; this.notify(); if (save) this.save(); }
  get income() { return totalIncome(this.data); }
  get selectedCar() { return getCar(this.data.selected); }

  addCredits(amount:number, countsAsEarnings=true) {
    const safe = clamp(finite(amount),0,MAX_MONEY);
    this.data.credits = clamp(this.data.credits + safe,0,MAX_MONEY);
    if (countsAsEarnings) this.sessionEarned = clamp(this.sessionEarned + safe,0,MAX_MONEY);
  }
  spend(amount:number) {
    const cost = clamp(finite(amount),0,MAX_MONEY);
    if (this.data.credits + .0001 < cost) return false;
    this.data.credits = Math.max(0,this.data.credits-cost);
    return true;
  }
  collectOffline() {
    const amount = this.pendingOffline.amount;
    if (amount <= 0) return 0;
    this.addCredits(amount);
    this.pendingOffline = {amount:0,seconds:0};
    this.commit();
    return amount;
  }
  selectCar(id:string) {
    if (!this.data.owned.includes(id)) return false;
    this.data.selected = id; this.commit(); return true;
  }
  purchaseCar(id:string):{ok:boolean;reason:string} {
    const car = CAR_MAP[id];
    if (!car) return {ok:false,reason:'Veículo inválido'};
    if (this.data.owned.includes(id)) return {ok:false,reason:'Já está na sua coleção'};
    if (this.data.level < car.unlockLevel) return {ok:false,reason:`Desbloqueia no nível ${car.unlockLevel}`};
    if (this.data.credits < car.price) return {ok:false,reason:'SALDO INSUFICIENTE'};
    if (!this.spend(car.price)) return {ok:false,reason:'SALDO INSUFICIENTE'};
    this.data.owned.push(id);
    this.data.customizations[id] = getCustomization(id);
    this.addXP(40 + CARS.indexOf(car)*10);
    this.commit();
    return {ok:true,reason:'Veículo adquirido'};
  }
  buyUpgrade(carId:string,key:UpgradeKey):{ok:boolean;reason:string;cost:number} {
    if (!this.data.owned.includes(carId)) return {ok:false,reason:'Veículo não adquirido',cost:0};
    const level = this.data.upgrades[carId]?.[key] ?? 0;
    const cost = level >= 10 ? 0 : upgradeCost(key,level);
    if (level >= 10) return {ok:false,reason:'Nível máximo',cost:0};
    if (!this.spend(cost)) return {ok:false,reason:'SALDO INSUFICIENTE',cost};
    if (!this.data.upgrades[carId]) this.data.upgrades[carId] = {};
    this.data.upgrades[carId]![key] = level+1;
    this.addXP(25+level*5);
    this.commit();
    return {ok:true,reason:`Melhoria nível ${level+1} instalada`,cost};
  }
  applyCustomization(carId:string,value:Customization) {
    if (!this.data.owned.includes(carId)) return;
    this.data.customizations[carId] = {...value}; this.commit();
  }
  updateSettings(value:Partial<GameSettings>) {
    this.data.settings = {...this.data.settings,...value}; this.commit();
  }
  addXP(amount:number) {
    this.data.xp += Math.max(0,finite(amount));
    while (this.data.level < 60 && this.data.xp >= XP_FOR_LEVEL(this.data.level)) {
      this.data.xp -= XP_FOR_LEVEL(this.data.level); this.data.level++;
    }
  }
  discover(id:string) {
    if (this.data.discovered.includes(id)) return false;
    this.data.discovered.push(id); this.addXP(75); this.commit(); return true;
  }
  completeRace(eventId:string,won:boolean,reward:number,xp:number,scoreEntry:HighScore) {
    if (won) this.data.wins[eventId] = (this.data.wins[eventId] ?? 0)+1;
    this.data.racesCompleted++;
    this.addCredits(reward); this.addXP(xp);
    this.data.highScores = [...this.data.highScores,scoreEntry].sort((a,b)=>b.score-a.score).slice(0,10);
    this.data.bestSpeed = Math.max(this.data.bestSpeed,0);
    this.commit();
  }
  saveFreeScore(score:number) {
    if (score < 50) return;
    this.data.highScores = [...this.data.highScores,{score:Math.floor(score),event:'Exploração livre',position:1,date:new Date().toLocaleDateString('pt-BR')}].sort((a,b)=>b.score-a.score).slice(0,10);
    this.commit();
  }
  reset() {
    this.data = freshSave(); this.pendingOffline = {amount:0,seconds:0}; this.sessionEarned = 0; this.commit();
  }
}

export const store = new SaveManager();
