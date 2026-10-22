import type { CarSpec, Customization, EffectiveStats, UpgradeKey } from '../types';

export const CARS: CarSpec[] = [
  { id:'sparrow-s1', name:'Sparrow S1', category:'Iniciantes', body:'hatch', price:0, maxSpeed:120, zeroToHundred:12, income:5, nitro:1, color:'#f1f3ef', accent:'#d7ddd9', unlockLevel:1, mass:1050, grip:1.02, steering:1.08, brakeForce:15, stability:1.08, width:1.72, length:3.85, height:1.43, wheelRadius:.31, description:'Hatch compacto, leve e amigável. Seu primeiro passo no império.' },
  { id:'vortex-compact', name:'Vortex Compact', category:'Iniciantes', body:'sport-hatch', price:1500, maxSpeed:145, zeroToHundred:9, income:10, nitro:1, color:'#df3038', accent:'#17191d', unlockLevel:3, mass:1120, grip:1.06, steering:1.1, brakeForce:16, stability:1.06, width:1.78, length:4.02, height:1.39, wheelRadius:.33, description:'Hatch esportivo vermelho com saias, rodas pretas e resposta ágil.' },
  { id:'falcon-rs', name:'Falcon RS', category:'Iniciantes', body:'coupe', price:5000, maxSpeed:170, zeroToHundred:7, income:25, nitro:2, color:'#1675d1', accent:'#0b1b2c', unlockLevel:4, mass:1240, grip:1.09, steering:1.08, brakeForce:17, stability:1.05, width:1.84, length:4.35, height:1.31, wheelRadius:.34, description:'Cupê azul de capô longo, spoiler discreto e faróis afilados.' },
  { id:'phantom-gt', name:'Phantom GT', category:'Esportivos', body:'coupe', price:12000, maxSpeed:200, zeroToHundred:5.8, income:60, nitro:2, color:'#17191e', accent:'#525963', unlockLevel:8, mass:1390, grip:1.12, steering:1.05, brakeForce:18, stability:1.04, width:1.91, length:4.52, height:1.3, wheelRadius:.35, description:'Cupê largo e escuro, equilibrado para dominar as ruas.' },
  { id:'inferno-r', name:'Inferno R', category:'Esportivos', body:'super', price:30000, maxSpeed:225, zeroToHundred:4.8, income:150, nitro:3, color:'#d51f29', accent:'#17191d', unlockLevel:10, mass:1350, grip:1.13, steering:1.04, brakeForce:19, stability:1.02, width:1.94, length:4.48, height:1.22, wheelRadius:.35, description:'Vermelho e preto, entradas laterais profundas e difusor traseiro.' },
  { id:'thunder-v8', name:'Thunder V8', category:'Esportivos', body:'muscle', price:65000, maxSpeed:245, zeroToHundred:4.5, income:350, nitro:3, color:'#f0b91d', accent:'#24262a', unlockLevel:12, mass:1640, grip:1.04, steering:.96, brakeForce:19, stability:.98, width:1.98, length:4.83, height:1.35, wheelRadius:.37, description:'Muscle amarelo de capô alto, pneus largos e dupla saída de escape.' },
  { id:'tempest-x', name:'Tempest X', category:'Supercarros', body:'super', price:140000, maxSpeed:280, zeroToHundred:3.5, income:800, nitro:4, color:'#f06a18', accent:'#202329', unlockLevel:12, mass:1280, grip:1.18, steering:1.05, brakeForce:21, stability:1, width:2.01, length:4.55, height:1.13, wheelRadius:.35, description:'Supercarro laranja baixo, afiado e esculpido pelo vento.' },
  { id:'shadow-v12', name:'Shadow V12', category:'Supercarros', body:'super', price:300000, maxSpeed:310, zeroToHundred:3, income:1800, nitro:4, color:'#111217', accent:'#782bc2', unlockLevel:18, mass:1420, grip:1.19, steering:1.01, brakeForce:22, stability:1, width:2.03, length:4.66, height:1.12, wheelRadius:.36, description:'Preto com detalhes roxos, aerofólio e presença intimidante.' },
  { id:'cyclone-r', name:'Cyclone R', category:'Supercarros', body:'super', price:650000, maxSpeed:335, zeroToHundred:2.7, income:4000, nitro:4, color:'#188c58', accent:'#10231c', unlockLevel:21, mass:1320, grip:1.22, steering:1.03, brakeForce:23, stability:1.01, width:2.04, length:4.59, height:1.1, wheelRadius:.36, description:'Verde metálico, enormes entradas de ar e aerodinâmica de pista.' },
  { id:'phantom-hyper', name:'Phantom Hyper', category:'Hipercarros', body:'hyper', price:1400000, maxSpeed:360, zeroToHundred:2.5, income:9000, nitro:5, color:'#b9c3ce', accent:'#293542', unlockLevel:25, mass:1360, grip:1.2, steering:.99, brakeForce:24, stability:.98, width:2.05, length:4.72, height:1.06, wheelRadius:.36, description:'Prata líquida, linhas limpas e velocidade sem concessões.' },
  { id:'nebula-x', name:'Nebula X', category:'Hipercarros', body:'hyper', price:3000000, maxSpeed:390, zeroToHundred:2.2, income:20000, nitro:5, color:'#126ee8', accent:'#35dcff', unlockLevel:28, mass:1290, grip:1.23, steering:1, brakeForce:25, stability:1, width:2.06, length:4.68, height:1.04, wheelRadius:.36, description:'Azul elétrico com assinatura luminosa e rodas futuristas.' },
  { id:'apex-zero', name:'Apex Zero', category:'Hipercarros', body:'hyper', price:7000000, maxSpeed:420, zeroToHundred:2, income:45000, nitro:6, color:'#f3f2ed', accent:'#d92936', unlockLevel:31, mass:1240, grip:1.25, steering:.98, brakeForce:26, stability:.97, width:2.08, length:4.76, height:1.01, wheelRadius:.36, description:'Branco e vermelho, extremamente baixo, com enorme aerofólio.' },
  { id:'titan-velocity', name:'Titan Velocity', category:'Lendários', body:'legend', price:15000000, maxSpeed:450, zeroToHundred:1.9, income:100000, nitro:7, color:'#d5a629', accent:'#181a1d', unlockLevel:35, mass:1310, grip:1.25, steering:.98, brakeForce:27, stability:1, width:2.09, length:4.8, height:1.02, wheelRadius:.37, description:'Dourado, radical e iluminado como um troféu em movimento.' },
  { id:'eclipse-infinity', name:'Eclipse Infinity', category:'Lendários', body:'legend', price:35000000, maxSpeed:480, zeroToHundred:1.7, income:250000, nitro:7, color:'#111019', accent:'#9a35ef', unlockLevel:38, mass:1270, grip:1.28, steering:1, brakeForce:28, stability:1.02, width:2.1, length:4.82, height:1, wheelRadius:.37, description:'Preto e roxo, neon integral e tecnologia de outro mundo.' },
  { id:'solaris-omega', name:'Solaris Omega', category:'Lendários', body:'legend', price:80000000, maxSpeed:520, zeroToHundred:1.5, income:600000, nitro:8, color:'#f5f1df', accent:'#2f83e7', unlockLevel:42, mass:1220, grip:1.3, steering:1.01, brakeForce:29, stability:1.04, width:2.12, length:4.88, height:.99, wheelRadius:.37, description:'Branco, dourado e azul. O ápice do império, com aerofólio ativo.' },
];

export const CAR_MAP = Object.fromEntries(CARS.map(car => [car.id, car])) as Record<string, CarSpec>;
export const getCar = (id: string) => CAR_MAP[id] ?? CARS[0];

export const UPGRADES: { key: UpgradeKey; name: string; baseCost: number; growth: number; step: number; description: string; unit: string }[] = [
  { key:'motor', name:'Motor', baseCost:2000, growth:.7, step:5, description:'Velocidade máxima', unit:'%' },
  { key:'turbo', name:'Turbo', baseCost:3000, growth:.75, step:6, description:'Aceleração', unit:'%' },
  { key:'tires', name:'Pneus', baseCost:1500, growth:.6, step:5, description:'Aderência', unit:'%' },
  { key:'brakes', name:'Freios', baseCost:1000, growth:.6, step:7, description:'Desaceleração', unit:'%' },
  { key:'nitro', name:'Nitro', baseCost:5000, growth:.8, step:8, description:'Força e capacidade', unit:'%' },
  { key:'economy', name:'Rendimento econômico', baseCost:10000, growth:1, step:10, description:'Renda passiva', unit:'%' },
];

export const DEFAULT_CUSTOMIZATION: Customization = { color:'', finish:'solid', wheels:'stock', spoiler:true, decal:'none', neon:'off', tint:.45 };
export function getCustomization(carId: string, saved?: Partial<Customization>): Customization {
  const merged={...DEFAULT_CUSTOMIZATION,color:getCar(carId).color,...saved};
  return {
    color:typeof merged.color==='string'&&/^#[0-9a-f]{6}$/i.test(merged.color)?merged.color:getCar(carId).color,
    finish:['solid','metallic','pearlescent'].includes(merged.finish)?merged.finish:'solid',
    wheels:['stock','sport','turbine'].includes(merged.wheels)?merged.wheels:'stock',
    spoiler:merged.spoiler!==false,
    decal:['none','stripes','side','number'].includes(merged.decal)?merged.decal:'none',
    neon:['off','cyan','magenta','gold'].includes(merged.neon)?merged.neon:'off',
    tint:Math.min(1,Math.max(0,Number.isFinite(merged.tint)?merged.tint:.45)),
  };
}

export function upgradeCost(key: UpgradeKey, level: number) {
  const def = UPGRADES.find(item => item.key === key)!;
  return Math.round(def.baseCost * Math.pow(1 + def.growth, level));
}

export function effectiveStats(car: CarSpec, upgrades: Partial<Record<UpgradeKey, number>> = {}): EffectiveStats {
  const motor = Math.min(10, Math.max(0, upgrades.motor ?? 0));
  const turbo = Math.min(10, Math.max(0, upgrades.turbo ?? 0));
  const tires = Math.min(10, Math.max(0, upgrades.tires ?? 0));
  const brakes = Math.min(10, Math.max(0, upgrades.brakes ?? 0));
  const nitro = Math.min(10, Math.max(0, upgrades.nitro ?? 0));
  const economy = Math.min(10, Math.max(0, upgrades.economy ?? 0));
  const zeroToHundred = car.zeroToHundred / (1 + turbo * .06);
  return {
    maxSpeed: car.maxSpeed * (1 + motor * .05),
    zeroToHundred,
    acceleration: (27.78 / zeroToHundred) * 1.32,
    grip: car.grip * (1 + tires * .05),
    brakeForce: car.brakeForce * (1 + brakes * .07),
    nitroPower: (1.12 + car.nitro * .025) * (1 + nitro * .08),
    nitroCapacity: (4.2 + car.nitro * .38) * (1 + nitro * .08),
    income: car.income * (1 + economy * .1),
    mass: car.mass,
    steering: car.steering,
    stability: car.stability,
  };
}

export function totalIncome(data: { owned:string[]; upgrades:Record<string, Partial<Record<UpgradeKey, number>>> }) {
  return data.owned.reduce((sum, id) => sum + effectiveStats(getCar(id), data.upgrades[id]).income, 0);
}

export const XP_FOR_LEVEL = (level: number) => Math.round(100 * Math.pow(level, 1.35));
export const formatMoney = (value: number) => {
  const n = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  if (n >= 1e9) return `$${(n / 1e9).toFixed(n >= 1e10 ? 1 : 2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(n >= 1e7 ? 1 : 2)}M`;
  return `$${n.toLocaleString('pt-BR')}`;
};
export const formatFullMoney = (value: number) => `$${Math.max(0, Math.floor(value)).toLocaleString('pt-BR')}`;
