import * as THREE from 'three';
import type { DriveInput, Personality, RaceEvent, Vec2 } from '../types';
import type { VehicleController } from './VehicleController';
import type { World } from '../world/World';

const angleWrap=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
export class AIController {
  input:DriveInput={throttle:0,brake:0,steer:0,nitro:false,handbrake:false};
  laneOffset:number;
  private laneTimer=0;
  private stuckTime=0;
  constructor(public vehicle:VehicleController,public personality:Personality,public skill:number,private event:RaceEvent,public name:string){
    this.laneOffset=(Math.random()-.5)*Math.min(5,event.width*.3);
  }
  update(dt:number,target:Vec2,next:Vec2,player:VehicleController,all:VehicleController[],world:World,racing:boolean,finalPhase:boolean){
    const v=this.vehicle,dx=target.x-v.position.x,dz=target.z-v.position.z,dist=Math.hypot(dx,dz);
    if(!racing){this.input={throttle:0,brake:0,steer:0,nitro:false,handbrake:true};return this.input;}
    const personalitySpeed=this.personality==='aggressive'?1.02:this.personality==='cautious'?.88:this.personality==='expert'?.96:this.personality==='rival'?1.01:.94;
    const baseAngle=Math.atan2(dx,dz),laneX=Math.cos(baseAngle)*this.laneOffset,laneZ=-Math.sin(baseAngle)*this.laneOffset;
    const desired=Math.atan2(dx+laneX,dz+laneZ);let diff=angleWrap(desired-v.heading);
    const nextAngle=Math.abs(angleWrap(Math.atan2(next.x-target.x,next.z-target.z)-baseAngle));
    const cornerSkill=this.personality==='expert'?1.18:this.personality==='cautious'?.78:1;
    const cornerSpeed=(13+this.skill*16)*cornerSkill/Math.max(.48,nextAngle*1.6);
    let steer=THREE.MathUtils.clamp(diff*1.75,-1,1),throttle=personalitySpeed*(.78+this.skill*.22),brake=0;
    const speed=v.speedKmh/3.6;
    const personalityPace=this.personality==='aggressive'?1.025:this.personality==='cautious'?.95:this.personality==='rival'?1.035:1;
    const paceCap=(player.stats.maxSpeed/3.6)*(.92+this.event.difficulty*.018+(this.skill-.75)*.12)*personalityPace;
    if(speed>paceCap){throttle=0;if(speed>paceCap*1.06)brake=Math.max(brake,.08);}
    if(nextAngle>.22&&speed>cornerSpeed){brake=THREE.MathUtils.clamp((speed-cornerSpeed)/10,.15,1);throttle=0;}
    if(Math.abs(diff)>.75&&speed>15){throttle*=.45;brake=Math.max(brake,.2);}
    // Local awareness: choose a side to overtake rather than following the same line.
    this.laneTimer-=dt;
    const forward=v.forward(new THREE.Vector3());
    for(const other of all){
      if(other===v)continue;const ox=other.position.x-v.position.x,oz=other.position.z-v.position.z,ahead=ox*forward.x+oz*forward.z,side=ox*forward.z-oz*forward.x;
      if(ahead>0&&ahead<15&&Math.abs(side)<3.2){
        if(this.personality==='aggressive'||this.personality==='rival'||this.personality==='expert'){
          if(this.laneTimer<=0){this.laneOffset=THREE.MathUtils.clamp(this.laneOffset+(side>0?-3.2:3.2),-this.event.width*.32,this.event.width*.32);this.laneTimer=1.4;}
          steer+=side>0?-.22:.22;
        }else if(ahead<8){brake=Math.max(brake,.35);throttle*=.55;}
      }
    }
    // Static obstacle lookahead. AI slows and steers away; no ghosting through props.
    const look=6+speed*.18,lx=v.position.x+forward.x*look,lz=v.position.z+forward.z*look;
    for(const c of world.queryColliders(lx,lz,1.4))if(lx>c.minX-1&&lx<c.maxX+1&&lz>c.minZ-1&&lz<c.maxZ+1){steer+=this.laneOffset>0?-.65:.65;brake=Math.max(brake,.3);break;}
    const straight=nextAngle<.18&&Math.abs(diff)<.18;
    const behind=player.position.distanceTo(v.position)>12;
    const nitro=straight&&speed<paceCap*1.12&&v.nitroEnergy>v.stats.nitroCapacity*.25&&((this.personality==='aggressive'&&dist>20)||(this.personality==='rival'&&(behind||finalPhase))||(finalPhase&&this.skill>.9));
    this.stuckTime=speed<1&&throttle>.2?this.stuckTime+dt:0;
    this.input={throttle:THREE.MathUtils.clamp(throttle,0,1),brake,steer:THREE.MathUtils.clamp(steer,-1,1),nitro,handbrake:false};return this.input;
  }
  get stuck(){return this.stuckTime>4.5;}
  recover(){this.stuckTime=0;this.laneTimer=0;}
}
