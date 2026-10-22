import type { DriveInput, GameSettings } from '../types';

export class InputController {
  private keys=new Set<string>();
  private touch={left:false,right:false,throttle:false,brake:false,nitro:false,handbrake:false};
  private wheel=0;
  onCamera?:()=>void;onPause?:()=>void;onReset?:()=>void;
  constructor(){window.addEventListener('keydown',this.keyDown);window.addEventListener('keyup',this.keyUp);window.addEventListener('blur',this.clear);}
  private keyDown=(e:KeyboardEvent)=>{
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
    if(!e.repeat&&e.code==='KeyC')this.onCamera?.();if(!e.repeat&&e.code==='Escape')this.onPause?.();if(!e.repeat&&e.code==='KeyR')this.onReset?.();this.keys.add(e.code);
  };
  private keyUp=(e:KeyboardEvent)=>this.keys.delete(e.code);
  private clear=()=>{this.keys.clear();Object.keys(this.touch).forEach(k=>this.touch[k as keyof typeof this.touch]=false);this.wheel=0;};
  set(control:keyof typeof this.touch,active:boolean){this.touch[control]=active;}
  setWheel(value:number){this.wheel=Math.max(-1,Math.min(1,value));}
  releaseAll(){this.clear();}
  getInput(settings:GameSettings):DriveInput{
    const keyboardSteer=(this.keys.has('ArrowLeft')||this.keys.has('KeyA')?-1:0)+(this.keys.has('ArrowRight')||this.keys.has('KeyD')?1:0);
    const touchSteer=(this.touch.left?-1:0)+(this.touch.right?1:0);
    const steer=(settings.steeringMode==='wheel'&&Math.abs(this.wheel)>.01?this.wheel:keyboardSteer+touchSteer)*settings.sensitivity;
    const throttle=this.touch.throttle||this.keys.has('ArrowUp')||this.keys.has('KeyW')||settings.autoAccelerate;
    const brake=this.touch.brake||this.keys.has('ArrowDown')||this.keys.has('KeyS');
    return{throttle:throttle?1:0,brake:brake?1:0,steer:Math.max(-1,Math.min(1,steer)),nitro:this.touch.nitro||this.keys.has('ShiftLeft')||this.keys.has('ShiftRight'),handbrake:this.touch.handbrake||this.keys.has('Space')};
  }
  dispose(){window.removeEventListener('keydown',this.keyDown);window.removeEventListener('keyup',this.keyUp);window.removeEventListener('blur',this.clear);}
}
