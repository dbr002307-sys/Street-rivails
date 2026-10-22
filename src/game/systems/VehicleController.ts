import * as THREE from 'three';
import { effectiveStats } from '../data/cars';
import type { CarSpec, DriveInput, EffectiveStats, UpgradeKey } from '../types';
import type { CarModel } from '../world/CarModel';
import { updateCarVisual } from '../world/CarModel';
import type { World } from '../world/World';

const clamp=THREE.MathUtils.clamp;
export class VehicleController {
  velocity=new THREE.Vector3();
  heading=0;
  steer=0;
  speed=0;
  nitroEnergy:number;
  nitroActive=false;
  surface:'asphalt'|'grass'|'dirt'='asphalt';
  stats:EffectiveStats;
  impact=0;
  distance=0;
  drifting=false;
  accelerationVisual=0;
  private lastPosition=new THREE.Vector3();
  private tempForward=new THREE.Vector3();
  private tempRight=new THREE.Vector3();

  constructor(public car:CarSpec,upgrades:Partial<Record<UpgradeKey,number>>,public model:CarModel,public isPlayer=false){
    this.stats=effectiveStats(car,upgrades);this.nitroEnergy=this.stats.nitroCapacity;
  }
  get position(){return this.model.group.position;}
  get maxSpeedKmh(){return this.stats.maxSpeed;}
  forward(out=new THREE.Vector3()){return out.set(Math.sin(this.heading),0,Math.cos(this.heading));}
  reset(x:number,z:number,heading=0){
    this.position.set(x,0,z);this.heading=heading;this.velocity.set(0,0,0);this.speed=0;this.steer=0;this.nitroActive=false;this.nitroEnergy=this.stats.nitroCapacity;this.impact=0;this.drifting=false;this.lastPosition.copy(this.position);this.syncModel();
  }
  update(dt:number,input:DriveInput,world:World){
    dt=Math.min(dt,.035);const oldSpeed=this.speed;
    const surface=world.surfaceAt(this.position.x,this.position.z);this.surface=surface;
    const surfaceGrip=surface==='asphalt'?1:surface==='grass'?.53:.4;
    const weatherGrip=world.settings.weather==='rain'?.86:1;
    const forward=this.forward(this.tempForward),right=this.tempRight.set(forward.z,0,-forward.x);
    let fwd=this.velocity.dot(forward),lat=this.velocity.dot(right);
    const normalMax=this.stats.maxSpeed/3.6;
    this.nitroActive=!!input.nitro&&input.brake<.05&&this.nitroEnergy>.02&&fwd>-1;
    if(this.nitroActive)this.nitroEnergy=Math.max(0,this.nitroEnergy-dt);else this.nitroEnergy=Math.min(this.stats.nitroCapacity,this.nitroEnergy+dt*this.stats.nitroCapacity/15);
    const boostCap=normalMax*Math.min(1.22,1.07+(this.stats.nitroPower-1)*.14);
    const topCap=this.nitroActive?boostCap:normalMax;
    const offroadFactor=surface==='asphalt'?1:surface==='grass'?.7:.58;
    if(input.brake>.05){
      if(fwd>1){const amount=Math.min(fwd,this.stats.brakeForce*input.brake*dt);this.velocity.addScaledVector(forward,-amount);}
      else {this.velocity.addScaledVector(forward,-this.stats.acceleration*.52*input.brake*dt);fwd=this.velocity.dot(forward);if(fwd<-8.5)this.velocity.addScaledVector(forward,-8.5-fwd);}
    } else if(input.throttle>.01||this.nitroActive){
      const ratio=clamp(Math.max(0,fwd)/Math.max(1,topCap),0,1);
      let accel=this.stats.acceleration*input.throttle*(1-.68*Math.pow(ratio,1.65))*offroadFactor;
      if(this.nitroActive)accel+=this.stats.acceleration*(.45+this.stats.nitroPower*.28);
      if(fwd<0)accel+=this.stats.brakeForce*.7;
      this.velocity.addScaledVector(forward,accel*dt);
    }
    fwd=this.velocity.dot(forward);
    if(fwd>topCap)this.velocity.addScaledVector(forward,topCap-fwd);
    if(!this.nitroActive&&fwd>normalMax)this.velocity.addScaledVector(forward,-Math.min(fwd-normalMax,(5+(fwd-normalMax)*2)*dt));
    if(Math.abs(input.throttle)<.02&&input.brake<.02){const drag=(.65+Math.abs(fwd)*.014+(surface==='asphalt'?0:2.8))*dt;this.velocity.addScaledVector(forward,-Math.sign(fwd)*Math.min(Math.abs(fwd),drag));}
    if(surface!=='asphalt')this.velocity.multiplyScalar(Math.exp(-dt*(surface==='dirt'?.24:.16)));
    const steerTarget=clamp(input.steer,-1,1);this.steer=THREE.MathUtils.lerp(this.steer,steerTarget,Math.min(1,dt*(Math.abs(steerTarget)>.01?9:5.5)));
    const speedForTurn=Math.abs(this.velocity.dot(forward));
    const steerRate=1.62*this.stats.steering*clamp(speedForTurn/5.5,0,1)/(1+speedForTurn*.0085/this.stats.stability);
    this.heading+=this.steer*steerRate*dt*(fwd>=0?1:-1)*(input.handbrake?1.22:1);
    const newForward=this.forward(this.tempForward),newRight=this.tempRight.set(newForward.z,0,-newForward.x);
    fwd=this.velocity.dot(newForward);lat=this.velocity.dot(newRight);
    const grip=this.stats.grip*surfaceGrip*weatherGrip*(input.handbrake?.19:1);
    lat*=Math.exp(-dt*5.2*grip);
    if(input.handbrake&&speedForTurn>6)fwd*=Math.exp(-dt*.65);
    this.velocity.copy(newForward).multiplyScalar(fwd).addScaledVector(newRight,lat);
    this.drifting=Math.abs(lat)>2.1&&Math.abs(fwd)>7;
    this.lastPosition.copy(this.position);this.position.addScaledVector(this.velocity,dt);
    this.resolveWorldCollision(world);
    this.position.x=clamp(this.position.x,-742,742);this.position.z=clamp(this.position.z,-742,742);
    this.distance+=this.position.distanceTo(this.lastPosition);
    this.speed=this.velocity.dot(this.forward(this.tempForward));
    this.accelerationVisual=(this.speed-oldSpeed)/Math.max(dt,.001);
    this.syncModel();
    updateCarVisual(this.model,dt,{speed:this.speed,steer:this.steer,braking:input.brake>.05,nitro:this.nitroActive,night:world.settings.timeOfDay==='night',accel:this.accelerationVisual});
  }
  private resolveWorldCollision(world:World){
    const radius=this.car.width*.53,offsets=[this.car.length*.28,-this.car.length*.28];let strongest=0;
    for(const offset of offsets){
      const forward=this.forward(this.tempForward);const cx=this.position.x+forward.x*offset,cz=this.position.z+forward.z*offset;
      for(const c of world.queryColliders(cx,cz,radius+1)){
        const closestX=clamp(cx,c.minX,c.maxX),closestZ=clamp(cz,c.minZ,c.maxZ);let dx=cx-closestX,dz=cz-closestZ,dist=Math.hypot(dx,dz);
        if(dist>=radius)continue;let nx:number,nz:number,penetration:number;
        if(dist>.0001){nx=dx/dist;nz=dz/dist;penetration=radius-dist;}
        else {const choices=[{v:Math.abs(cx-c.minX),x:-1,z:0},{v:Math.abs(c.maxX-cx),x:1,z:0},{v:Math.abs(cz-c.minZ),x:0,z:-1},{v:Math.abs(c.maxZ-cz),x:0,z:1}].sort((a,b)=>a.v-b.v);nx=choices[0].x;nz=choices[0].z;penetration=radius+choices[0].v;}
        this.position.x+=nx*penetration;this.position.z+=nz*penetration;
        const into=this.velocity.x*nx+this.velocity.z*nz;
        if(into<0){strongest=Math.max(strongest,-into);this.velocity.x-=nx*into*1.12;this.velocity.z-=nz*into*1.12;this.velocity.multiplyScalar(.72);}
      }
    }
    if(strongest>1.5)this.impact=Math.max(this.impact,strongest);
  }
  collideVehicle(other:VehicleController){
    const dx=other.position.x-this.position.x,dz=other.position.z-this.position.z,dist=Math.hypot(dx,dz),min=(this.car.width+other.car.width)*.55;
    if(dist>=min||dist<.001)return 0;const nx=dx/dist,nz=dz/dist,pen=min-dist,total=this.car.mass+other.car.mass;
    this.position.x-=nx*pen*(other.car.mass/total);this.position.z-=nz*pen*(other.car.mass/total);other.position.x+=nx*pen*(this.car.mass/total);other.position.z+=nz*pen*(this.car.mass/total);
    const rel=(other.velocity.x-this.velocity.x)*nx+(other.velocity.z-this.velocity.z)*nz;
    if(rel<0){const impulse=-rel*.62;this.velocity.x-=nx*impulse*(other.car.mass/total);this.velocity.z-=nz*impulse*(other.car.mass/total);other.velocity.x+=nx*impulse*(this.car.mass/total);other.velocity.z+=nz*impulse*(this.car.mass/total);this.velocity.multiplyScalar(.9);other.velocity.multiplyScalar(.9);this.impact=Math.max(this.impact,-rel*.5);other.impact=Math.max(other.impact,-rel*.5);return-rel;}return 0;
  }
  consumeImpact(){const value=this.impact;this.impact=0;return value;}
  syncModel(){this.model.group.rotation.y=this.heading;this.model.group.position.y=0;}
  get speedKmh(){return Math.abs(this.speed)*3.6;}
  get gear(){const r=clamp(this.speedKmh/this.stats.maxSpeed,0,1);if(this.speed<-.5)return'R';if(this.speedKmh<2)return'N';return String(Math.min(6,Math.floor(r*6)+1));}
  get rpm(){const r=clamp(this.speedKmh/this.stats.maxSpeed,0,1),gear=Math.max(1,Math.floor(r*6)+1),within=(r*6)%1;return clamp(.2+within*.68+(this.nitroActive?.1:0)+(gear===1?.08:0),0,1);}
}
