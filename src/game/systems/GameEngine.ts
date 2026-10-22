import * as THREE from 'three';
import { CARS, effectiveStats, getCar, getCustomization } from '../data/cars';
import { POIS, RACE_MAP, RIVALS, getRace } from '../data/races';
import type { Customization, DriveInput, RaceResult, Telemetry } from '../types';
import { createCarModel } from '../world/CarModel';
import { World } from '../world/World';
import { AIController } from './AIController';
import { audio } from './AudioManager';
import { CameraController } from './CameraController';
import { InputController } from './InputController';
import { ParticleSystem } from './ParticleSystem';
import { RaceManager } from './RaceManager';
import { store } from './SaveManager';
import { VehicleController } from './VehicleController';

interface Callbacks{onTelemetry:(telemetry:Telemetry)=>void;onResult:(result:RaceResult)=>void;onPause:()=>void}
const emptyInput:DriveInput={throttle:0,brake:0,steer:0,nitro:false,handbrake:false};
const opponentNames=['Nina Blaze','Kai Torque','Luna Steel','Theo Rush','Ivo Flux','Mila Octane'];
const personalities=['balanced','aggressive','cautious','expert'] as const;

export class GameEngine {
  private renderer:THREE.WebGLRenderer;
  private scene=new THREE.Scene();
  private camera=new THREE.PerspectiveCamera(65,1,.1,1000);
  private cameraController:CameraController;
  private world:World|null=null;
  private particles:ParticleSystem|null=null;
  private player:VehicleController|null=null;
  private opponents:AIController[]=[];
  private race=new RaceManager();
  private animation=0;
  private lastTime=performance.now();
  private telemetryTimer=0;
  private view:'showcase'|'drive'='showcase';
  private paused=false;
  private showcaseModel:ReturnType<typeof createCarModel>|null=null;
  private showcaseAngle=.5;
  private showcaseCarId='';
  private currentRaceId:string|null=null;
  private score=0;
  private message='';
  private messageTime=0;
  private waypoint:{x:number;z:number;name:string}|null=null;
  private nearby:string|null=null;
  private speedGoals=new Set<number>();
  private sessionBestSpeed=0;
  private previousDistance=0;
  private dragging=false;
  private dragX=0;
  private showcaseGroup:THREE.Group|null=null;
  private raceVisuals:THREE.Group|null=null;
  private checkpointGate:THREE.Group|null=null;
  private bossPhaseAnnounced=false;
  private lastRacePosition=1;

  constructor(private canvas:HTMLCanvasElement,private callbacks:Callbacks){
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false});
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.96;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.cameraController=new CameraController(this.camera,store.data.settings.camera);
    this.input.onCamera=()=>this.cycleCamera();this.input.onPause=()=>this.callbacks.onPause();this.input.onReset=()=>this.resetVehicle();
    this.race.onCountdown=value=>{audio.sfx(value===0?'go':'countdown');this.message=value===0?'VAI!':String(value);this.messageTime=.8;};
    this.race.onCheckpoint=()=>{if(this.race.state!=='finished'){audio.sfx('checkpoint');this.score+=100;this.message='CHECKPOINT  +100';this.messageTime=1;}};
    this.race.onFinish=(driver,position)=>this.finishRace(driver,position);
    window.addEventListener('resize',this.resize);this.resize();
    canvas.addEventListener('pointerdown',this.pointerDown);window.addEventListener('pointermove',this.pointerMove);window.addEventListener('pointerup',this.pointerUp);
    this.applySettings();this.setShowcase(store.data.selected);this.animation=requestAnimationFrame(this.loop);
  }

  input=new InputController();
  private resize=()=>{const w=this.canvas.clientWidth||window.innerWidth,h=this.canvas.clientHeight||window.innerHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/Math.max(1,h);this.camera.updateProjectionMatrix();};
  private pointerDown=(e:PointerEvent)=>{if(this.view==='showcase'){this.dragging=true;this.dragX=e.clientX;}};
  private pointerMove=(e:PointerEvent)=>{if(this.dragging){this.showcaseAngle+=(e.clientX-this.dragX)*.008;this.dragX=e.clientX;}};
  private pointerUp=()=>{this.dragging=false;};

  private clearScene(){
    this.clearRaceVisuals();
    this.scene.traverse(obj=>{
      if(obj instanceof THREE.Mesh||obj instanceof THREE.Points){obj.geometry.dispose();const materials=Array.isArray(obj.material)?obj.material:[obj.material];materials.forEach(m=>{const mapped=m as THREE.MeshStandardMaterial;mapped.map?.dispose();mapped.emissiveMap?.dispose();m.dispose();});}
      if(obj instanceof THREE.Sprite){const material=obj.material;material.map?.dispose();material.dispose();}
    });
    this.world?.dispose();this.world=null;this.particles?.dispose();this.particles=null;this.opponents=[];this.player=null;this.race.dispose();
    if(this.showcaseModel){this.disposeObject(this.showcaseModel.group);this.showcaseModel=null;}
    this.scene=new THREE.Scene();this.showcaseGroup=null;
  }
  private disposeObject(object:THREE.Object3D){object.traverse(obj=>{if(obj instanceof THREE.Mesh){obj.geometry.dispose();const materials=Array.isArray(obj.material)?obj.material:[obj.material];materials.forEach(m=>m.dispose());}});object.removeFromParent();}
  private buildShowroom(){
    this.scene.background=new THREE.Color('#0c1119');this.scene.fog=new THREE.Fog('#0c1119',20,58);
    const hemi=new THREE.HemisphereLight('#c9ddff','#19151c',1.25);this.scene.add(hemi);
    const key=new THREE.DirectionalLight('#ffe2bd',2.2);key.position.set(-5,9,6);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-8;key.shadow.camera.right=8;key.shadow.camera.top=8;key.shadow.camera.bottom=-8;this.scene.add(key);
    const fill=new THREE.DirectionalLight('#5f9fff',1.15);fill.position.set(7,4,-5);this.scene.add(fill);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(70,70),new THREE.MeshStandardMaterial({color:'#151b24',roughness:.3,metalness:.65}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;this.scene.add(floor);
    const group=new THREE.Group();this.scene.add(group);this.showcaseGroup=group;
    const platform=new THREE.Mesh(new THREE.CylinderGeometry(4.1,4.3,.22,64),new THREE.MeshStandardMaterial({color:'#252d38',metalness:.72,roughness:.26}));platform.position.y=.1;platform.receiveShadow=true;group.add(platform);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(4.12,.035,8,64),new THREE.MeshStandardMaterial({color:'#e6b84d',emissive:'#d59b32',emissiveIntensity:.65,metalness:.5}));ring.rotation.x=Math.PI/2;ring.position.y=.23;group.add(ring);
    for(const x of [-8,8]){const pad=new THREE.Mesh(new THREE.CylinderGeometry(2.8,3,.14,40),new THREE.MeshStandardMaterial({color:'#1d2530',metalness:.6,roughness:.35}));pad.position.set(x,.07,-2);group.add(pad);}
    for(const x of [-10,10])for(const z of [-8,4]){const column=new THREE.Mesh(new THREE.BoxGeometry(.35,8,.35),new THREE.MeshStandardMaterial({color:'#293441',metalness:.7,roughness:.3}));column.position.set(x,4,z);group.add(column);}
    for(const x of [-6,0,6]){const strip=new THREE.Mesh(new THREE.BoxGeometry(3,.08,.3),new THREE.MeshStandardMaterial({color:'#f4d9a5',emissive:'#ffc875',emissiveIntensity:.7}));strip.position.set(x,7,0);group.add(strip);}
  }
  setShowcase(carId:string,custom?:Customization){
    audio.setEngine(0,0,false);this.input.releaseAll();
    if(this.view!=='showcase'||!this.showcaseGroup){this.clearScene();this.view='showcase';this.paused=false;this.currentRaceId=null;this.buildShowroom();this.camera.fov=55;this.camera.updateProjectionMatrix();}
    if(this.showcaseCarId===carId&&this.showcaseModel&&!custom)return;
    if(this.showcaseModel)this.disposeObject(this.showcaseModel.group);
    const car=getCar(carId),customization=custom??getCustomization(carId,store.data.customizations[carId]);
    this.showcaseModel=createCarModel(car,customization,true);this.showcaseModel.group.position.y=.22;this.showcaseGroup!.add(this.showcaseModel.group);this.showcaseCarId=carId;
    this.score=0;this.message='';this.nearby=null;
  }
  updatePreview(custom:Customization){if(this.view==='showcase')this.setShowcase(this.showcaseCarId||store.data.selected,custom);}

  private createPlayer(){
    const car=store.selectedCar,custom=getCustomization(car.id,store.data.customizations[car.id]),model=createCarModel(car,custom,true);this.scene.add(model.group);
    this.player=new VehicleController(car,store.data.upgrades[car.id]??{},model,true);this.previousDistance=0;return this.player;
  }
  private prepareDrive(){
    if(this.view==='drive'&&this.world&&this.player)return;
    this.clearScene();this.view='drive';this.world=new World(this.scene,store.data.settings);this.particles=new ParticleSystem(this.scene);this.createPlayer();this.cameraController.snap();this.applySettings();
  }
  startFreeDrive(){
    this.input.releaseAll();this.prepareDrive();this.removeOpponents();this.clearRaceVisuals();this.currentRaceId=null;this.race.dispose();this.paused=false;this.score=0;this.sessionBestSpeed=0;this.speedGoals.clear();this.waypoint=null;
    this.world!.setParkedVisible(true);this.player!.reset(0,-120,0);this.cameraController.snap();this.message='SUNSET VALLEY — EXPLORAÇÃO LIVRE';this.messageTime=2.2;audio.unlock(store.data.settings);this.emitTelemetry();
  }
  private removeOpponents(){for(const ai of this.opponents)this.disposeObject(ai.vehicle.model.group);this.opponents=[];}
  private clearRaceVisuals(){if(this.raceVisuals)this.disposeObject(this.raceVisuals);this.raceVisuals=null;this.checkpointGate=null;}
  private buildRaceVisuals(){
    const event=this.race.event;if(!event)return;this.clearRaceVisuals();const group=new THREE.Group();this.scene.add(group);this.raceVisuals=group;
    const a=event.path[0],b=event.path[1],heading=Math.atan2(b.x-a.x,b.z-a.z),right=new THREE.Vector3(Math.cos(heading),0,-Math.sin(heading));
    const white=new THREE.MeshStandardMaterial({color:'#eee9da',roughness:.8}),dark=new THREE.MeshStandardMaterial({color:'#161b20',roughness:.9});
    for(let row=0;row<2;row++)for(let i=0;i<12;i++){
      const cell=event.width/12,tile=new THREE.Mesh(new THREE.BoxGeometry(cell,.025,.65),(i+row)%2?white:dark);const offset=-event.width/2+cell*(i+.5);
      tile.position.set(a.x+right.x*offset+Math.sin(heading)*(row-.5)*.65,.064,a.z+right.z*offset+Math.cos(heading)*(row-.5)*.65);tile.rotation.y=heading;tile.receiveShadow=true;group.add(tile);
    }
    const radius=Math.min(6,Math.max(4,event.width*.25)),gate=new THREE.Group();
    const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,.12,7,40),new THREE.MeshBasicMaterial({color:'#55d7f2',transparent:true,opacity:.72,depthWrite:false}));ring.position.y=radius+.15;gate.add(ring);
    for(const side of [-1,1]){const post=new THREE.Mesh(new THREE.BoxGeometry(.12,radius,.12),new THREE.MeshBasicMaterial({color:'#55d7f2',transparent:true,opacity:.5}));post.position.set(side*radius,radius/2,0);gate.add(post);}
    group.add(gate);this.checkpointGate=gate;this.bossPhaseAnnounced=false;
  }
  private updateRaceVisuals(){
    const event=this.race.event,driver=this.race.player,gate=this.checkpointGate;if(!event||!driver||!gate)return;
    const target=this.race.target(driver),next=this.race.nextTarget(driver);gate.position.set(target.x,.02,target.z);gate.rotation.y=Math.atan2(next.x-target.x,next.z-target.z);gate.visible=this.race.state==='countdown'||this.race.state==='racing';
    const final=this.race.closed?driver.next>=event.path.length:driver.next>=event.path.length-1;
    gate.children.forEach(child=>{if(child instanceof THREE.Mesh)(child.material as THREE.MeshBasicMaterial).color.set(final?'#f3bd4c':'#55d7f2');});
    const pulse=1+Math.sin(performance.now()*.006)*.025;gate.scale.setScalar(pulse);
  }
  startRace(eventId:string){
    this.input.releaseAll();const event=getRace(eventId);this.prepareDrive();this.removeOpponents();this.currentRaceId=event.id;this.paused=false;this.score=0;this.sessionBestSpeed=0;this.speedGoals.clear();this.waypoint=null;
    const player=this.player!;const playerStats=effectiveStats(player.car,store.data.upgrades[player.car.id]);
    const rival=RIVALS.find(r=>r.id===event.rivalId);const used=new Set<string>();
    for(let i=0;i<event.opponents;i++){
      let car,personality,skill,name,color;
      if(i===0&&rival){car=getCar(rival.carId);personality=rival.personality;skill=Math.min(1.04,rival.skill+(event.difficulty-1)*.008);name=rival.name;color=rival.color;}
      else{
        const desired=playerStats.maxSpeed*(.82+event.difficulty*.018)+(i-event.opponents/2)*8;
        const candidates=CARS.filter(c=>c.maxSpeed<playerStats.maxSpeed*1.5+50&&Math.abs(c.maxSpeed-desired)<100&&!used.has(c.id));
        car=(candidates.length?candidates[i%candidates.length]:CARS[Math.min(CARS.length-1,event.difficulty+i)]);used.add(car.id);
        personality=personalities[i%personalities.length];skill=Math.min(.98,.64+event.difficulty*.032+i*.012);name=opponentNames[i%opponentNames.length];color=['#ef4444','#22d3ee','#a3e635','#c084fc','#fb923c','#94a3b8'][i%6];
      }
      const custom=getCustomization(car.id,{color,finish:'metallic',wheels:i%2?'sport':'stock'}),model=createCarModel(car,custom);this.scene.add(model.group);
      const upgrades={motor:Math.min(8,Math.floor(event.difficulty/2)),turbo:Math.min(8,Math.floor(event.difficulty/2)),tires:Math.min(6,Math.floor(event.difficulty/3))};
      const vehicle=new VehicleController(car,upgrades,model);const ai=new AIController(vehicle,personality,skill,event,name);this.opponents.push(ai);
    }
    this.world!.setParkedVisible(false);this.lastRacePosition=event.opponents+1;this.race.start(event,player,this.opponents,this.opponents.map(a=>a.vehicle.model.paint.color.getStyle()));this.buildRaceVisuals();this.message='';this.messageTime=0;this.cameraController.snap();audio.unlock(store.data.settings);this.emitTelemetry();
  }
  restartRace(){if(this.currentRaceId)this.startRace(this.currentRaceId);else this.startFreeDrive();}
  returnToMap(){this.startFreeDrive();}
  private finishRace(_driver:{vehicle:VehicleController},position:number){
    if(!this.currentRaceId||!this.player)return;const event=RACE_MAP[this.currentRaceId],won=position===1,racers=this.race.drivers.length;
    const multiplier=won?1:position===2?.55:position===3?.35:.18;
    const targetBonus=event.targetSpeed&&this.sessionBestSpeed>=event.targetSpeed?1.2:1;
    const reward=Math.round(event.reward*multiplier*targetBonus),xp=Math.round(event.xp*(won?1:.45));
    this.score+=Math.round((racers-position+1)*700+Math.max(0,2200-this.race.time*8));
    const previousBest=Math.max(0,...store.data.highScores.filter(s=>s.event===event.name).map(s=>s.score));
    const result:RaceResult={eventId:event.id,eventName:event.name,position,racers,time:this.race.time,reward,xp,score:Math.floor(this.score),won,newBest:this.score>previousBest};
    store.data.bestSpeed=Math.max(store.data.bestSpeed,this.sessionBestSpeed);
    store.completeRace(event.id,won,reward,xp,{score:result.score,event:event.name,position,date:new Date().toLocaleDateString('pt-BR')});
    audio.sfx(won?'victory':'defeat');this.message=won?'VITÓRIA!':'PROVA CONCLUÍDA';this.messageTime=2;this.callbacks.onResult(result);
  }

  setPaused(value:boolean){if(this.view==='drive'){this.paused=value;if(value)this.input.releaseAll();this.emitTelemetry();}}
  get isPaused(){return this.paused;}
  cycleCamera(){const mode=this.cameraController.cycle();store.updateSettings({camera:mode});this.message=mode==='near'?'CÂMERA PRÓXIMA':mode==='far'?'CÂMERA DISTANTE':'VISÃO DO CAPÔ';this.messageTime=1;audio.sfx('click');}
  resetVehicle(){if(!this.player)return;if(this.currentRaceId&&this.race.state==='racing')this.race.recoverPlayer();else this.player.reset(this.player.position.x,this.player.position.z,this.player.heading);this.cameraController.snap();audio.sfx('click');}
  markPOI(id:string){const poi=POIS.find(p=>p.id===id||p.eventId===id);if(poi){this.waypoint={x:poi.x,z:poi.z,name:poi.name};this.message=`ROTA: ${poi.name.toUpperCase()}`;this.messageTime=1.8;}else this.waypoint=null;}
  clearWaypoint(){this.waypoint=null;}
  applySettings(){
    const s=store.data.settings,ratio=s.quality==='low'?1:s.quality==='medium'?Math.min(devicePixelRatio,1.45):Math.min(devicePixelRatio,2);
    this.renderer.setPixelRatio(ratio);this.renderer.shadowMap.enabled=s.quality!=='low';this.camera.far=s.renderDistance+150;this.camera.updateProjectionMatrix();this.cameraController.mode=s.camera;this.world?.setEnvironment(s);audio.applySettings(s);this.resize();
  }

  private loop=(now:number)=>{
    this.animation=requestAnimationFrame(this.loop);const dt=Math.min(.05,Math.max(.001,(now-this.lastTime)/1000));this.lastTime=now;
    if(this.view==='showcase')this.updateShowcase(dt);else this.updateDrive(dt);
    this.renderer.render(this.scene,this.camera);
    this.telemetryTimer-=dt;if(this.telemetryTimer<=0){this.telemetryTimer=.09;this.emitTelemetry();}
  };
  private updateShowcase(dt:number){
    if(!this.dragging)this.showcaseAngle+=dt*.16;const radius=8.4;
    this.camera.position.set(Math.sin(this.showcaseAngle)*radius,3.1,Math.cos(this.showcaseAngle)*radius);this.camera.lookAt(0,1,0);
    if(this.showcaseModel){this.showcaseModel.group.rotation.y=Math.sin(this.showcaseAngle*.4)*.04;const car=getCar(this.showcaseCarId);this.showcaseModel.nitroFlames.forEach(f=>f.visible=false);this.showcaseModel.paint.emissiveIntensity=car.category==='Lendários'?.06:this.showcaseModel.paint.emissiveIntensity;}
  }
  private updateDrive(dt:number){
    if(!this.world||!this.player)return;const player=this.player;
    if(!this.paused){
      const settings=store.data.settings,racing=this.race.state==='racing',countdown=this.race.state==='countdown';
      this.race.update(dt);
      if(racing){const position=this.race.playerPosition;if(position<this.lastRacePosition){this.score+=250;this.message=`ULTRAPASSAGEM — ${position}º  +250`;this.messageTime=1.2;audio.sfx('checkpoint',.55);}this.lastRacePosition=position;}
      let controls=this.input.getInput(settings);if(countdown||this.race.state==='finished')controls={...emptyInput,handbrake:countdown};
      const all=[player,...this.opponents.map(o=>o.vehicle)];
      if(this.currentRaceId){
        for(const ai of this.opponents){const driver=this.race.drivers.find(d=>d.ai===ai);if(!driver)continue;ai.update(dt,this.race.target(driver),this.race.nextTarget(driver),player,all,this.world,racing,this.race.finalPhase);}
      }
      const steps=Math.max(1,Math.ceil(dt/.018)),step=dt/steps;
      for(let i=0;i<steps;i++){
        player.update(step,controls,this.world);for(const ai of this.opponents)ai.vehicle.update(step,ai.input,this.world);
        for(let a=0;a<all.length;a++)for(let b=a+1;b<all.length;b++)all[a].collideVehicle(all[b]);
      }
      const impact=player.consumeImpact();if(impact>0){this.cameraController.kick(impact);audio.sfx('collision',Math.min(1,impact/12));this.score=Math.max(0,this.score-Math.round(impact*3));if(settings.vibration&&impact>5)navigator.vibrate?.(Math.min(80,impact*4));const vel=player.velocity.clone().multiplyScalar(-.1);this.particles!.emit('spark',player.position.clone().add(new THREE.Vector3(0,.45,0)),vel,Math.min(10,Math.ceil(impact)));}
      for(const ai of this.opponents)ai.vehicle.consumeImpact();
      this.effects(dt);
      const speed=player.speedKmh;this.sessionBestSpeed=Math.max(this.sessionBestSpeed,speed);store.data.bestSpeed=Math.max(store.data.bestSpeed,speed);
      if(racing||!this.currentRaceId){this.score+=dt*Math.max(0,speed-25)*.055;if(player.drifting)this.score+=dt*Math.abs(player.speed)*4.5;}
      for(const goal of [100,200,300,400,500])if(speed>=goal&&!this.speedGoals.has(goal)){this.speedGoals.add(goal);if(!store.data.discovered.includes(`speed-${goal}`)){store.data.discovered.push(`speed-${goal}`);store.addXP(goal/2);store.commit();this.message=`META ${goal} KM/H  +${goal/2} XP`;this.messageTime=2;}}
      store.data.totalDistance+=Math.max(0,player.distance-this.previousDistance);this.previousDistance=player.distance;
      this.updateNearby();this.updateRaceVisuals();
      if(this.currentRaceId&&this.race.state==='racing'&&this.race.finalPhase&&!this.bossPhaseAnnounced){this.bossPhaseAnnounced=true;this.message='FASE FINAL — RIVAIS LIBERARAM O NITRO';this.messageTime=2.2;audio.sfx('nitro',.65);}
      this.world.update(dt,player.position);this.particles!.update(dt);this.cameraController.update(dt,player,this.world,player.nitroActive);
      audio.setEngine(Math.min(1.2,speed/player.stats.maxSpeed),controls.throttle,true);
      if(controls.nitro&&player.nitroActive&&!this.wasNitro){audio.sfx('nitro');if(settings.vibration)navigator.vibrate?.(25);}this.wasNitro=player.nitroActive;
      if(this.messageTime>0)this.messageTime-=dt;else this.message='';
    }else audio.setEngine(0,0,false);
  }
  private wasNitro=false;
  private effects(dt:number){
    const p=this.player!,particles=this.particles!,forward=p.forward(new THREE.Vector3()),speed=Math.abs(p.speed);
    if(speed>5&&(p.drifting||p.surface!=='asphalt')){
      const back=p.position.clone().addScaledVector(forward,-p.car.length*.3);back.y=.18;particles.emit(p.surface==='asphalt'?'smoke':'dust',back,p.velocity.clone().multiplyScalar(-.06),p.surface==='asphalt'?2:1);
      if(p.drifting&&Math.random()<dt*3)audio.sfx('skid',.5);
    }
    particles.skid(p.position,p.heading,dt,p.drifting&&p.surface==='asphalt');
    if(p.nitroActive){const exhaust=p.position.clone().addScaledVector(forward,-p.car.length*.52);exhaust.y=.35;particles.emit('nitro',exhaust,forward.clone().multiplyScalar(-5),3);}
  }
  private updateNearby(){
    const p=this.player!.position,near=this.world!.nearestPOI(p.x,p.z);this.nearby=near?.eventId??near?.id??null;
    for(const poi of POIS){if(Math.hypot(p.x-poi.x,p.z-poi.z)<17&&!store.data.discovered.includes(poi.id)){if(store.discover(poi.id)){this.message=`LOCAL DESCOBERTO  +75 XP`;this.messageTime=2;}}}
  }
  private emitTelemetry(){
    const p=this.player,raceActive=!!this.currentRaceId,driver=this.race.player;let target:null|{x:number;z:number}=null;
    if(raceActive&&driver&&this.race.event)target=this.race.target(driver);else if(this.waypoint)target=this.waypoint;
    let direction=0;if(target&&p)direction=Math.atan2(target.x-p.position.x,target.z-p.position.z)-p.heading;
    const telemetry:Telemetry={
      speed:p?.speedKmh??0,maxSpeed:p?.stats.maxSpeed??store.selectedCar.maxSpeed,rpm:p?.rpm??0,gear:Number(p?.gear??0)||0,nitro:p?p.nitroEnergy/p.stats.nitroCapacity:1,
      position:raceActive?this.race.playerPosition:1,racers:raceActive?this.race.drivers.length:1,raceTime:this.race.time,progress:raceActive?this.race.progress:0,
      checkpoint:raceActive?this.race.checkpointDisplay:0,checkpoints:raceActive?this.race.totalCheckpoints:0,countdown:this.race.state==='countdown'?Math.max(0,this.race.countdown):0,
      score:Math.floor(this.score),drift:p?.drifting?Math.abs(p.speed):0,boosting:p?.nitroActive??false,surface:p?.surface??'asphalt',state:this.view==='showcase'?'showcase':this.paused?'paused':this.race.state==='idle'?'free':this.race.state,
      eventName:this.race.event?.name??'',nearby:this.nearby,direction,nextCheckpoint:target,player:{x:p?.position.x??0,z:p?.position.z??0,heading:p?.heading??0},
      opponents:this.opponents.map(ai=>({x:ai.vehicle.position.x,z:ai.vehicle.position.z,color:ai.vehicle.model.paint.color.getStyle()})),message:this.message,
    };
    // Gear is represented as a number in the HUD; reverse and neutral are inferred from speed.
    if(p&&p.speed<-.5)telemetry.gear=-1;this.callbacks.onTelemetry(telemetry);
  }
  dispose(){cancelAnimationFrame(this.animation);window.removeEventListener('resize',this.resize);window.removeEventListener('pointermove',this.pointerMove);window.removeEventListener('pointerup',this.pointerUp);this.input.dispose();this.clearScene();this.renderer.dispose();audio.setEngine(0,0,false);}
}
