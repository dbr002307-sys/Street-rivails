import { useEffect, useState } from 'react';
import { Check, ChevronRight, Flag, Paintbrush, Play, Settings, ShoppingBag, Store, Trophy, Warehouse, Wrench } from 'lucide-react';
import { CARS, UPGRADES, effectiveStats, formatFullMoney, formatMoney, getCar, getCustomization, upgradeCost } from '../game/data/cars';
import type { CarCategory, Customization, UpgradeKey } from '../game/types';
import { store } from '../game/systems/SaveManager';
import { audio } from '../game/systems/AudioManager';
import { BackButton, Button, CarGlyph, CarQuickStats, CategoryBadge, Panel, SectionTitle, StatBar, TopBar } from './Common';

interface MainProps{onPlay:()=>void;onNavigate:(screen:'garage'|'shop'|'workshop'|'races'|'settings'|'records')=>void}
export function MainMenu({onPlay,onNavigate}:MainProps){
  const car=store.selectedCar;
  return <div className="screen menu-screen">
    <TopBar/>
    <div className="menu-content">
      <div className="menu-hero">
        <div className="sunset-label"><span/> SUNSET VALLEY <span/></div>
        <h1><span>STREET</span><strong>RIVALS</strong></h1><div className="racing-empire">RACING EMPIRE</div>
        <p>Construa sua frota. Domine cada rua.<br/>Transforme velocidade em um império.</p>
        <Button className="play-button" onClick={onPlay}><Play fill="currentColor" size={22}/> JOGAR <ChevronRight size={20}/></Button>
        <small className="menu-hint">Exploração livre • Corridas contra IA • Progresso salvo</small>
      </div>
      <nav className="main-nav" aria-label="Menu principal">
        <Button variant="secondary" onClick={()=>onNavigate('garage')}><Warehouse/> GARAGEM <span>{store.data.owned.length} CARROS</span></Button>
        <Button variant="secondary" onClick={()=>onNavigate('shop')}><Store/> LOJA <span>15 MODELOS</span></Button>
        <Button variant="secondary" onClick={()=>onNavigate('workshop')}><Wrench/> OFICINA <span>MELHORIAS</span></Button>
        <Button variant="secondary" onClick={()=>onNavigate('races')}><Flag/> CORRIDAS <span>{store.data.racesCompleted} COMPLETAS</span></Button>
        <Button variant="secondary" onClick={()=>onNavigate('settings')}><Settings/> CONFIGURAÇÕES</Button>
        <Button variant="ghost" onClick={()=>onNavigate('records')}><Trophy/> RECORDES LOCAIS</Button>
      </nav>
    </div>
    <Panel className="menu-car-card"><div><CategoryBadge car={car}/><h3>{car.name}</h3><CarQuickStats car={car}/></div><CarGlyph car={car}/></Panel>
    <div className="session-income"><span>RENDA DA FROTA</span><b>{formatMoney(store.income)}/s</b><small>+{formatMoney(store.sessionEarned)} nesta sessão</small></div>
  </div>;
}

function ScreenHeader({eyebrow,title,description,onBack}:{eyebrow:string;title:string;description:string;onBack:()=>void}){
  return <><TopBar/><div className="screen-heading"><BackButton onClick={onBack}/><SectionTitle eyebrow={eyebrow} title={title} description={description}/></div></>;
}

interface GarageProps{previewId:string;onPreview:(id:string)=>void;onBack:()=>void;onPlay:()=>void;onShop:()=>void;onWorkshop:()=>void;onCustomize:()=>void}
export function GarageScreen({previewId,onPreview,onBack,onPlay,onShop,onWorkshop,onCustomize}:GarageProps){
  useEffect(()=>{if(!store.data.owned.includes(previewId))onPreview(store.data.selected);},[]);
  const id=store.data.owned.includes(previewId)?previewId:store.data.selected,car=getCar(id),stats=effectiveStats(car,store.data.upgrades[id]);
  const activate=()=>{store.selectCar(id);onPreview(id);};
  return <div className="screen collection-screen">
    <ScreenHeader eyebrow="SUA COLEÇÃO" title="GARAGEM" description="Selecione, personalize e evolua cada veículo." onBack={onBack}/>
    <div className="collection-layout">
      <Panel className="vehicle-detail">
        <CategoryBadge car={car}/><h2>{car.name}</h2><p>{car.description}</p>
        <div className="detail-stats"><StatBar label="Velocidade máxima" value={stats.maxSpeed} max={520} display={`${Math.round(stats.maxSpeed)} km/h`}/><StatBar label="Aceleração" value={15-stats.zeroToHundred} max={14} display={`${stats.zeroToHundred.toFixed(1)} s`}/><StatBar label="Aderência" value={stats.grip} max={2} display={stats.grip.toFixed(2)}/><StatBar label="Renda passiva" value={stats.income} max={600000} display={`${formatMoney(stats.income)}/s`}/></div>
        <div className="button-stack">
          {store.data.selected===id?<Button onClick={onPlay}><Play size={17}/> DIRIGIR ESTE CARRO</Button>:<Button onClick={activate}><Check size={17}/> SELECIONAR CARRO</Button>}
          <div className="button-row"><Button variant="secondary" onClick={onCustomize}><Paintbrush size={16}/> PERSONALIZAR</Button><Button variant="secondary" onClick={onWorkshop}><Wrench size={16}/> OFICINA</Button></div>
        </div>
      </Panel>
      <div className="vehicle-list-panel"><div className="list-heading"><span>VEÍCULOS ADQUIRIDOS</span><b>{store.data.owned.length}/15</b></div><div className="vehicle-list">
        {store.data.owned.map(ownedId=>{const item=getCar(ownedId);return <button key={ownedId} onClick={()=>onPreview(ownedId)} className={`vehicle-row ${id===ownedId?'selected':''}`}><CarGlyph car={item}/><div><CategoryBadge car={item}/><b>{item.name}</b><small>{formatMoney(effectiveStats(item,store.data.upgrades[ownedId]).income)}/s</small></div>{store.data.selected===ownedId&&<span className="active-tag">ATIVO</span>}</button>;})}
        <button className="vehicle-row shop-shortcut" onClick={onShop}><ShoppingBag/><div><b>EXPANDIR A FROTA</b><small>Visitar concessionária</small></div><ChevronRight/></button>
      </div></div>
    </div>
  </div>;
}

const categories:CarCategory[]=['Iniciantes','Esportivos','Supercarros','Hipercarros','Lendários'];
interface ShopProps{previewId:string;onPreview:(id:string)=>void;onBack:()=>void;onDrive:()=>void}
export function ShopScreen({previewId,onPreview,onBack,onDrive}:ShopProps){
  const [category,setCategory]=useState<CarCategory>('Iniciantes');const [bought,setBought]=useState<string|null>(null);const [error,setError]=useState('');
  const car=getCar(previewId),owned=store.data.owned.includes(car.id);
  const buy=(id:string)=>{const result=store.purchaseCar(id);if(result.ok){setBought(id);setError('');audio.sfx('purchase');}else{setError(result.reason);setTimeout(()=>setError(''),1800);}};
  return <div className="screen collection-screen shop-screen">
    <ScreenHeader eyebrow="CONCESSIONÁRIA OFICIAL" title="LOJA DE VEÍCULOS" description="Cada modelo é único e começa a gerar Credits imediatamente." onBack={onBack}/>
    <div className="category-tabs">{categories.map(cat=><button key={cat} className={category===cat?'active':''} onClick={()=>setCategory(cat)}>{cat}</button>)}</div>
    <div className="shop-layout">
      <Panel className="shop-preview"><CategoryBadge car={car}/><h2>{car.name}</h2><p>{car.description}</p><CarQuickStats car={car}/><div className="shop-price">{car.price===0?'GRÁTIS':formatFullMoney(car.price)}</div>
        {owned?<Button disabled><Check size={17}/> ADQUIRIDO</Button>:store.data.level<car.unlockLevel?<Button disabled>NÍVEL {car.unlockLevel} NECESSÁRIO</Button>:<Button onClick={()=>buy(car.id)} disabled={store.data.credits<car.price}>{store.data.credits<car.price?'SALDO INSUFICIENTE':'COMPRAR AGORA'}</Button>}
        {error&&<div className="inline-error">{error}</div>}
      </Panel>
      <div className="shop-grid">{CARS.filter(c=>c.category===category).map(item=>{
        const has=store.data.owned.includes(item.id),locked=store.data.level<item.unlockLevel,poor=store.data.credits<item.price;
        return <Panel key={item.id} className={`shop-card ${previewId===item.id?'selected':''}`}><button className="car-visual-button" onClick={()=>onPreview(item.id)} aria-label={`Visualizar ${item.name}`}><CarGlyph car={item}/><span>VISUALIZAR 3D</span></button><CategoryBadge car={item}/><h3>{item.name}</h3><CarQuickStats car={item}/><div className="shop-card-bottom"><strong>{formatFullMoney(item.price)}</strong>{has?<Button variant="secondary" disabled><Check size={14}/> NA GARAGEM</Button>:locked?<Button variant="secondary" disabled>NÍVEL {item.unlockLevel}</Button>:<Button onClick={()=>buy(item.id)} disabled={poor}>{poor?'SALDO INSUFICIENTE':'COMPRAR'}</Button>}</div></Panel>;})}</div>
    </div>
    {bought&&<div className="modal-backdrop"><Panel className="purchase-modal"><div className="success-icon"><Check/></div><span>NOVO VEÍCULO NA COLEÇÃO</span><h2>{getCar(bought).name}</h2><CarGlyph car={getCar(bought)}/><p>Renda passiva ativada. Sua frota agora produz <b>{formatMoney(store.income)}/s</b>.</p><div className="button-row"><Button variant="secondary" onClick={()=>setBought(null)}>CONTINUAR NA LOJA</Button><Button onClick={()=>{store.selectCar(bought);setBought(null);onDrive();}}><Play size={16}/> SELECIONAR E DIRIGIR</Button></div></Panel></div>}
  </div>;
}

function upgradeDisplay(key:UpgradeKey,carId:string,level:number){
  const car=getCar(carId),upgrades={...store.data.upgrades[carId]},before=effectiveStats(car,upgrades);upgrades[key]=Math.min(10,level+1);const after=effectiveStats(car,upgrades);
  if(key==='motor')return{label:'Velocidade máxima',before:`${Math.round(before.maxSpeed)} km/h`,after:`${Math.round(after.maxSpeed)} km/h`};
  if(key==='turbo')return{label:'0–100 km/h',before:`${before.zeroToHundred.toFixed(2)} s`,after:`${after.zeroToHundred.toFixed(2)} s`};
  if(key==='tires')return{label:'Índice de aderência',before:before.grip.toFixed(2),after:after.grip.toFixed(2)};
  if(key==='brakes')return{label:'Força de frenagem',before:before.brakeForce.toFixed(1),after:after.brakeForce.toFixed(1)};
  if(key==='nitro')return{label:'Capacidade de nitro',before:`${before.nitroCapacity.toFixed(1)} s`,after:`${after.nitroCapacity.toFixed(1)} s`};
  return{label:'Renda por segundo',before:`${formatMoney(before.income)}/s`,after:`${formatMoney(after.income)}/s`};
}
export function WorkshopScreen({previewId,onPreview,onBack,onCustomize}:{previewId:string;onPreview:(id:string)=>void;onBack:()=>void;onCustomize:()=>void}){
  useEffect(()=>{if(!store.data.owned.includes(previewId))onPreview(store.data.selected);},[]);
  const id=store.data.owned.includes(previewId)?previewId:store.data.selected,car=getCar(id);const [confirmation,setConfirmation]=useState('');const [error,setError]=useState('');
  const buy=(key:UpgradeKey)=>{const result=store.buyUpgrade(id,key);if(result.ok){setConfirmation(result.reason);audio.sfx('upgrade');setTimeout(()=>setConfirmation(''),1700);}else{setError(result.reason);setTimeout(()=>setError(''),1500);}};
  return <div className="screen collection-screen workshop-screen"><ScreenHeader eyebrow="OFICINA MECÂNICA" title="MELHORIAS" description="Peças instaladas alteram imediatamente a física e a renda real." onBack={onBack}/>
    <div className="workshop-layout"><Panel className="workshop-sidebar"><CategoryBadge car={car}/><h2>{car.name}</h2><CarGlyph car={car}/><label>VEÍCULO NA PLATAFORMA<select value={id} onChange={e=>onPreview(e.target.value)}>{store.data.owned.map(ownedId=><option key={ownedId} value={ownedId}>{getCar(ownedId).name}</option>)}</select></label>
      <div className="workshop-total"><span>RENDA DESTE CARRO</span><b>{formatMoney(effectiveStats(car,store.data.upgrades[id]).income)}/s</b></div><Button variant="secondary" onClick={onCustomize}><Paintbrush size={16}/> PERSONALIZAÇÃO</Button><small>Melhorias avançadas disponíveis. Nível de oficina {store.data.level>=5?'AVANÇADO':'BÁSICO'}.</small>
    </Panel>
    <div className="upgrade-grid">{UPGRADES.map(def=>{const level=store.data.upgrades[id]?.[def.key]??0,cost=level<10?upgradeCost(def.key,level):0,maxed=level>=10,poor=store.data.credits<cost,display=upgradeDisplay(def.key,id,level);
      return <Panel key={def.key} className={`upgrade-card ${maxed?'maxed':''}`}><div className="upgrade-title"><div><span>{def.description}</span><h3>{def.name}</h3></div><b>NV. {level}/10</b></div><div className="level-pips">{Array.from({length:10},(_,i)=><i key={i} className={i<level?'filled':''}/>)}</div><div className="upgrade-effect"><span>{display.label}</span><div><small>ANTES</small><b>{display.before}</b><ChevronRight size={15}/><small>DEPOIS</small><strong>{maxed?'MÁXIMO':display.after}</strong></div></div><div className="upgrade-bottom"><span>+{def.step}{def.unit} POR NÍVEL</span><Button disabled={maxed||poor} onClick={()=>buy(def.key)}>{maxed?'NÍVEL MÁXIMO':poor?'SALDO INSUFICIENTE':formatMoney(cost)}</Button></div></Panel>;})}</div></div>
    {(confirmation||error)&&<div className={`toast ${error?'error':''}`}>{error||confirmation}</div>}
  </div>;
}

const paintColors=[['Original',''],['Branco Racing','#f2f0e8'],['Vermelho Apex','#d8323c'],['Azul Elétrico','#1677e8'],['Verde Venom','#23a36b'],['Amarelo Torque','#edb92e'],['Roxo Raven','#7029a8'],['Dourado Zero','#d4a82f']] as const;
export function CustomizeScreen({previewId,onPreviewCustom,onBack}:{previewId:string;onPreviewCustom:(custom:Customization)=>void;onBack:()=>void}){
  const id=store.data.owned.includes(previewId)?previewId:store.data.selected,car=getCar(id);
  const [draft,setDraft]=useState<Customization>(()=>getCustomization(id,store.data.customizations[id]));const [applied,setApplied]=useState(false);
  useEffect(()=>{const next=getCustomization(id,store.data.customizations[id]);setDraft(next);onPreviewCustom(next);},[id]);
  useEffect(()=>{onPreviewCustom(draft);},[draft]);
  const set=(patch:Partial<Customization>)=>{setDraft(old=>({...old,...patch}));setApplied(false);};
  const raven=(store.data.wins['raven-royale']??0)>0,zero=(store.data.wins['zero-final']??0)>0,maya=(store.data.wins['downtown-dash']??0)>0,bruno=(store.data.wins['industrial-drag']??0)>0;
  const apply=()=>{store.applyCustomization(id,draft);setApplied(true);audio.sfx('upgrade');setTimeout(()=>setApplied(false),1500);};
  const cancel=()=>{onPreviewCustom(getCustomization(id,store.data.customizations[id]));onBack();};
  return <div className="screen collection-screen customize-screen"><ScreenHeader eyebrow="ESTÚDIO DE ESTILO" title="PERSONALIZAÇÃO" description={`${car.name} • alterações apenas cosméticas e sem custo.`} onBack={cancel}/>
    <div className="customize-panel"><Panel>
      <section><h3>PINTURA</h3><div className="color-grid">{paintColors.map(([name,color],index)=>{const locked=(index===6&&!raven&&store.data.level<18)||(index===7&&!zero&&store.data.level<35);const value=color||car.color;return <button key={name} disabled={locked} title={locked?'Vença rivais ou suba de nível':name} className={draft.color===value?'selected':''} onClick={()=>set({color:value})}><i style={{background:value}}/><span>{locked?'BLOQUEADA':name}</span></button>;})}</div>
        <div className="option-row">{(['solid','metallic','pearlescent'] as const).map(finish=>{const locked=finish==='metallic'&&store.data.level<3||finish==='pearlescent'&&store.data.level<25&&!raven;return <button key={finish} disabled={locked} className={draft.finish===finish?'selected':''} onClick={()=>set({finish})}>{finish==='solid'?'SÓLIDA':finish==='metallic'?'METÁLICA':'PEROLADA'}{locked&&<small> NV. {finish==='metallic'?3:25}</small>}</button>;})}</div>
      </section>
      <section><h3>RODAS</h3><div className="option-row">{(['stock','sport','turbine'] as const).map(wheel=>{const locked=wheel==='sport'&&!bruno&&store.data.level<5||wheel==='turbine'&&store.data.level<12;return <button key={wheel} disabled={locked} className={draft.wheels===wheel?'selected':''} onClick={()=>set({wheels:wheel})}>{wheel==='stock'?'ORIGINAIS':wheel==='sport'?'SPORT':'TURBINE'}{locked&&<small> NV. {wheel==='sport'?5:12}</small>}</button>;})}</div></section>
      <section><h3>ADESIVOS E AERODINÂMICA</h3><div className="option-row">{(['none','stripes','side','number'] as const).map(decal=>{const locked=decal==='side'&&!maya&&store.data.level<8;return <button key={decal} disabled={locked} className={draft.decal===decal?'selected':''} onClick={()=>set({decal})}>{decal==='none'?'SEM ADESIVO':decal==='stripes'?'FAIXAS':decal==='side'?'LATERAL':'NÚMERO'}</button>;})}<button disabled={!['coupe','super','hyper','legend'].includes(car.body)&&!['falcon-rs','inferno-r'].includes(car.id)} className={draft.spoiler?'selected':''} onClick={()=>set({spoiler:!draft.spoiler})}>AEROFÓLIO {draft.spoiler?'ON':'OFF'}</button></div></section>
      <section><h3>NEON INFERIOR</h3><div className="option-row neon-options">{(['off','cyan','magenta','gold'] as const).map(neon=>{const locked=neon==='cyan'&&store.data.level<8||neon==='magenta'&&!raven||neon==='gold'&&!zero;return <button key={neon} disabled={locked} className={draft.neon===neon?'selected':''} onClick={()=>set({neon})}>{neon==='off'?'DESATIVADO':neon==='cyan'?'CIANO':neon==='magenta'?'MAGENTA':'DOURADO'}{locked&&<small> RIVAL/NÍVEL</small>}</button>;})}</div></section>
      <section><h3>PELÍCULA DOS VIDROS <span>{Math.round(draft.tint*100)}%</span></h3><input type="range" min="0" max="1" step=".05" value={draft.tint} onChange={e=>set({tint:Number(e.target.value)})}/></section>
      <div className="customize-actions"><Button variant="secondary" onClick={cancel}>CANCELAR</Button><Button onClick={apply}><Check size={17}/> APLICAR E SALVAR</Button></div>
    </Panel></div>{applied&&<div className="toast"><Check size={16}/> ESTILO SALVO NESTE VEÍCULO</div>}
  </div>;
}
