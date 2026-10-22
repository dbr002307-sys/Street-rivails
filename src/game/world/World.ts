import * as THREE from 'three';
import { getCar, getCustomization } from '../data/cars';
import { POIS, RACES, RIVALS } from '../data/races';
import type { GameSettings, Vec2 } from '../types';
import { createCarModel } from './CarModel';

export interface Collider { minX:number;maxX:number;minZ:number;maxZ:number;kind:string }
interface RoadRect {x:number;z:number;w:number;d:number}
interface RoadPath {points:Vec2[];width:number;closed:boolean}
export const MAP_ROADS:RoadRect[] = [
  {x:0,z:0,w:34,d:1400},{x:0,z:-500,w:1320,d:22},{x:0,z:-200,w:1320,d:24},{x:0,z:100,w:1320,d:24},{x:0,z:400,w:1320,d:22},{x:0,z:650,w:1320,d:20},
  {x:-520,z:0,w:20,d:1300},{x:-280,z:0,w:20,d:1300},{x:280,z:0,w:20,d:1300},{x:520,z:0,w:32,d:1400},
];

const seeded = (()=>{let s=93731;return()=>{s=(s*16807)%2147483647;return(s-1)/2147483646;};})();
const v3=(p:Vec2,y=0)=>new THREE.Vector3(p.x,y,p.z);

export class World {
  group=new THREE.Group();
  colliders:Collider[]=[];
  cameraBlockers:THREE.Object3D[]=[];
  private grid=new Map<string,Collider[]>();
  private cell=60;
  private markers:{group:THREE.Group;id:string;x:number;z:number}[]=[];
  private parked:THREE.Object3D[]=[];
  private windowMaterials:THREE.MeshStandardMaterial[]=[];
  private sun:THREE.DirectionalLight;
  private hemi:THREE.HemisphereLight;
  private sky:THREE.Mesh<THREE.SphereGeometry,THREE.ShaderMaterial>;
  private rain:THREE.Points;
  private rainPositions:Float32Array;
  private paths:RoadPath[]=[];
  settings:GameSettings;

  constructor(private scene:THREE.Scene,settings:GameSettings){
    this.settings=settings;scene.add(this.group);
    this.hemi=new THREE.HemisphereLight('#ffdcb0','#34463c',1.65);scene.add(this.hemi);
    this.sun=new THREE.DirectionalLight('#ffd0a1',2.25);this.sun.position.set(-180,260,-140);this.sun.castShadow=true;
    this.sun.shadow.mapSize.set(1024,1024);this.sun.shadow.camera.left=-85;this.sun.shadow.camera.right=85;this.sun.shadow.camera.top=85;this.sun.shadow.camera.bottom=-85;this.sun.shadow.camera.near=10;this.sun.shadow.camera.far=600;this.sun.shadow.bias=-.0008;scene.add(this.sun,this.sun.target);
    const skyGeo=new THREE.SphereGeometry(1100,20,12);
    const skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{top:{value:new THREE.Color('#526287')},bottom:{value:new THREE.Color('#f4a261')},offset:{value:30},exponent:{value:.75}},vertexShader:'varying vec3 vWorld; void main(){vec4 w=modelMatrix*vec4(position,1.0);vWorld=w.xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform vec3 top;uniform vec3 bottom;uniform float offset;uniform float exponent;varying vec3 vWorld;void main(){float h=normalize(vWorld+vec3(0.0,offset,0.0)).y;gl_FragColor=vec4(mix(bottom,top,max(pow(max(h,0.0),exponent),0.0)),1.0);}'});
    this.sky=new THREE.Mesh(skyGeo,skyMat);scene.add(this.sky);
    const sunDisc=new THREE.Mesh(new THREE.SphereGeometry(24,12,8),new THREE.MeshBasicMaterial({color:'#ffd39a',fog:false}));sunDisc.position.set(-600,180,-780);scene.add(sunDisc);
    this.buildGround();this.buildRoads();this.buildCity();this.buildIndustrial();this.buildCircuitAndMountains();this.buildFacilities();this.buildTunnel();this.buildProps();this.buildMarkers();this.buildParkedCars();
    const count=settings.quality==='low'?220:500;this.rainPositions=new Float32Array(count*3);
    for(let i=0;i<count;i++){this.rainPositions[i*3]=(seeded()-.5)*120;this.rainPositions[i*3+1]=seeded()*45;this.rainPositions[i*3+2]=(seeded()-.5)*120;}
    const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(this.rainPositions,3));
    this.rain=new THREE.Points(rainGeo,new THREE.PointsMaterial({color:'#b7d9ed',size:.09,transparent:true,opacity:.48,depthWrite:false}));scene.add(this.rain);
    this.setEnvironment(settings);
  }

  private material(color:string,roughness=.8,metalness=.05){return new THREE.MeshStandardMaterial({color,roughness,metalness});}
  private addBox(x:number,y:number,z:number,w:number,h:number,d:number,mat:THREE.Material,parent:THREE.Object3D=this.group,shadow=true){
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;parent.add(m);return m;
  }
  private addCollider(x:number,z:number,w:number,d:number,kind='solid'){
    const c={minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,kind};this.colliders.push(c);
    const a=Math.floor(c.minX/this.cell),b=Math.floor(c.maxX/this.cell),e=Math.floor(c.minZ/this.cell),f=Math.floor(c.maxZ/this.cell);
    for(let i=a;i<=b;i++)for(let j=e;j<=f;j++){const key=`${i},${j}`;if(!this.grid.has(key))this.grid.set(key,[]);this.grid.get(key)!.push(c);}
  }
  queryColliders(x:number,z:number,r=3){
    const result=new Set<Collider>();const a=Math.floor((x-r)/this.cell),b=Math.floor((x+r)/this.cell),c=Math.floor((z-r)/this.cell),d=Math.floor((z+r)/this.cell);
    for(let i=a;i<=b;i++)for(let j=c;j<=d;j++)for(const item of this.grid.get(`${i},${j}`)??[])result.add(item);return result;
  }

  private buildGround(){
    const ground=this.addBox(0,-.16,0,1500,.3,1500,this.material('#537a50',1),this.group,false);ground.receiveShadow=true;
    this.addBox(-430,-.005,-410,530,.025,540,this.material('#826f52',1),this.group,false);
    this.addBox(0,-.002,280,570,.02,720,this.material('#77776e',1),this.group,false);
    this.addBox(460,-.001,390,420,.02,600,this.material('#5d704b',1),this.group,false);
    // Physical and visual perimeter: no vehicle can leave the 1.5 km square.
    const wall=this.material('#80776b',.9);
    for(const [x,z,w,d] of [[0,-748,1500,4],[0,748,1500,4],[-748,0,4,1500],[748,0,4,1500]] as const){this.addBox(x,1,z,w,2,d,wall);this.addCollider(x,z,w,d,'barrier');}
  }

  private buildRoads(){
    const asphalt=this.material('#292e33',.94);const lineMat=this.material('#e9e4cf',.8);const yellow=this.material('#e5b94d',.8);
    const dashes:THREE.Matrix4[]=[],cross:THREE.Matrix4[]=[];const dummy=new THREE.Object3D();
    for(const r of MAP_ROADS){
      this.addBox(r.x,.015,r.z,r.w,.04,r.d,asphalt,this.group,false);
      const vertical=r.d>r.w,length=vertical?r.d:r.w;
      for(let p=-length/2+8;p<length/2-5;p+=13){
        dummy.position.set(vertical?r.x:r.x+p,.045,vertical?r.z+p:r.z);dummy.rotation.y=vertical?0:Math.PI/2;dummy.scale.set(1,1,1);dummy.updateMatrix();dashes.push(dummy.matrix.clone());
      }
      if(r.w>=30){
        for(const offset of [-r.w*.25,r.w*.25])for(let p=-length/2;p<length/2;p+=8){
          dummy.position.set(vertical?r.x+offset:r.x+p,.043,vertical?r.z+p:r.z+offset);dummy.rotation.y=vertical?0:Math.PI/2;dummy.updateMatrix();dashes.push(dummy.matrix.clone());
        }
      }
    }
    const dashGeo=new THREE.BoxGeometry(.2,.018,4.2);const inst=new THREE.InstancedMesh(dashGeo,yellow,dashes.length);dashes.forEach((m,i)=>inst.setMatrixAt(i,m));inst.receiveShadow=true;this.group.add(inst);
    for(const z of [-200,100,400])for(const x of [0,280,-280,520])for(let i=-3;i<=3;i++){
      dummy.position.set(x+i*1.5,.052,z+9);dummy.rotation.y=0;dummy.updateMatrix();cross.push(dummy.matrix.clone());
    }
    const crossInst=new THREE.InstancedMesh(new THREE.BoxGeometry(.85,.02,5),lineMat,cross.length);cross.forEach((m,i)=>crossInst.setMatrixAt(i,m));this.group.add(crossInst);
    // Drag strip connects directly to the industrial east-west roads.
    this.addBox(-430,.018,-410,20,.045,420,asphalt,this.group,false);
    for(let z=-600;z<-230;z+=12)this.addBox(-430,.047,z,.18,.018,4,lineMat,this.group,false);
    for(let i=-4;i<=4;i++)this.addBox(-430+i*2,.055,-235,1,.02,2,i%2?lineMat:yellow,this.group,false);
    this.paths.push({points:[{x:-430,z:-610},{x:-430,z:-230}],width:20,closed:false});
  }

  private windowTexture(){
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d')!;
    ctx.fillStyle='#424b53';ctx.fillRect(0,0,128,128);
    for(let y=8;y<128;y+=20)for(let x=8;x<128;x+=20){const lit=seeded()>.55;ctx.fillStyle=lit?'#d7ad73':'#26343f';ctx.fillRect(x,y,11,10);ctx.fillStyle='rgba(255,255,255,.09)';ctx.fillRect(x,y,11,2);}
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.anisotropy=2;return tex;
  }
  private buildCity(){
    const tex=this.windowTexture();const colors=['#75808a','#6b737d','#8b8178','#5d6c79','#777382'];
    const mats=colors.map(color=>{const m=new THREE.MeshStandardMaterial({color,map:tex,roughness:.72,metalness:.12,emissive:'#9b6738',emissiveMap:tex,emissiveIntensity:.1});this.windowMaterials.push(m);return m;});
    for(let x=-235;x<=235;x+=67)for(let z=-455;z<=610;z+=72){
      if(MAP_ROADS.some(r=>Math.abs(x-r.x)<r.w/2+25&&Math.abs(z-r.z)<r.d/2+25))continue;
      if(Math.abs(x)<155&&z>-145&&z<135)continue;
      if(x<-250&&z>110)continue;
      const w=30+seeded()*18,d=30+seeded()*18,h=18+seeded()*75;
      const building=this.addBox(x,h/2,z,w,h,d,mats[Math.floor(seeded()*mats.length)]);this.cameraBlockers.push(building);this.addCollider(x,z,w,d,'building');
      this.addBox(x,h+1,z,w*.32,2,d*.28,this.material('#3e464b',.85));
      if(h>55){const antenna=this.addBox(x,h+7,z,.35,12,.35,this.material('#41464a',.5,.7));antenna.castShadow=false;}
    }
    // Sidewalk blocks make the city feel constructed rather than scattered boxes.
    const sidewalk=this.material('#9a968b',.95);
    for(const [x,z] of [[-190,-115],[190,-115],[-190,195],[190,195],[-190,495],[190,495]] as const)this.addBox(x,.06,z,45,.12,45,sidewalk,this.group,false);
  }

  private buildIndustrial(){
    const metal=this.material('#66727a',.75,.35),roof=this.material('#3f4a50',.65,.45);
    for(const [x,z,w,d] of [[-610,-350,100,75],[-350,-350,90,70],[-600,-590,85,65],[-300,-590,100,60]]){
      this.addBox(x,7,z,w,14,d,metal);this.addBox(x,14.4,z,w+2,.8,d+2,roof);this.addCollider(x,z,w,d,'warehouse');this.cameraBlockers.push(this.group.children[this.group.children.length-2]);
      for(let i=-1;i<=1;i++)this.addBox(x+i*w*.25,3,z+d/2+.1,w*.17,6,.3,this.material('#28333b',.7,.4));
    }
    const containerColors=['#a84b3c','#386778','#b78b36','#526c4b'];
    for(let i=0;i<28;i++){
      const x=-670+(i%7)*35,z=-265-Math.floor(i/7)*24,y=i%5===0?2.6:1.3;
      const c=this.addBox(x,y,z,12,2.6,5.5,this.material(containerColors[i%4],.72,.35));this.addCollider(x,z,12,5.5,'container');
      for(let k=-4;k<=4;k+=2)this.addBox(x+k,y,z+2.78,.08,2.25,.06,roof,this.group,false);c.castShadow=true;
    }
    // Fuel storage tanks and pipes.
    for(const x of [-640,-590]){const tank=new THREE.Mesh(new THREE.CylinderGeometry(13,13,16,16),metal);tank.position.set(x,8,-690);tank.castShadow=true;this.group.add(tank);this.addCollider(x,-690,25,25,'tank');}
  }

  private ribbon(points:Vec2[],width:number,closed:boolean,color='#2c3136'){
    const curve=new THREE.CatmullRomCurve3(points.map(p=>v3(p,.035)),closed,'catmullrom',.35);const segments=closed?180:100;
    const verts:number[]=[],idx:number[]=[];
    for(let i=0;i<=segments;i++){
      const t=i/segments,p=curve.getPoint(t),tan=curve.getTangent(t),side=new THREE.Vector3(-tan.z,0,tan.x).normalize().multiplyScalar(width/2);
      verts.push(p.x+side.x,p.y,p.z+side.z,p.x-side.x,p.y,p.z-side.z);
      if(i<segments){const a=i*2;idx.push(a,a+2,a+1,a+2,a+3,a+1);}
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(idx);geo.computeVertexNormals();const road=new THREE.Mesh(geo,this.material(color,.95));road.receiveShadow=true;this.group.add(road);
    this.paths.push({points,width,closed});
    return curve;
  }
  private buildCircuitAndMountains(){
    const circuit=RACES.find(r=>r.id==='sunset-circuit')!.path,mountain=RACES.find(r=>r.id==='mountain-run')!.path;
    const curve=this.ribbon(circuit,16,true);this.ribbon(mountain,15,false,'#35383a');
    const curbMats=[this.material('#d04a3f',.85),this.material('#e6e0cf',.85)];const dummy=new THREE.Object3D();
    for(let side of [-1,1])for(let color=0;color<2;color++){
      const matrices:THREE.Matrix4[]=[];for(let i=color;i<90;i+=2){const t=i/90,p=curve.getPoint(t),tan=curve.getTangent(t),normal=new THREE.Vector3(-tan.z,0,tan.x);p.addScaledVector(normal,side*8.15);dummy.position.set(p.x,.08,p.z);dummy.rotation.y=Math.atan2(tan.x,tan.z);dummy.updateMatrix();matrices.push(dummy.matrix.clone());}
      const inst=new THREE.InstancedMesh(new THREE.BoxGeometry(.65,.12,5),curbMats[color],matrices.length);matrices.forEach((m,i)=>inst.setMatrixAt(i,m));this.group.add(inst);
    }
    // Mountain rock formations stay outside the drivable ribbon.
    for(let i=0;i<18;i++){
      const x=330+seeded()*350,z=150+seeded()*520;
      if(this.distanceToPath({x,z},{points:mountain,width:15,closed:false})<65)continue;
      const radius=25+seeded()*40,h=25+seeded()*65;const rock=new THREE.Mesh(new THREE.ConeGeometry(radius,h,7),this.material(i%2?'#59624c':'#6c6b58',1));rock.position.set(x,h/2-.2,z);rock.rotation.y=seeded()*3;rock.castShadow=true;rock.receiveShadow=true;this.group.add(rock);this.addCollider(x,z,radius*1.25,radius*1.25,'rock');this.cameraBlockers.push(rock);
    }
    // Mountain guard rails: visible and physical, sampled along the outside of bends.
    const railMat=this.material('#a5a9a7',.45,.65);
    for(let i=4;i<mountain.length-1;i++){
      const a=mountain[i],b=mountain[i+1],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len;
      for(const side of [-1,1]){const x=(a.x+b.x)/2+nx*side*8.3,z=(a.z+b.z)/2+nz*side*8.3;const rail=this.addBox(x,.75,z,.25,.55,len,railMat);rail.rotation.y=Math.atan2(dx,dz);for(let d=0;d<=len;d+=5){const t=d/len;this.addCollider(a.x+dx*t+nx*side*8.3,a.z+dz*t+nz*side*8.3,3.2,3.2,'rail');}}
    }
  }

  private buildFacilities(){
    const wall=this.material('#d6d0c2',.82),dark=this.material('#26313a',.6,.3),glass=new THREE.MeshPhysicalMaterial({color:'#7297a8',transparent:true,opacity:.55,roughness:.15,metalness:.25});
    const building=(x:number,z:number,w:number,d:number,h:number,color?:string)=>{const mat=color?this.material(color,.7,.2):wall;const b=this.addBox(x,h/2,z,w,h,d,mat);this.addCollider(x,z,w,d,'building');this.cameraBlockers.push(b);this.addBox(x,h+.3,z,w+1,.6,d+1,dark);return b;};
    building(-125,-85,45,35,8,'#394853');building(135,-85,65,40,10,'#c5c5bc');building(-135,65,50,36,8,'#a34b3d');
    // Glass showroom and illuminated dealer sign.
    this.addBox(102,4,-85,.25,7,30,glass);this.addBox(135,12,-85,38,2,1,dark);
    // Safe central plaza, parking marks and fuel station.
    this.addBox(-110,.025,245,70,.05,55,this.material('#3a3e42',.95),this.group,false);
    for(let i=0;i<7;i++)for(const z of [230,260])this.addBox(-137+i*9,.06,z,.16,.02,12,this.material('#ddd8c7'),this.group,false);
    this.addBox(110,5.5,245,48,.7,30,this.material('#e5ded0',.6));for(const x of [92,128])for(const z of [235,255])this.addBox(x,2.7,z,.6,5.4,.6,dark);
    for(const x of [100,120]){this.addBox(x,1,245,1.3,2,1,this.material('#d7503f',.6));this.addCollider(x,245,1.5,1.5,'pump');}
    // Start/finish gantry on the drag strip.
    for(const x of [-441,-419])this.addBox(x,3.5,-230,.45,7,.45,dark);this.addBox(-430,7,-230,23,.8,.6,dark);
  }

  private buildTunnel(){
    const concrete=this.material('#4e5255',.9),light=new THREE.MeshStandardMaterial({color:'#ffe0a3',emissive:'#ffd391',emissiveIntensity:.75});
    for(const x of [500,540]){const wall=this.addBox(x,4.5,270,3,9,110,concrete);this.addCollider(x,270,3,110,'tunnel');this.cameraBlockers.push(wall);}
    const roof=this.addBox(520,9,270,43,2,110,concrete);this.cameraBlockers.push(roof);
    for(let z=225;z<=315;z+=15){this.addBox(505,8.15,z,5,.15,.5,light,this.group,false);this.addBox(535,8.15,z,5,.15,.5,light,this.group,false);}
  }

  private buildProps(){
    const trunk=this.material('#574733',1),leaf=this.material('#365f3c',.95),pole=this.material('#343b40',.55,.65);
    const treePositions:{x:number;z:number;s:number}[]=[];
    for(let i=0;i<150;i++){
      const x=(seeded()-.5)*1380,z=(seeded()-.5)*1380;if(this.surfaceAt(x,z)==='asphalt')continue;
      if(Math.abs(x)<180&&Math.abs(z)<150)continue;if(x<-250&&z<-180)continue;
      treePositions.push({x,z,s:.8+seeded()*.6});
    }
    const dummy=new THREE.Object3D();const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.35,.5,4,6),trunk,treePositions.length),crowns=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.5,0),leaf,treePositions.length);
    treePositions.forEach((p,i)=>{dummy.position.set(p.x,2*p.s,p.z);dummy.scale.set(p.s,p.s,p.s);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);dummy.position.y=5*p.s;dummy.rotation.y=seeded()*3;dummy.updateMatrix();crowns.setMatrixAt(i,dummy.matrix);if(i%3===0)this.addCollider(p.x,p.z,1.3,1.3,'tree');});trunks.castShadow=crowns.castShadow=true;this.group.add(trunks,crowns);
    // Lamps and traffic lights at connected intersections.
    for(const z of [-450,-150,150,350,600])for(const x of [-22,22]){
      this.addBox(x,3.5,z,.18,7,.18,pole);this.addBox(x+(x<0?1:-1),7,z,2.2,.15,.15,pole);
      const lamp=new THREE.MeshStandardMaterial({color:'#ffe5b0',emissive:'#ffc875',emissiveIntensity:.55});this.addBox(x+(x<0?2:-2),6.9,z,.8,.18,.45,lamp,this.group,false);
    }
    for(const z of [-200,100,400])for(const x of [-17,17]){
      this.addBox(x,2.5,z+12,.22,5,.22,pole);this.addBox(x,4.6,z+12,.65,1.5,.55,pole);
      for(let i=0;i<3;i++){const colors=['#ed3b38','#e4b73c','#4bba68'];const mat=new THREE.MeshStandardMaterial({color:colors[i],emissive:colors[i],emissiveIntensity:i===(z===100?2:0)?.65:.04});const lamp=new THREE.Mesh(new THREE.SphereGeometry(.16,8,6),mat);lamp.position.set(x,5.08-i*.45,z+11.7);this.group.add(lamp);}
    }
    // Speed-limit and stop signs at principal approaches.
    const signMat=this.material('#c9433c',.55,.15),signFace=this.material('#eee9dc',.7);
    for(const [x,z] of [[20,-170],[-20,130],[300,380],[500,-180],[-300,-480],[500,620]] as const){
      this.addBox(x,1.4,z,.12,2.8,.12,pole);const sign=new THREE.Mesh(new THREE.CircleGeometry(.68,16),signMat);sign.position.set(x,2.8,z);this.group.add(sign);const inner=new THREE.Mesh(new THREE.CircleGeometry(.48,16),signFace);inner.position.set(x,2.8,z+.012);this.group.add(inner);
    }
    // Fences and traffic barriers in the industrial district.
    for(let i=0;i<12;i++){const b=this.addBox(-270-i*10,.55,-675,8,1.1,.7,this.material(i%2?'#e5ddd0':'#d96b45',.8));this.addCollider(-270-i*10,-675,8,.7,'barrier');b.castShadow=true;}
  }

  private makeLabel(text:string,color:string){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const ctx=canvas.getContext('2d')!;ctx.fillStyle='rgba(9,13,20,.82)';ctx.roundRect(4,4,504,88,22);ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=4;ctx.stroke();ctx.font='700 31px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.fillText(text.toUpperCase(),256,49);
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));sprite.scale.set(18,3.4,1);return sprite;
  }
  private buildMarkers(){
    for(const poi of POIS){
      if(poi.kind==='discovery')continue;const color=poi.kind==='race'?'#ff5a42':poi.kind==='shop'?'#ffd25e':poi.kind==='workshop'?'#58d6ff':'#75edc1';
      const group=new THREE.Group();group.position.set(poi.x,.08,poi.z);
      const ring=new THREE.Mesh(new THREE.RingGeometry(4.2,4.65,32),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.75,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;group.add(ring);
      const beam=new THREE.Mesh(new THREE.CylinderGeometry(.15,.6,5,12,1,true),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.15,depthWrite:false,side:THREE.DoubleSide}));beam.position.y=2.5;group.add(beam);
      const label=this.makeLabel(poi.name,color);label.position.y=6.5;group.add(label);this.group.add(group);this.markers.push({group,id:poi.eventId??poi.id,x:poi.x,z:poi.z});
    }
  }
  private buildParkedCars(){
    const parked=[{id:'vortex-compact',x:115,z:-60,h:Math.PI},{id:'tempest-x',x:140,z:-60,h:Math.PI},{id:'phantom-gt',x:-105,z:245,h:Math.PI/2}];
    for(const p of parked){const car=getCar(p.id),model=createCarModel(car,getCustomization(car.id));model.group.position.set(p.x,.04,p.z);model.group.rotation.y=p.h;model.group.traverse(o=>{if(o instanceof THREE.Mesh)o.castShadow=false;});this.group.add(model.group);this.parked.push(model.group);}
    const rivalSpots:Record<string,{x:number;z:number;heading:number}>={alex:{x:12,z:-190,heading:Math.PI},maya:{x:-268,z:-188,heading:Math.PI},bruno:{x:-418,z:-596,heading:Math.PI},raven:{x:-572,z:180,heading:1.2},viper:{x:507,z:-590,heading:0},zero:{x:12,z:390,heading:Math.PI}};
    for(const rival of RIVALS){
      const spot=rivalSpots[rival.id],car=getCar(rival.carId),model=createCarModel(car,getCustomization(car.id,{color:rival.color,finish:'metallic'}));
      model.group.position.set(spot.x,.04,spot.z);model.group.rotation.y=spot.heading;model.group.traverse(o=>{if(o instanceof THREE.Mesh)o.castShadow=false;});this.group.add(model.group);this.parked.push(model.group);
      const label=this.makeLabel(rival.name,rival.color);label.position.set(spot.x,3.2,spot.z);label.scale.set(9,1.7,1);this.group.add(label);this.parked.push(label);
    }
  }

  private distanceToPath(p:Vec2,path:RoadPath){
    let best=Infinity;const count=path.points.length;
    for(let i=0;i<(path.closed?count:count-1);i++){
      const a=path.points[i],b=path.points[(i+1)%count],dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz;
      const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/l2));best=Math.min(best,Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz)-path.width/2);
    }return best;
  }
  setParkedVisible(visible:boolean){this.parked.forEach(object=>object.visible=visible);}
  surfaceAt(x:number,z:number):'asphalt'|'grass'|'dirt'{
    for(const r of MAP_ROADS)if(Math.abs(x-r.x)<=r.w/2&&Math.abs(z-r.z)<=r.d/2)return'asphalt';
    if(x>=-440&&x<=-420&&z>=-620&&z<=-200)return'asphalt';
    for(const path of this.paths)if(this.distanceToPath({x,z},path)<=0)return'asphalt';
    if(Math.abs(x)<38&&z>230&&z<275)return'asphalt';
    if(x<-270&&z<-210)return'dirt';return'grass';
  }
  nearestPOI(x:number,z:number){
    let nearest:null|{id:string;name:string;kind:string;eventId?:string;distance:number}=null;
    for(const poi of POIS){const distance=Math.hypot(x-poi.x,z-poi.z);if(distance<24&&(!nearest||distance<nearest.distance))nearest={id:poi.id,name:poi.name,kind:poi.kind,eventId:poi.eventId,distance};}
    return nearest;
  }
  update(dt:number,player:THREE.Vector3){
    this.sky.position.copy(player);this.sun.position.set(player.x-180,260,player.z-140);this.sun.target.position.copy(player);this.sun.target.updateMatrixWorld();
    for(const marker of this.markers){marker.group.rotation.y+=dt*.35;const dist=Math.hypot(player.x-marker.x,player.z-marker.z);marker.group.visible=dist<260;}
    if(this.rain.visible){
      this.rain.position.set(player.x,0,player.z);for(let i=0;i<this.rainPositions.length/3;i++){this.rainPositions[i*3+1]-=dt*38;if(this.rainPositions[i*3+1]<0)this.rainPositions[i*3+1]=45;}
      (this.rain.geometry.attributes.position as THREE.BufferAttribute).needsUpdate=true;
    }
  }
  setEnvironment(settings:GameSettings){
    this.settings=settings;const night=settings.timeOfDay==='night',day=settings.timeOfDay==='day';
    const top=night?'#071326':day?'#5b9fd0':'#526287',bottom=night?'#1d2940':day?'#c6e4ed':'#f4a261';
    this.sky.material.uniforms.top.value.set(top);this.sky.material.uniforms.bottom.value.set(bottom);
    this.scene.background=new THREE.Color(bottom);this.scene.fog=new THREE.Fog(bottom,90,settings.renderDistance);
    this.hemi.color.set(night?'#6680ad':day?'#d9edff':'#ffdcb0');this.hemi.intensity=night?.65:day?1.9:1.65;
    this.sun.color.set(night?'#819bd4':day?'#fff4df':'#ffd0a1');this.sun.intensity=night?.48:day?2.4:2.25;
    this.windowMaterials.forEach(m=>m.emissiveIntensity=night?.55:.1);this.rain.visible=settings.weather==='rain';
  }
  dispose(){this.scene.remove(this.group,this.hemi,this.sun,this.sky,this.rain);this.group.traverse(obj=>{if(obj instanceof THREE.Mesh){obj.geometry.dispose();if(Array.isArray(obj.material))obj.material.forEach(m=>m.dispose());else obj.material.dispose();}});}
}
