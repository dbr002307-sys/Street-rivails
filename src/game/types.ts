export type CarCategory = 'Iniciantes' | 'Esportivos' | 'Supercarros' | 'Hipercarros' | 'Lendários';
export type BodyStyle = 'hatch' | 'sport-hatch' | 'coupe' | 'muscle' | 'super' | 'hyper' | 'legend';
export type UpgradeKey = 'motor' | 'turbo' | 'tires' | 'brakes' | 'nitro' | 'economy';
export type CameraMode = 'near' | 'far' | 'hood';
export type GraphicsQuality = 'low' | 'medium' | 'high';
export type DriveInput = { throttle: number; brake: number; steer: number; nitro: boolean; handbrake: boolean };

export interface CarSpec {
  id: string;
  name: string;
  category: CarCategory;
  body: BodyStyle;
  price: number;
  maxSpeed: number;
  zeroToHundred: number;
  income: number;
  nitro: number;
  color: string;
  accent: string;
  unlockLevel: number;
  mass: number;
  grip: number;
  steering: number;
  brakeForce: number;
  stability: number;
  width: number;
  length: number;
  height: number;
  wheelRadius: number;
  description: string;
}

export interface EffectiveStats {
  maxSpeed: number;
  zeroToHundred: number;
  acceleration: number;
  grip: number;
  brakeForce: number;
  nitroPower: number;
  nitroCapacity: number;
  income: number;
  mass: number;
  steering: number;
  stability: number;
}

export interface Customization {
  color: string;
  finish: 'solid' | 'metallic' | 'pearlescent';
  wheels: 'stock' | 'sport' | 'turbine';
  spoiler: boolean;
  decal: 'none' | 'stripes' | 'side' | 'number';
  neon: 'off' | 'cyan' | 'magenta' | 'gold';
  tint: number;
}

export interface GameSettings {
  camera: CameraMode;
  controlSize: number;
  controlOpacity: number;
  steeringMode: 'buttons' | 'wheel';
  sensitivity: number;
  vibration: boolean;
  autoAccelerate: boolean;
  quality: GraphicsQuality;
  renderDistance: number;
  musicVolume: number;
  effectsVolume: number;
  engineVolume: number;
  timeOfDay: 'sunset' | 'day' | 'night';
  weather: 'clear' | 'rain';
}

export interface HighScore {
  score: number;
  event: string;
  position: number;
  date: string;
}

export interface SaveData {
  version: number;
  credits: number;
  owned: string[];
  selected: string;
  upgrades: Record<string, Partial<Record<UpgradeKey, number>>>;
  customizations: Record<string, Customization>;
  level: number;
  xp: number;
  wins: Record<string, number>;
  racesCompleted: number;
  discovered: string[];
  highScores: HighScore[];
  lastSession: number;
  incomeSnapshot: number;
  settings: GameSettings;
  totalDistance: number;
  bestSpeed: number;
}

export interface Telemetry {
  speed: number;
  maxSpeed: number;
  rpm: number;
  gear: number;
  nitro: number;
  boosting: boolean;
  position: number;
  racers: number;
  raceTime: number;
  progress: number;
  checkpoint: number;
  checkpoints: number;
  countdown: number;
  score: number;
  drift: number;
  surface: 'asphalt' | 'grass' | 'dirt';
  state: 'showcase' | 'free' | 'countdown' | 'racing' | 'finished' | 'paused';
  eventName: string;
  nearby: string | null;
  direction: number;
  nextCheckpoint: { x: number; z: number } | null;
  player: { x: number; z: number; heading: number };
  opponents: { x: number; z: number; color: string }[];
  message: string;
}

export interface RaceResult {
  eventId: string;
  eventName: string;
  position: number;
  racers: number;
  time: number;
  reward: number;
  xp: number;
  score: number;
  won: boolean;
  newBest: boolean;
}

export type Vec2 = { x: number; z: number };
export type Personality = 'balanced' | 'aggressive' | 'cautious' | 'expert' | 'rival';
export type RaceType = 'Rua' | 'Arrancada' | 'Circuito' | 'Alta velocidade' | 'Lendário';

export interface RaceEvent {
  id: string;
  name: string;
  type: RaceType;
  description: string;
  reward: number;
  xp: number;
  level: number;
  laps: number;
  opponents: number;
  path: Vec2[];
  width: number;
  rivalId?: string;
  requiresHyper?: boolean;
  targetSpeed?: number;
  difficulty: number;
}

export interface Rival {
  id: string;
  name: string;
  title: string;
  carId: string;
  personality: Personality;
  skill: number;
  color: string;
  quote: string;
  reward: string;
}

export interface PointOfInterest {
  id: string;
  name: string;
  kind: 'garage' | 'shop' | 'workshop' | 'race' | 'fuel' | 'parking' | 'discovery';
  x: number;
  z: number;
  eventId?: string;
}
