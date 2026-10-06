import * as THREE from './assets/three.module.min.js';

// A shared, quiet limestone finish. UVs use metres, so tiles keep the same
// size on the round invitation platform, landings and connecting paths.
export function createTileFinish(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#807665';ctx.fillRect(0,0,512,512);
  const shades=['#b7aa94','#bbae98','#b9ac96','#b4a790'];
  for(let row=0;row<2;row++)for(let col=0;col<2;col++){
    const x=col*256,y=row*256;ctx.fillStyle=shades[row*2+col];ctx.fillRect(x+2,y+2,252,252);
    ctx.strokeStyle='#d8cbb3';ctx.lineWidth=1;ctx.strokeRect(x+3.5,y+3.5,249,249);
    let seed=37+row*59+col*101;
    for(let i=0;i<950;i++){seed=(seed*1664525+1013904223)>>>0;const px=x+4+seed%248;seed=(seed*1664525+1013904223)>>>0;const py=y+4+seed%248;ctx.fillStyle=i%2?'#fff8e509':'#675c4809';ctx.fillRect(px,py,2,1);}
    ctx.strokeStyle='#eee2c910';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+18,y+178);ctx.bezierCurveTo(x+80,y+120,x+170,y+210,x+237,y+100);ctx.stroke();
  }
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=4;
  return new THREE.MeshStandardMaterial({color:'#ffffff',map,roughness:.76,metalness:.02});
}

export function tileUV(geometry){
  const p=geometry.attributes.position,uv=new Float32Array(p.count*2);
  for(let i=0;i<p.count;i++){uv[i*2]=p.getX(i)/1.44;uv[i*2+1]=p.getZ(i)/1.44;}
  geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));return geometry;
}

export function tileRectangle(parent,finish,width,depth,x=0,z=0,y=0){
  const geo=new THREE.PlaneGeometry(width,depth);geo.rotateX(-Math.PI/2);geo.translate(x,0,z);tileUV(geo);
  const floor=new THREE.Mesh(geo,finish);floor.position.y=y;floor.receiveShadow=true;parent.add(floor);return floor;
}
