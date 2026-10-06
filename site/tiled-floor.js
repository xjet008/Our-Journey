import * as THREE from './assets/three.module.min.js';

// A shared, matte charcoal finish. UVs use metres, so tiles keep the same
// size on the round invitation platform, landings and connecting paths.
export function createTileFinish(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#292d28';ctx.fillRect(0,0,512,512);
  const shades=['#343831','#363a33','#353932','#333730'];
  for(let row=0;row<2;row++)for(let col=0;col<2;col++){
    const x=col*256,y=row*256;ctx.fillStyle=shades[row*2+col];ctx.fillRect(x+2,y+2,252,252);
    ctx.strokeStyle='#3e4339';ctx.lineWidth=1;ctx.strokeRect(x+3.5,y+3.5,249,249);
    let seed=37+row*59+col*101;
    for(let i=0;i<950;i++){seed=(seed*1664525+1013904223)>>>0;const px=x+4+seed%248;seed=(seed*1664525+1013904223)>>>0;const py=y+4+seed%248;ctx.fillStyle=i%2?'#89907d05':'#151c1608';ctx.fillRect(px,py,2,1);}
    ctx.strokeStyle='#656e5d09';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+18,y+178);ctx.bezierCurveTo(x+80,y+120,x+170,y+210,x+237,y+100);ctx.stroke();
  }
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=4;
  return new THREE.MeshStandardMaterial({color:'#d2d0c9',map,roughness:1,metalness:0});
}

export function tileUV(geometry,offset={x:0,z:0}){
  const p=geometry.attributes.position,uv=new Float32Array(p.count*2);
  for(let i=0;i<p.count;i++){uv[i*2]=(p.getX(i)+offset.x)/1.44;uv[i*2+1]=(p.getZ(i)+offset.z)/1.44;}
  geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));return geometry;
}

// The tile cap and foundation are one solid, with a common y=0 top and
// thickness. A second overlay plane would leave a lip or flicker at joins.
export function tilePlatform(parent,finish,edge,shape,x=0,z=0){
  const geo=new THREE.ExtrudeGeometry(shape,{depth:.24,bevelEnabled:false,steps:1,curveSegments:16});
  geo.rotateX(-Math.PI/2);geo.translate(x,-.24,z);parent.updateWorldMatrix(true,false);tileUV(geo,parent.getWorldPosition(new THREE.Vector3()));
  const floor=new THREE.Mesh(geo,[finish,edge]);floor.receiveShadow=true;floor.userData.walkingFloor=true;parent.add(floor);return floor;
}

export function tileDeck(parent,finish,edge,width,depth,x=0,z=0){
  const s=new THREE.Shape();s.moveTo(-width/2,-depth/2);s.lineTo(width/2,-depth/2);s.lineTo(width/2,depth/2);s.lineTo(-width/2,depth/2);s.closePath();
  return tilePlatform(parent,finish,edge,s,x,z);
}
