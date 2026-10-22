import type { PointOfInterest, RaceEvent, Rival, Vec2 } from '../types';

const p = (x:number, z:number):Vec2 => ({x,z});
const cityLoop = [p(0,-200),p(0,-60),p(0,100),p(0,280),p(0,400),p(140,400),p(280,400),p(280,250),p(280,100),p(280,-80),p(280,-200),p(140,-200)];
const downtownLoop = [p(-280,-200),p(-280,0),p(-280,100),p(-140,100),p(0,100),p(140,100),p(280,100),p(280,-60),p(280,-200),p(0,-200)];
const circuit = [p(-585,170),p(-500,145),p(-390,145),p(-300,190),p(-275,270),p(-310,355),p(-390,430),p(-490,465),p(-575,420),p(-610,330),p(-610,240)];
const mountain = [p(280,100),p(350,130),p(415,185),p(445,260),p(410,335),p(420,405),p(485,470),p(555,520),p(620,590)];
const highway = [p(520,-610),p(520,-420),p(520,-200),p(520,0),p(520,200),p(520,400),p(520,610)];
const drag = [p(-430,-610),p(-430,-480),p(-430,-350),p(-430,-230)];

export const RACES: RaceEvent[] = [
  { id:'rookie-rush', name:'Batismo de Asfalto', type:'Rua', description:'Uma volta rápida pelo centro. Perfeita para aprender checkpoints e nitro.', reward:500, xp:140, level:1, laps:1, opponents:3, path:cityLoop, width:24, rivalId:'alex', difficulty:1 },
  { id:'downtown-dash', name:'Duelo da Avenida', type:'Rua', description:'Cruzamentos, tráfego de rivais e retas para ultrapassar.', reward:1400, xp:210, level:2, laps:1, opponents:4, path:downtownLoop, width:22, rivalId:'maya', difficulty:2 },
  { id:'industrial-drag', name:'Torque no Porto', type:'Arrancada', description:'400 metros. Arranque, troque no giro certo e use nitro no fim.', reward:800, xp:150, level:3, laps:1, opponents:3, path:drag, width:20, rivalId:'bruno', difficulty:2 },
  { id:'sunset-circuit', name:'Circuito Sunset', type:'Circuito', description:'Duas voltas técnicas com curvas fechadas e zebra.', reward:2500, xp:300, level:5, laps:2, opponents:4, path:circuit, width:16, rivalId:'maya', difficulty:3 },
  { id:'mountain-run', name:'Serpente da Montanha', type:'Rua', description:'Curvas em sequência. Frear cedo vale mais que coragem.', reward:5000, xp:400, level:8, laps:1, opponents:4, path:mountain, width:15, rivalId:'maya', difficulty:4 },
  { id:'highway-300', name:'Caça aos 300', type:'Alta velocidade', description:'Sprint na rodovia. Alcance 300 km/h para bônus de reputação.', reward:9000, xp:500, level:10, laps:1, opponents:5, path:highway, width:28, rivalId:'raven', targetSpeed:300, difficulty:5 },
  { id:'raven-royale', name:'Território da Raven', type:'Circuito', description:'Raven aumenta o ritmo na volta final. Não ceda a linha interna.', reward:18000, xp:650, level:14, laps:2, opponents:5, path:circuit, width:16, rivalId:'raven', difficulty:6 },
  { id:'hyper-sprint', name:'Protocolo Hiper', type:'Alta velocidade', description:'Evento para hipercarros. Velocidade alta exige antecipação.', reward:50000, xp:900, level:25, laps:1, opponents:5, path:highway, width:28, rivalId:'viper', requiresHyper:true, targetSpeed:390, difficulty:7 },
  { id:'viper-gauntlet', name:'Desafio Viper', type:'Lendário', description:'Viper ataca nas retas e defende nas curvas. Duas voltas sem folga.', reward:120000, xp:1200, level:28, laps:2, opponents:6, path:downtownLoop, width:22, rivalId:'viper', requiresHyper:true, difficulty:8 },
  { id:'midnight-infinity', name:'Infinity Noturno', type:'Lendário', description:'O circuito em sua configuração mais rápida, contra a elite.', reward:300000, xp:1700, level:32, laps:3, opponents:6, path:circuit, width:16, rivalId:'viper', requiresHyper:true, difficulty:9 },
  { id:'zero-final', name:'ZERO — Final do Império', type:'Lendário', description:'O campeão Zero libera toda a potência após metade da prova.', reward:1000000, xp:3000, level:35, laps:3, opponents:6, path:cityLoop, width:24, rivalId:'zero', requiresHyper:true, difficulty:10 },
  { id:'omega-velocity', name:'Ômega: Sem Limites', type:'Lendário', description:'A prova definitiva de velocidade na rodovia de Sunset Valley.', reward:750000, xp:2500, level:40, laps:1, opponents:6, path:highway, width:28, rivalId:'zero', requiresHyper:true, targetSpeed:480, difficulty:10 },
];

export const RACE_MAP = Object.fromEntries(RACES.map(race => [race.id, race])) as Record<string, RaceEvent>;
export const getRace = (id:string) => RACE_MAP[id] ?? RACES[0];

export const RIVALS: Rival[] = [
  { id:'alex', name:'Alex Nitro', title:'O novato ousado', carId:'vortex-compact', personality:'balanced', skill:.72, color:'#ef4444', quote:'Sem desculpa, novato. Três, dois, um... a gente se vê na chegada!', reward:'Pintura vermelho competição' },
  { id:'maya', name:'Maya Drift', title:'Rainha das curvas', carId:'falcon-rs', personality:'expert', skill:.82, color:'#a855f7', quote:'Reta qualquer um faz. Me acompanha nas curvas.', reward:'Adesivo lateral Drift' },
  { id:'bruno', name:'Bruno Torque', title:'Rei da arrancada', carId:'thunder-v8', personality:'aggressive', skill:.84, color:'#eab308', quote:'Escuta o V8. Quando a luz apagar, já era.', reward:'Rodas Sport pretas' },
  { id:'raven', name:'Raven', title:'Sombra dos supercarros', carId:'shadow-v12', personality:'rival', skill:.91, color:'#7c3aed', quote:'Você compra potência. Eu transformo potência em vitória.', reward:'Neon violeta' },
  { id:'viper', name:'Viper', title:'Predador de hipercarros', carId:'nebula-x', personality:'aggressive', skill:.96, color:'#06b6d4', quote:'Não olha o retrovisor. Eu já estou do seu lado.', reward:'Pintura perolada elétrica' },
  { id:'zero', name:'Zero', title:'Campeão lendário', carId:'solaris-omega', personality:'rival', skill:1.02, color:'#f5d679', quote:'Todo império tem um último rival. Hoje, esse rival sou eu.', reward:'Dourado Solaris e coroa do vale' },
];

const PREDECESSORS:Record<string,string> = {
  'downtown-dash':'rookie-rush', 'sunset-circuit':'downtown-dash', 'raven-royale':'highway-300',
  'viper-gauntlet':'hyper-sprint', 'midnight-infinity':'viper-gauntlet', 'zero-final':'midnight-infinity', 'omega-velocity':'zero-final',
};
export function raceLockReason(event:RaceEvent,data:{level:number;owned:string[];selected:string;wins:Record<string,number>},getCarFn:(id:string)=>{category:string}){
  if(data.level<event.level)return `NÍVEL ${event.level} NECESSÁRIO`;
  if(event.requiresHyper&&!['Hipercarros','Lendários'].includes(getCarFn(data.selected).category))return 'SELECIONE UM HIPERCARRO';
  const previous=PREDECESSORS[event.id];if(previous&&!(data.wins[previous]>0))return `VENÇA: ${RACE_MAP[previous]?.name.toUpperCase()??'PROVA ANTERIOR'}`;
  return null;
}

export const POIS: PointOfInterest[] = [
  { id:'garage', name:'Garagem pessoal', kind:'garage', x:-80, z:-85 },
  { id:'dealer', name:'Concessionária', kind:'shop', x:95, z:-85 },
  { id:'workshop', name:'Oficina mecânica', kind:'workshop', x:-95, z:65 },
  { id:'fuel', name:'Posto Sunset', kind:'fuel', x:105, z:245 },
  { id:'parking', name:'Estacionamento central', kind:'parking', x:-110, z:245 },
  { id:'rookie-rush', name:'Batismo de Asfalto', kind:'race', x:0, z:-200, eventId:'rookie-rush' },
  { id:'downtown-dash', name:'Duelo da Avenida', kind:'race', x:-280, z:-200, eventId:'downtown-dash' },
  { id:'industrial-drag', name:'Torque no Porto', kind:'race', x:-430, z:-610, eventId:'industrial-drag' },
  { id:'sunset-circuit', name:'Circuito Sunset', kind:'race', x:-585, z:170, eventId:'sunset-circuit' },
  { id:'mountain-run', name:'Serpente da Montanha', kind:'race', x:280, z:100, eventId:'mountain-run' },
  { id:'highway-300', name:'Caça aos 300', kind:'race', x:520, z:-610, eventId:'highway-300' },
  { id:'zero-final', name:'Desafio de Zero', kind:'race', x:0, z:400, eventId:'zero-final' },
  { id:'vista', name:'Mirante do Vale', kind:'discovery', x:620, z:590 },
  { id:'docks', name:'Distrito Industrial', kind:'discovery', x:-570, z:-480 },
];
