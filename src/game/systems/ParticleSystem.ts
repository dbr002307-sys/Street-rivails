import * as THREE from 'three';

type Kind='smoke'|'dust'|'nitro'|'spark';
interface Particle{life:number;maxLife:number;velocity:THREE.Vector3;kind:Kind}
export class ParticleSystem {
  private max=180;
  private positions=new Float32Array(this.max*3);
  private colors=new Float32Array(this.max*3);
  private particles:Particle[]=[];
  private cursor=0;
  private points:THREE.Points;
  private marks:THREE.Mesh[]=[];
  private markCursor=0;
  private markTimer=0;
  constructor(private scene:THREE.Scene){
    for(let i=0;i<this.max;i++){this.positions[i*3+1]=-100;this.particles.push({life:0,maxLife:1,velocity:new THREE.Vector3(),kind:'smoke'});}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(this.positions,3));geo.setAttribute('color',new THREE.BufferAttribute(this.colors,3));
    this.points=new THREE.Points(geo,new THREE.PointsMaterial({size:.58,vertexColors:true,transparent:true,opacity:.7,depthWrite:false,sizeAttenuation:true}));this.points.frustumCulled=false;scene.add(this.points);
    const geoMark=new THREE.PlaneGeometry(.24,1.25);
    for(let i=0;i<56;i++){const mark=new THREE.Mesh(geoMark,new THREE.MeshBasicMaterial({color:'#151719',transparent:true,opacity:.28,depthWrite:false}));mark.rotation.x=-Math.PI/2;mark.visible=false;scene.add(mark);this.marks.push(mark);}
  }
  emit(kind:Kind,position:THREE.Vector3,velocity:THREE.Vector3,count=1){
    const color=new THREE.Color(kind==='smoke'?'#b8bec2':kind==='dust'?'#b6976d':kind==='nitro'?'#45ccff':'#ffb13b');
    for(let n=0;n<count;n++){
      const i=this.cursor++%this.max,p=this.particles[i];p.life=p.maxLife=kind==='nitro'?.28:kind==='spark'?.35:.7+Math.random()*.5;p.kind=kind;p.velocity.copy(velocity).add(new THREE.Vector3((Math.random()-.5)*1.2,Math.random()*(kind==='spark'?3:1),(Math.random()-.5)*1.2));
      this.positions[i*3]=position.x+(Math.random()-.5)*.25;this.positions[i*3+1]=position.y;this.positions[i*3+2]=position.z+(Math.random()-.5)*.25;
      this.colors[i*3]=color.r;this.colors[i*3+1]=color.g;this.colors[i*3+2]=color.b;
    }
  }
  skid(position:THREE.Vector3,heading:number,dt:number,active:boolean){
    this.markTimer-=dt;if(!active||this.markTimer>0)return;this.markTimer=.075;
    for(const side of [-1,1]){const mark=this.marks[this.markCursor++%this.marks.length];mark.visible=true;mark.position.set(position.x+Math.cos(heading)*side*.72,.032,position.z-Math.sin(heading)*side*.72);mark.rotation.z=-heading;}
  }
  update(dt:number){
    for(let i=0;i<this.max;i++){
      const p=this.particles[i];if(p.life<=0)continue;p.life-=dt;
      if(p.life<=0){this.positions[i*3+1]=-100;continue;}
      this.positions[i*3]+=p.velocity.x*dt;this.positions[i*3+1]+=p.velocity.y*dt;this.positions[i*3+2]+=p.velocity.z*dt;
      p.velocity.y+=(p.kind==='spark'?-8:.45)*dt;p.velocity.multiplyScalar(Math.exp(-dt*1.4));
      if(p.kind==='smoke'||p.kind==='dust'){const fade=Math.max(.15,p.life/p.maxLife);this.colors[i*3]*=.995;this.colors[i*3+1]*=.995;this.colors[i*3+2]*=.995*fade+.005*(1-fade);}
    }
    (this.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate=true;(this.points.geometry.attributes.color as THREE.BufferAttribute).needsUpdate=true;
  }
  dispose(){this.scene.remove(this.points);this.points.geometry.dispose();(this.points.material as THREE.Material).dispose();this.marks.forEach(m=>{this.scene.remove(m);(m.material as THREE.Material).dispose();});if(this.marks[0])this.marks[0].geometry.dispose();}
}
