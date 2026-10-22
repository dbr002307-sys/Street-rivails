import type { RaceEvent, Vec2 } from '../types';
import type { AIController } from './AIController';
import type { VehicleController } from './VehicleController';

export interface Driver {vehicle:VehicleController;ai?:AIController;name:string;isPlayer:boolean;next:number;lap:number;finished:boolean;finishTime:number;progress:number;stuck:number;startDelay:number;color:string}
export class RaceManager {
  event:RaceEvent|null=null;
  drivers:Driver[]=[];
  state:'idle'|'countdown'|'racing'|'finished'='idle';
  countdown=0;
  time=0;
  private lastCountdown=4;
  onCountdown?:(value:number)=>void;
  onCheckpoint?:(player:Driver)=>void;
  onFinish?:(driver:Driver,position:number)=>void;
  private finishFired=false;

  start(event:RaceEvent,player:VehicleController,ais:AIController[],colors:string[]){
    this.event=event;this.drivers=[];this.time=0;this.countdown=3.85;this.lastCountdown=4;this.state='countdown';this.finishFired=false;
    const entries:{vehicle:VehicleController;ai?:AIController;name:string;isPlayer:boolean;color:string}[]=[
      ...ais.map((ai,i)=>({vehicle:ai.vehicle,ai,name:ai.name,isPlayer:false,color:colors[i]??'#ef4444'})),
      {vehicle:player,name:'VOCÊ',isPlayer:true,color:'#f8fafc'},
    ];
    const a=event.path[0],b=event.path[1],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),fx=dx/len,fz=dz/len,heading=Math.atan2(fx,fz),rx=fz,rz=-fx;
    entries.forEach((entry,i)=>{
      const row=Math.floor(i/2),side=i%2===0?-1:1,x=a.x-fx*(5+row*6)+rx*side*Math.min(3,event.width*.17),z=a.z-fz*(5+row*6)+rz*side*Math.min(3,event.width*.17);
      entry.vehicle.reset(x,z,heading);
      this.drivers.push({...entry,next:1,lap:0,finished:false,finishTime:0,progress:0,stuck:0,startDelay:0});
    });
  }
  get player(){return this.drivers.find(d=>d.isPlayer);}
  get closed(){return !!this.event&&(this.event.laps>1||['Circuito','Rua','Lendário'].includes(this.event.type)&&this.event.id!=='mountain-run'&&this.event.id!=='viper-gauntlet'?true:this.event?.type==='Circuito');}
  private get checkpointCount(){if(!this.event)return 1;return this.closed?this.event.path.length:this.event.path.length-1;}
  target(driver:Driver):Vec2{
    if(!this.event)return{x:0,z:0};const n=this.event.path.length;return this.event.path[this.closed?driver.next%n:Math.min(driver.next,n-1)];
  }
  nextTarget(driver:Driver):Vec2{
    if(!this.event)return{x:0,z:0};const n=this.event.path.length;const next=this.closed?(driver.next+1)%n:Math.min(driver.next+1,n-1);return this.event.path[next];
  }
  update(dt:number){
    if(this.state==='countdown'){
      this.countdown-=dt;const shown=Math.ceil(this.countdown);
      if(shown!==this.lastCountdown&&shown>=0){this.lastCountdown=shown;this.onCountdown?.(shown);}
      if(this.countdown<=0){this.state='racing';this.time=0;}return;
    }
    if(this.state!=='racing'||!this.event)return;this.time+=dt;
    for(const driver of this.drivers){
      if(driver.finished)continue;const target=this.target(driver),distance=Math.hypot(driver.vehicle.position.x-target.x,driver.vehicle.position.z-target.z);
      const radius=Math.max(9,this.event.width*.52);
      if(distance<radius){
        const finalIndex=this.closed?this.event.path.length:this.event.path.length-1;
        if(driver.next>=finalIndex){
          driver.lap++;
          if(driver.lap>=this.event.laps){driver.finished=true;driver.finishTime=this.time;driver.vehicle.velocity.multiplyScalar(.85);}
          else driver.next=1;
        }else driver.next++;
        if(driver.isPlayer)this.onCheckpoint?.(driver);
        if(driver.finished&&driver.isPlayer&&!this.finishFired){this.finishFired=true;this.state='finished';this.onFinish?.(driver,this.positionOf(driver));}
      }
      const segmentTotal=Math.max(1,Math.hypot(target.x-driver.vehicle.position.x,target.z-driver.vehicle.position.z));
      const previous=driver.next===1?this.event.path[0]:this.event.path[this.closed?(driver.next-1)%this.event.path.length:driver.next-1];
      const segmentLength=Math.max(1,Math.hypot(target.x-previous.x,target.z-previous.z));
      const fraction=Math.max(0,Math.min(1,1-segmentTotal/segmentLength));
      const base=driver.lap*this.checkpointCount+Math.max(0,driver.next-1);
      driver.progress=Math.min(driver.lap>=this.event.laps?1:.999,(base+fraction)/(this.event.laps*this.checkpointCount));
      if(driver.ai?.stuck){driver.stuck+=dt;if(driver.stuck>1){this.recover(driver);driver.stuck=0;}}else driver.stuck=0;
    }
  }
  recover(driver:Driver){
    if(!this.event||driver.finished)return;const prevIndex=driver.next===1?0:this.closed?(driver.next-1)%this.event.path.length:driver.next-1;
    const p=this.event.path[prevIndex],target=this.target(driver),heading=Math.atan2(target.x-p.x,target.z-p.z);
    const nitro=driver.vehicle.nitroEnergy;driver.vehicle.reset(p.x,p.z,heading);driver.vehicle.nitroEnergy=nitro;driver.ai?.recover();
  }
  recoverPlayer(){const player=this.player;if(player)this.recover(player);}
  positionOf(driver:Driver){
    const ordered=[...this.drivers].sort((a,b)=>a.finished&&b.finished?a.finishTime-b.finishTime:a.finished?-1:b.finished?1:b.progress-a.progress);return ordered.indexOf(driver)+1;
  }
  get playerPosition(){const p=this.player;return p?this.positionOf(p):1;}
  get progress(){return this.player?.progress??0;}
  get finalPhase(){return this.progress>.62;}
  get checkpointDisplay(){const p=this.player;return p?Math.min(this.checkpointCount,p.lap*this.checkpointCount+p.next):0;}
  get totalCheckpoints(){return this.event?this.checkpointCount*this.event.laps:0;}
  dispose(){this.drivers=[];this.event=null;this.state='idle';}
}
