import * as THREE from 'three';
import type { CarSpec, Customization } from '../types';

export interface CarModel {
  group:THREE.Group;
  body:THREE.Group;
  wheels:{steer:THREE.Group;spin:THREE.Group;front:boolean;baseY:number}[];
  brakeMaterials:THREE.MeshStandardMaterial[];
  headlightMaterials:THREE.MeshStandardMaterial[];
  nitroFlames:THREE.Mesh[];
  spoiler:THREE.Group | null;
  underglow:THREE.Mesh | null;
  paint:THREE.MeshStandardMaterial;
  glass:THREE.MeshPhysicalMaterial;
}

const box = (w:number,h:number,d:number,material:THREE.Material) => new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
function mesh(geometry:THREE.BufferGeometry,material:THREE.Material,parent:THREE.Object3D,x=0,y=0,z=0) {
  const item=new THREE.Mesh(geometry,material); item.position.set(x,y,z); item.castShadow=true; item.receiveShadow=true; parent.add(item); return item;
}

function hullGeometry(car:CarSpec) {
  const L=car.length,W=car.width,H=car.height;
  const low=car.body==='hyper'||car.body==='legend';
  const sections = car.body==='hatch'||car.body==='sport-hatch' ? [
    [-.5,.72,.43,.72],[-.4,.94,.3,.88],[-.12,1,.27,.9],[.22,.98,.27,.8],[.43,.85,.32,.63],[.5,.65,.4,.52],
  ] : [
    [-.5,.73,.34,low?.56:.7],[-.4,.96,.25,low?.67:.79],[-.12,1,.23,low?.65:.72],[.22,.97,.25,low?.57:.65],[.43,.83,.3,low?.43:.54],[.5,.62,.37,low?.35:.44],
  ];
  const vertices:number[]=[],indices:number[]=[];
  for(const [zf,wf,bottom,top] of sections){
    const w=W*wf/2,z=zf*L,b=bottom*H,t=top*H;
    const ring=[[-w*.78,b],[w*.78,b],[w,b+H*.08],[w*.94,t-H*.06],[w*.66,t],[-w*.66,t],[-w*.94,t-H*.06],[-w,b+H*.08]];
    ring.forEach(([x,y])=>vertices.push(x,y,z));
  }
  for(let s=0;s<sections.length-1;s++)for(let j=0;j<8;j++){
    const a=s*8+j,b=s*8+(j+1)%8,c=(s+1)*8+(j+1)%8,d=(s+1)*8+j;
    indices.push(a,b,d,b,c,d);
  }
  indices.push(0,7,6,0,6,5,0,5,4,0,4,3,0,3,2,0,2,1);
  const end=(sections.length-1)*8; indices.push(end,end+1,end+2,end,end+2,end+3,end,end+3,end+4,end,end+4,end+5,end,end+5,end+6,end,end+6,end+7);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}

function cabinGeometry(car:CarSpec) {
  const W=car.width,L=car.length,H=car.height;
  const hatch=car.body==='hatch'||car.body==='sport-hatch';
  const muscle=car.body==='muscle';
  const base=H*(hatch?.61:.53), roof=H*.96;
  const zf=L*(hatch?.18:muscle?.15:.12),zr=-L*(hatch?.36:.27);
  const topZf=zf-L*(hatch?.1:.14),topZr=zr+L*(hatch?.06:.1);
  const wb=W*(hatch?.39:.4),wt=W*(hatch?.31:.29);
  const v=[[-wb,base,zr],[wb,base,zr],[wb,base,zf],[-wb,base,zf],[-wt,roof,topZr],[wt,roof,topZr],[wt,roof,topZf],[-wt,roof,topZf]];
  const idx=[0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7,4,5,6,4,6,7];
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v.flat(),3));geo.setIndex(idx);geo.computeVertexNormals();return geo;
}

function createWheel(car:CarSpec,custom:Customization,front:boolean,x:number,z:number) {
  const steer=new THREE.Group(),spin=new THREE.Group();steer.position.set(x,car.wheelRadius,z);steer.add(spin);
  const tireMat=new THREE.MeshStandardMaterial({color:'#101114',roughness:.92,metalness:.02});
  const stockDark=['vortex-compact','thunder-v8','titan-velocity'].includes(car.id);
  const rimColor=custom.wheels==='stock'?(stockDark?'#202328':'#aab0b6'):custom.wheels==='sport'?'#24272c':car.body==='legend'?car.accent:'#69737d';
  const rimMat=new THREE.MeshStandardMaterial({color:rimColor,roughness:.25,metalness:.88});
  const brakeMat=new THREE.MeshStandardMaterial({color:'#4c5158',roughness:.4,metalness:.75});
  const width=car.wheelRadius*(car.body==='muscle'?.75:.62);
  const tireGeo=new THREE.CylinderGeometry(car.wheelRadius,car.wheelRadius,width,18,1);tireGeo.rotateZ(Math.PI/2);
  mesh(tireGeo,tireMat,spin);
  const rimGeo=new THREE.CylinderGeometry(car.wheelRadius*.65,car.wheelRadius*.65,width*1.03,16,1);rimGeo.rotateZ(Math.PI/2);
  mesh(rimGeo,rimMat,spin);
  const discGeo=new THREE.CylinderGeometry(car.wheelRadius*.43,car.wheelRadius*.43,width*1.06,16);discGeo.rotateZ(Math.PI/2);
  mesh(discGeo,brakeMat,spin);
  const spokes=custom.wheels==='turbine'?8:5;
  for(let i=0;i<spokes;i++){
    const spoke=box(width*1.09,car.wheelRadius*.09,car.wheelRadius*.93,rimMat);
    spoke.rotation.x=(i/spokes)*Math.PI*2+(custom.wheels==='turbine'?.22:0);spin.add(spoke);
  }
  return {steer,spin,front,baseY:car.wheelRadius};
}

export function createCarModel(car:CarSpec,custom:Customization,forShowcase=false):CarModel {
  const group=new THREE.Group(),body=new THREE.Group();group.add(body);group.userData.carId=car.id;
  const metallic=custom.finish!=='solid';
  const paint=new THREE.MeshStandardMaterial({color:custom.color||car.color,metalness:metallic?.82:.38,roughness:custom.finish==='pearlescent'?.2:metallic?.28:.4,envMapIntensity:1.05});
  if(custom.finish==='pearlescent'){paint.emissive.set(car.accent);paint.emissiveIntensity=.035;}
  const accent=new THREE.MeshStandardMaterial({color:car.accent,roughness:.3,metalness:.7});
  const dark=new THREE.MeshStandardMaterial({color:'#111419',roughness:.55,metalness:.25});
  const chrome=new THREE.MeshStandardMaterial({color:'#aab5bf',roughness:.2,metalness:.92});
  const glass=new THREE.MeshPhysicalMaterial({color:new THREE.Color().setHSL(.56,.25,.12+custom.tint*.08),roughness:.12,metalness:.15,transparent:true,opacity:.58+custom.tint*.28,depthWrite:true});
  const interior=new THREE.MeshStandardMaterial({color:'#20242a',roughness:.88});
  const lamp=new THREE.MeshStandardMaterial({color:'#e8f4ff',emissive:'#bfe5ff',emissiveIntensity:.65,roughness:.2});
  const tail=new THREE.MeshStandardMaterial({color:'#9f101b',emissive:'#ff182c',emissiveIntensity:.35,roughness:.28});
  const hull=mesh(hullGeometry(car),paint,body);hull.castShadow=true;
  // Interior is physically inside the transparent cabin.
  const seatZ=-car.length*.08;
  for(const x of [-car.width*.22,car.width*.22]){
    const seat=box(car.width*.24,car.height*.3,car.length*.17,interior);seat.position.set(x,car.height*.59,seatZ);seat.rotation.x=-.12;body.add(seat);
    const head=box(car.width*.18,car.height*.14,car.length*.07,interior);head.position.set(x,car.height*.79,seatZ-.04);body.add(head);
  }
  const dash=box(car.width*.67,car.height*.1,car.length*.12,dark);dash.position.set(0,car.height*.62,car.length*.14);body.add(dash);
  mesh(cabinGeometry(car),glass,body);
  const hatch=car.body==='hatch'||car.body==='sport-hatch';
  const roof=box(car.width*(hatch?.64:.58),car.height*.045,car.length*(hatch?.35:.25),paint);roof.position.set(0,car.height*.955,-car.length*(hatch?.1:.07));body.add(roof);
  // Pillars, hood and side skirts give the silhouette a manufactured structure.
  for(const x of [-car.width*.36,car.width*.36]){
    const pillar=box(car.width*.045,car.height*.36,car.length*.045,accent);pillar.position.set(x,car.height*.75,car.length*.07);pillar.rotation.x=-.42;body.add(pillar);
    const skirt=box(car.width*.055,car.height*.1,car.length*.52,dark);skirt.position.set(x>0?car.width*.48:-car.width*.48,car.height*.29,-car.length*.04);body.add(skirt);
    const mirror=box(car.width*.13,car.height*.085,car.length*.09,paint);mirror.position.set(x>0?car.width*.55:-car.width*.55,car.height*.68,car.length*.12);body.add(mirror);
  }
  const hood=box(car.width*.72,car.height*.035,car.length*.28,paint);hood.position.set(0,car.height*(hatch?.65:.49),car.length*.32);hood.rotation.x=car.body==='muscle'?-.04:-.09;body.add(hood);
  if(car.body==='muscle'){
    const scoop=box(car.width*.3,car.height*.1,car.length*.2,dark);scoop.position.set(0,car.height*.58,car.length*.29);body.add(scoop);
  }
  // Bumpers, grille, intakes and plates.
  for(const zSign of [-1,1]){
    const bumper=box(car.width*.78,car.height*.11,car.length*.045,dark);bumper.position.set(0,car.height*.34,zSign*car.length*.493);body.add(bumper);
  }
  const grille=box(car.width*(car.body==='muscle'?.58:.42),car.height*.12,car.length*.018,dark);grille.position.set(0,car.height*.4,car.length*.508);body.add(grille);
  for(let i=-2;i<=2;i++){const slat=box(car.width*.012,car.height*.1,car.length*.022,chrome);slat.position.set(i*car.width*.065,car.height*.4,car.length*.515);body.add(slat);}
  const plateMat=new THREE.MeshStandardMaterial({color:'#e8e5cf',roughness:.65});
  for(const zSign of [-1,1]){const plate=box(car.width*.23,car.height*.085,.018,plateMat);plate.position.set(0,car.height*.3,zSign*car.length*.52);body.add(plate);}
  if(['super','hyper','legend'].includes(car.body)||car.id==='inferno-r'){
    for(const x of [-car.width*.49,car.width*.49]){const intake=box(car.width*.045,car.height*.16,car.length*.25,dark);intake.position.set(x,car.height*.43,-car.length*.08);intake.rotation.z=x>0?-.15:.15;body.add(intake);}
    const diffuser=box(car.width*.72,car.height*.1,car.length*.14,dark);diffuser.position.set(0,car.height*.24,-car.length*.45);body.add(diffuser);
  }
  const brakeMaterials:THREE.MeshStandardMaterial[]=[],headlightMaterials:THREE.MeshStandardMaterial[]=[];
  for(const x of [-car.width*.29,car.width*.29]){
    const head=hatch?new THREE.Mesh(new THREE.SphereGeometry(car.height*.075,10,7),lamp):box(car.width*.23,car.height*.075,car.length*.025,lamp);
    if(hatch)head.scale.set(car.width*1.25,.65,.4);head.position.set(x,car.height*.48,car.length*.501);head.rotation.z=x>0?-.09:.09;body.add(head);headlightMaterials.push(lamp);
    const rear=box(car.width*.2,car.height*.065,car.length*.024,tail);rear.position.set(x,car.height*.46,-car.length*.501);body.add(rear);brakeMaterials.push(tail);
  }
  const nitroFlames:THREE.Mesh[]=[];
  for(const x of [-car.width*.23,car.width*.23]){
    const exhaustGeo=new THREE.CylinderGeometry(car.height*.035,car.height*.035,car.length*.09,10);exhaustGeo.rotateX(Math.PI/2);
    mesh(exhaustGeo,chrome,body,x,car.height*.25,-car.length*.51);
    const flameMat=new THREE.MeshBasicMaterial({color:car.nitro>=6?'#b668ff':'#42cfff',transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false});
    const flame=new THREE.Mesh(new THREE.ConeGeometry(car.height*.055,car.length*.25,8),flameMat);flame.rotation.x=-Math.PI/2;flame.position.set(x,car.height*.25,-car.length*.62);flame.visible=false;body.add(flame);nitroFlames.push(flame);
  }
  let spoiler:THREE.Group|null=null;
  const stockWing=['super','hyper','legend'].includes(car.body)||['falcon-rs','inferno-r'].includes(car.id);
  if(custom.spoiler&&stockWing){
    spoiler=new THREE.Group();const large=car.body==='legend'||car.id==='apex-zero';
    for(const x of [-car.width*.28,car.width*.28]){const support=box(car.width*.035,car.height*(large?.24:.15),car.length*.035,dark);support.position.set(x,car.height*(large?.7:.63),-car.length*.38);spoiler.add(support);}
    const wing=box(car.width*(large?.93:.76),car.height*.045,car.length*(large?.15:.11),car.body==='legend'?accent:dark);wing.position.set(0,car.height*(large?.82:.71),-car.length*.39);spoiler.add(wing);body.add(spoiler);
  }
  if(custom.decal==='stripes'){
    for(const x of [-car.width*.08,car.width*.08]){const stripe=box(car.width*.075,.012,car.length*.78,accent);stripe.position.set(x,car.height*.68,0);body.add(stripe);}
  } else if(custom.decal==='side'){
    for(const x of [-car.width*.505,car.width*.505]){const stripe=box(.012,car.height*.07,car.length*.58,accent);stripe.position.set(x,car.height*.42,0);body.add(stripe);}
  } else if(custom.decal==='number'){
    const roundelMat=new THREE.MeshStandardMaterial({color:'#f4f1e8',roughness:.5});
    const roundel=new THREE.Mesh(new THREE.CylinderGeometry(car.height*.12,car.height*.12,.012,20),roundelMat);roundel.rotation.z=Math.PI/2;roundel.position.set(car.width*.505,car.height*.48,0);body.add(roundel);
  }
  if(car.id==='nebula-x'){
    const glow=new THREE.MeshStandardMaterial({color:car.accent,emissive:car.accent,emissiveIntensity:.7,roughness:.25});
    for(const x of [-car.width*.48,car.width*.48]){const strip=box(.025,.025,car.length*.62,glow);strip.position.set(x,car.height*.35,0);body.add(strip);}
  }
  let underglow:THREE.Mesh|null=null;
  if(custom.neon!=='off'||car.body==='legend'){
    const color=custom.neon==='off'?car.accent:custom.neon==='cyan'?'#20d9ff':custom.neon==='magenta'?'#ed42e8':custom.neon==='gold'?'#ffc64a':'#20d9ff';
    underglow=new THREE.Mesh(new THREE.PlaneGeometry(car.width*1.05,car.length*.83),new THREE.MeshBasicMaterial({color,transparent:true,opacity:car.body==='legend'?.24:.18,blending:THREE.AdditiveBlending,depthWrite:false}));
    underglow.rotation.x=-Math.PI/2;underglow.position.y=.055;group.add(underglow);
    if(car.body==='legend'){
      for(const x of [-car.width*.48,car.width*.48]){const strip=box(.025,.025,car.length*.58,new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.55}));strip.position.set(x,car.height*.32,0);body.add(strip);}
    }
  }
  const wheels=[] as CarModel['wheels'];
  const axle=car.length*(hatch?.32:.33),track=car.width*.49;
  for(const z of [axle,-axle])for(const x of [-track,track]){const wheel=createWheel(car,custom,z>0,x,z);group.add(wheel.steer);wheels.push(wheel);}
  if(forShowcase) group.traverse(obj=>{if(obj instanceof THREE.Mesh){obj.castShadow=true;obj.receiveShadow=true;}});
  return {group,body,wheels,brakeMaterials,headlightMaterials,nitroFlames,spoiler,underglow,paint,glass};
}

export function updateCarVisual(model:CarModel,dt:number,data:{speed:number;steer:number;braking:boolean;nitro:boolean;night:boolean;accel?:number}) {
  const spin=data.speed/Math.max(.2,model.wheels[0].baseY)*dt;
  model.wheels.forEach((wheel,i)=>{
    wheel.spin.rotation.x+=spin;
    if(wheel.front)wheel.steer.rotation.y=THREE.MathUtils.lerp(wheel.steer.rotation.y,data.steer*.42,Math.min(1,dt*12));
    wheel.steer.position.y=wheel.baseY+Math.sin(performance.now()*.006+i*1.7)*Math.min(.012,Math.abs(data.speed)*.0005);
  });
  model.body.rotation.z=THREE.MathUtils.lerp(model.body.rotation.z,-data.steer*Math.min(.045,Math.abs(data.speed)*.0015),Math.min(1,dt*5));
  model.body.rotation.x=THREE.MathUtils.lerp(model.body.rotation.x,THREE.MathUtils.clamp(-(data.accel??0)*.0025,-.025,.025),Math.min(1,dt*5));
  model.brakeMaterials.forEach(mat=>mat.emissiveIntensity=data.braking?2.1:.35);
  model.headlightMaterials.forEach(mat=>mat.emissiveIntensity=data.night?1.6:.55);
  model.nitroFlames.forEach((flame,i)=>{flame.visible=data.nitro;if(data.nitro){const pulse=.8+Math.random()*.5;flame.scale.set(pulse,pulse,1);flame.position.z+=Math.sin(performance.now()*.03+i)*.0005;}});
  if(model.spoiler&&model.group.userData.carId==='solaris-omega')model.spoiler.rotation.x=THREE.MathUtils.lerp(model.spoiler.rotation.x,Math.min(.18,Math.abs(data.speed)*.0015),dt*3);
}
