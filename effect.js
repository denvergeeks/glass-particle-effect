import * as THREE from 'three';
import GUI from 'three/addons/libs/lil-gui.module.min.js';

export async function createGlassEffect(container, options = {}) {
  const config = Object.assign({count:80,speed:1,size:1,harmfulRatio:0.25,cleanColor:'#ffffff',harmfulColor:'#ff5555',glassWidth:3.5,refraction:0.5,aberration:0.8,ripple:1,paused:false}, options.config);
  const renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  container.append(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#000000');
  const camera=new THREE.PerspectiveCamera(70,1,0.1,100);camera.position.z=5;
  const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType});
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let disposed=false,time=0,last=performance.now(),points,geometry;
  const particleUniforms={uTime:{value:0},uSpeed:{value:config.speed},uSize:{value:config.size},uDpr:{value:1},uWidth:{value:config.glassWidth},uClean:{value:new THREE.Color(config.cleanColor)},uBad:{value:new THREE.Color(config.harmfulColor)}};
  const particleMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:particleUniforms,vertexShader:`
    attribute float aSpeed; attribute float aOffset; attribute float aBad; attribute float aSize;
    uniform float uTime,uSpeed,uSize,uDpr,uWidth; varying float vBad,vAlpha,vZap;
    void main(){
      vec3 p=position; p.x=(mod(uTime*aSpeed*uSpeed+aOffset,2.0)-1.0)*5.0;
      p.y+=sin(uTime*2.0+aOffset*10.0)*0.08;
      vBad=aBad; vZap=0.0;
      vAlpha=smoothstep(-5.0,-3.5,p.x)*(1.0-smoothstep(3.5,5.0,p.x));
      float left=-uWidth*0.5;
      if(aBad>0.5 && p.x>left){vZap=clamp((p.x-left)/0.6,0.0,1.0);vAlpha*=1.0-pow(vZap,0.4);}
      vec4 mv=modelViewMatrix*vec4(p,1.0);
      gl_PointSize=clamp(aSize*uSize*uDpr*200.0/(-mv.z)*(1.0-vZap*0.9),1.0,96.0);
      gl_Position=projectionMatrix*mv;
    }`,fragmentShader:`
    uniform vec3 uClean,uBad;uniform float uTime;varying float vBad,vAlpha,vZap;
    float random(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
    void main(){float alpha=(1.0-smoothstep(0.3,0.5,length(gl_PointCoord-0.5)))*vAlpha;vec3 color=mix(uClean,uBad,vBad);
      if(vBad>0.5&&vZap>0.0){float n=random(gl_PointCoord*20.0+uTime*3.0);float threshold=vZap*2.0;if(n<threshold)discard;float flash=1.0-smoothstep(0.0,0.15,abs(n-threshold));color=mix(color,vec3(1.0,1.0,0.8),flash);color=mix(color,vec3(1.0,0.5,0.1),vZap*0.5);}
      if(alpha<0.01)discard;gl_FragColor=vec4(color,alpha);
    }`});
  function rebuild(){
    if(points)scene.remove(points);if(geometry)geometry.dispose();
    geometry=new THREE.BufferGeometry();const n=Math.round(config.count);
    const positions=new Float32Array(n*3),speeds=new Float32Array(n),offsets=new Float32Array(n),bad=new Float32Array(n),sizes=new Float32Array(n);
    for(let i=0;i<n;i++){positions[i*3+1]=(Math.random()-0.5)*4;positions[i*3+2]=-2+(Math.random()-0.5);speeds[i]=0.12+Math.random()*0.05;offsets[i]=Math.random()*2;bad[i]=Number(Math.random()<config.harmfulRatio);sizes[i]=1+Math.random()*2;}
    for(const [name,array,itemSize] of [['position',positions,3],['aSpeed',speeds,1],['aOffset',offsets,1],['aBad',bad,1],['aSize',sizes,1]])geometry.setAttribute(name,new THREE.BufferAttribute(array,itemSize));
    points=new THREE.Points(geometry,particleMaterial);points.frustumCulled=false;scene.add(points);
  }
  const uniforms={uTexture:{value:target.texture},uResolution:{value:new THREE.Vector2()},uTime:{value:0},uRefraction:{value:config.refraction},uAberration:{value:config.aberration},uRipple:{value:config.ripple}};
  const glassMaterial=new THREE.ShaderMaterial({uniforms,vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`
    uniform sampler2D uTexture;uniform vec2 uResolution;uniform float uTime,uRefraction,uAberration,uRipple;varying vec2 vUv;
    void main(){vec2 uv=gl_FragCoord.xy/uResolution;float edge=1.0-smoothstep(0.0,0.055,min(vUv.x,1.0-vUv.x));
      float wave=sin(vUv.y*20.0+uTime*2.0)+sin(vUv.y*12.0-uTime*1.5);
      vec2 bend=vec2((vUv.x-0.5)*0.025+wave*uRipple*(0.002+edge*0.035),cos(vUv.y*15.0+uTime)*edge*0.015);
      bend*=uRefraction;float spread=uAberration*(0.5+edge*3.0);vec3 color=vec3(0.0);
      for(int i=0;i<16;i++){float slide=float(i)/16.0;
        color.r+=texture2D(uTexture,clamp(uv+bend*(1.0+spread*0.28+slide*0.1),vec2(0.0),vec2(1.0))).r;
        color.g+=texture2D(uTexture,clamp(uv+bend*(1.0+spread*0.14+slide*0.1),vec2(0.0),vec2(1.0))).g;
        color.b+=texture2D(uTexture,clamp(uv+bend*(1.0+slide*0.1),vec2(0.0),vec2(1.0))).b;
      }
      color/=16.0;vec3 border=0.5+0.5*cos(vec3(0.0,2.1,4.2)+vUv.y*8.0+uTime*0.3);color+=border*edge*0.09;
      gl_FragColor=vec4(color,1.0);
    }`});
  const glassGeometry=new THREE.PlaneGeometry(1,32);const glass=new THREE.Mesh(glassGeometry,glassMaterial);glass.scale.x=config.glassWidth;scene.add(glass);rebuild();
  function resize(){const w=Math.max(1,container.clientWidth),h=Math.max(1,container.clientHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.getDrawingBufferSize(uniforms.uResolution.value);target.setSize(uniforms.uResolution.value.x,uniforms.uResolution.value.y);particleUniforms.uDpr.value=renderer.getPixelRatio();}
  const observer=new ResizeObserver(resize);observer.observe(container);resize();
  let gui;
  if(options.controls!==false){gui=new GUI({title:'Glass particle settings'});gui.add(config,'count',10,400,1).onFinishChange(rebuild);gui.add(config,'harmfulRatio',0,1,0.01).onFinishChange(rebuild);gui.add(config,'speed',0,3,0.01);gui.add(config,'size',0.2,3,0.01);gui.addColor(config,'cleanColor');gui.addColor(config,'harmfulColor');gui.add(config,'glassWidth',0.5,5,0.01);gui.add(config,'refraction',0,2,0.01);gui.add(config,'aberration',0,3,0.01);gui.add(config,'ripple',0,3,0.01);gui.add(config,'paused');gui.add({exportSettings(){const blob=new Blob([JSON.stringify(config,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='glass-settings.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}},'exportSettings');}
  renderer.setAnimationLoop(()=>{const now=performance.now(),dt=Math.min((now-last)/1000,0.1);last=now;if(!config.paused&&!reduced.matches&&!document.hidden)time+=dt;
    particleUniforms.uTime.value=time;particleUniforms.uSpeed.value=config.speed;particleUniforms.uSize.value=config.size;particleUniforms.uWidth.value=config.glassWidth;particleUniforms.uClean.value.set(config.cleanColor);particleUniforms.uBad.value.set(config.harmfulColor);
    uniforms.uTime.value=time;uniforms.uRefraction.value=config.refraction;uniforms.uAberration.value=config.aberration;uniforms.uRipple.value=config.ripple;glass.scale.x=config.glassWidth;
    glass.visible=false;renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);glass.visible=true;renderer.render(scene,camera);
  });
  return {config,destroy(){if(disposed)return;disposed=true;renderer.setAnimationLoop(null);observer.disconnect();gui?.destroy();geometry.dispose();particleMaterial.dispose();glassGeometry.dispose();glassMaterial.dispose();target.dispose();renderer.dispose();renderer.domElement.remove();}};
}
