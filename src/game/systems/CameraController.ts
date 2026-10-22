import * as THREE from 'three';
import type { CameraMode } from '../types';
import type { VehicleController } from './VehicleController';
import type { World } from '../world/World';

export class CameraController {
  mode:CameraMode;
  private raycaster=new THREE.Raycaster();
  private shake=0;
  private initialized=false;
  private look=new THREE.Vector3();
  constructor(private camera:THREE.PerspectiveCamera,mode:CameraMode){this.mode=mode;}
  cycle(){this.mode=this.mode==='near'?'far':this.mode==='far'?'hood':'near';return this.mode;}
  kick(amount:number){this.shake=Math.min(.65,this.shake+amount*.018);}
  snap(){this.initialized=false;}
  update(dt:number,vehicle:VehicleController,world:World,nitro:boolean){
    const forward=vehicle.forward(new THREE.Vector3()),pos=vehicle.position;
    const distance=this.mode==='far'?9.2:6,height=this.mode==='far'?3.6:2.5;
    const target=new THREE.Vector3(pos.x,pos.y+(this.mode==='hood'?1.12:1),pos.z).addScaledVector(forward,this.mode==='hood'?1.15:2.7);
    const desired=this.mode==='hood'?new THREE.Vector3(pos.x,pos.y+1.18,pos.z).addScaledVector(forward,.65):new THREE.Vector3(pos.x,pos.y+height,pos.z).addScaledVector(forward,-distance);
    if(this.mode!=='hood'){
      const direction=desired.clone().sub(target),length=direction.length();direction.normalize();this.raycaster.set(target,direction);this.raycaster.far=length;
      const hit=this.raycaster.intersectObjects(world.cameraBlockers,false)[0];if(hit)desired.copy(target).addScaledVector(direction,Math.max(.8,hit.distance-.45));
    }
    const responsiveness=this.mode==='hood'?18:5.8;
    if(!this.initialized){this.camera.position.copy(desired);this.look.copy(target);this.initialized=true;}
    this.camera.position.lerp(desired,1-Math.exp(-dt*responsiveness));this.look.lerp(target,1-Math.exp(-dt*9));
    this.shake=Math.max(0,this.shake-dt*2.4);const ambient=nitro?.012:0,shake=this.shake+ambient;
    if(shake>0){this.camera.position.x+=Math.sin(performance.now()*.061)*shake;this.camera.position.y+=Math.cos(performance.now()*.053)*shake*.6;}
    this.camera.lookAt(this.look);
    const speedRatio=Math.min(1,vehicle.speedKmh/Math.max(120,vehicle.stats.maxSpeed));const fov=65+speedRatio*13+(nitro?1.5:0);
    this.camera.fov=THREE.MathUtils.lerp(this.camera.fov,fov,1-Math.exp(-dt*3.5));this.camera.updateProjectionMatrix();
  }
}
