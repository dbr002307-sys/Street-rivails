import type { GameSettings } from '../types';

type SfxName = 'click'|'purchase'|'upgrade'|'nitro'|'collision'|'victory'|'defeat'|'countdown'|'go'|'checkpoint'|'skid';

export class AudioManager {
  private ctx:AudioContext | null = null;
  private master:GainNode | null = null;
  private sfxBus:GainNode | null = null;
  private engineBus:GainNode | null = null;
  private musicBus:GainNode | null = null;
  private engineOsc:OscillatorNode[] = [];
  private engineGain:GainNode | null = null;
  private filter:BiquadFilterNode | null = null;
  private settings:GameSettings | null = null;
  private cooldown:Record<string,number> = {};

  unlock(settings:GameSettings) {
    this.settings = settings;
    if (!this.ctx) {
      const Context = window.AudioContext || (window as typeof window & {webkitAudioContext:typeof AudioContext}).webkitAudioContext;
      if (!Context) return;
      this.ctx = new Context();
      this.master = this.ctx.createGain(); this.master.gain.value = .8; this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain(); this.sfxBus.connect(this.master);
      this.engineBus = this.ctx.createGain(); this.engineBus.connect(this.master);
      this.musicBus = this.ctx.createGain(); this.musicBus.connect(this.master);
      this.createEngine(); this.createAmbience(); this.applySettings(settings);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }
  applySettings(settings:GameSettings) {
    this.settings = settings;
    if (!this.ctx) return;
    this.sfxBus!.gain.setTargetAtTime(settings.effectsVolume,this.ctx.currentTime,.03);
    this.engineBus!.gain.setTargetAtTime(settings.engineVolume,this.ctx.currentTime,.03);
    this.musicBus!.gain.setTargetAtTime(settings.musicVolume*.18,this.ctx.currentTime,.1);
  }
  private createEngine() {
    if (!this.ctx || !this.engineBus) return;
    this.engineGain = this.ctx.createGain(); this.engineGain.gain.value = 0;
    this.filter = this.ctx.createBiquadFilter(); this.filter.type='lowpass'; this.filter.frequency.value=600;
    this.engineGain.connect(this.filter); this.filter.connect(this.engineBus);
    for (const [type,level] of [['sawtooth',.5],['triangle',.65]] as const) {
      const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
      osc.type=type; osc.frequency.value=45; gain.gain.value=level; osc.connect(gain); gain.connect(this.engineGain); osc.start(); this.engineOsc.push(osc);
    }
  }
  private createAmbience() {
    if (!this.ctx || !this.musicBus) return;
    for (const [i,freq] of [55,82.41,110].entries()) {
      const osc=this.ctx.createOscillator(), gain=this.ctx.createGain(), filter=this.ctx.createBiquadFilter();
      osc.type=i===1?'triangle':'sine'; osc.frequency.value=freq; gain.gain.value=.055/(i+1); filter.type='lowpass'; filter.frequency.value=280;
      osc.connect(filter); filter.connect(gain); gain.connect(this.musicBus); osc.start();
    }
  }
  setEngine(speedRatio:number, throttle:number, active:boolean) {
    if (!this.ctx || !this.engineGain || !this.filter) return;
    const t=this.ctx.currentTime, rpm=45+Math.min(1.35,Math.max(0,speedRatio))*145 + Math.max(0,throttle)*16;
    this.engineOsc.forEach((osc,i)=>osc.frequency.setTargetAtTime(rpm*(i?2.02:1),t,.035));
    this.filter.frequency.setTargetAtTime(380+speedRatio*1700+Math.max(0,throttle)*300,t,.05);
    this.engineGain.gain.setTargetAtTime(active ? .055+Math.min(1,speedRatio)*.035+Math.abs(throttle)*.018 : 0,t,.08);
  }
  sfx(name:SfxName,intensity=1) {
    if (!this.ctx || !this.sfxBus || (this.settings?.effectsVolume ?? 0)<=0) return;
    const now=this.ctx.currentTime;
    if ((this.cooldown[name] ?? 0)>now) return;
    this.cooldown[name]=now+(name==='collision'?.16:name==='click'?.035:.06);
    const tone=(freq:number,duration:number,type:OscillatorType='sine',delay=0,volume=.12,endFreq?:number) => {
      const osc=this.ctx!.createOscillator(), gain=this.ctx!.createGain();
      osc.type=type; osc.frequency.setValueAtTime(freq,now+delay); if(endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),now+delay+duration);
      gain.gain.setValueAtTime(.0001,now+delay); gain.gain.exponentialRampToValueAtTime(Math.max(.001,volume*intensity),now+delay+.012); gain.gain.exponentialRampToValueAtTime(.0001,now+delay+duration);
      osc.connect(gain); gain.connect(this.sfxBus!); osc.start(now+delay); osc.stop(now+delay+duration+.02);
    };
    if(name==='click') tone(420,.045,'sine',0,.055,520);
    if(name==='nitro'){tone(140,.32,'sawtooth',0,.08,620);tone(680,.2,'sine',.03,.06,220);}
    if(name==='collision'){tone(90,.22,'square',0,.12,35);tone(240,.1,'sawtooth',0,.05,60);}
    if(name==='purchase'){[440,554,659,880].forEach((f,i)=>tone(f,.2,'triangle',i*.07,.09));}
    if(name==='upgrade'){[330,495,660].forEach((f,i)=>tone(f,.13,'square',i*.055,.045));}
    if(name==='victory'){[392,523,659,784].forEach((f,i)=>tone(f,.35,'triangle',i*.11,.1));}
    if(name==='defeat'){[330,277,220].forEach((f,i)=>tone(f,.3,'sawtooth',i*.13,.06));}
    if(name==='countdown')tone(330,.14,'square',0,.07);
    if(name==='go')tone(660,.32,'square',0,.09,990);
    if(name==='checkpoint'){tone(740,.09,'sine',0,.07);tone(990,.12,'sine',.06,.06);}
    if(name==='skid')tone(120,.12,'sawtooth',0,.025,70);
  }
}

export const audio = new AudioManager();
