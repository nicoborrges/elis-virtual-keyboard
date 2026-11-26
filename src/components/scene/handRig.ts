/**
 * Rig procedural das mãos (Three.js) — compartilhado entre o teclado ELiS
 * (Hands3DCanvas) e o Estúdio de Captura (pipeline de imagens/vídeos de Libras).
 *
 * Convenção do espaço local do punho (grupo `wrist`):
 *   +Y = direção dos dedos, +Z = normal da palma, +X = lado do polegar na mão
 *   direita (sideSign = +1) e lado do mínimo na mão esquerda (sideSign = -1).
 * Flexão positiva em `rotation.x` dobra o segmento em direção à palma (+Z).
 */
import * as THREE from 'three';

export interface FingerRig {
  mcp: THREE.Group;
  pip: THREE.Group;
  dip: THREE.Group;
  baseSplayZ: number;
}

export interface ThumbRig {
  cmc: THREE.Group;
  mcp: THREE.Group;
  ip: THREE.Group;
}

export interface HandRig {
  root: THREE.Group;
  wrist: THREE.Group;
  thumb: ThumbRig;
  fingers: FingerRig[]; // [index, middle, ring, pinky]
  sideSign: 1 | -1; // -1 = left hand on screen, +1 = right hand on screen
  baseX: number;
}

export interface HandPoseTargets {
  wristRotX: number;
  wristRotY: number;
  wristRotZ: number;
  thumbBaseZ: number;
  thumbCmcX: number;
  thumbCmcY: number;
  thumbCmcZ: number;
  thumbMcpX: number;
  thumbIpX: number;
  fingerMcpX: number;
  fingerPipX: number;
  fingerDipX: number;
  fingerSplayScale: number;
}

export function getPoseFromElis(
  thumbChar: string | null,
  fingersChar: string | null,
  palmChar: string | null,
  sideSign: 1 | -1
): HandPoseTargets {
  const pose: HandPoseTargets = {
    wristRotX: 0.08,
    wristRotY: -sideSign * 0.14,
    wristRotZ: 0,
    thumbBaseZ: 0.14,
    thumbCmcX: 0.24,
    thumbCmcY: -sideSign * 0.42,
    thumbCmcZ: -sideSign * 0.45,
    thumbMcpX: 0.18,
    thumbIpX: 0.14,
    fingerMcpX: 0.16,
    fingerPipX: 0.18,
    fingerDipX: 0.12,
    fingerSplayScale: 1,
  };

  // Etapa 1: Polegar
  switch (thumbChar) {
    case 'q': // fechado (dobrado sobre a frente da palma / punho fechado, sem atravessar)
      pose.thumbBaseZ = 0.24;
      pose.thumbCmcX = 0.34;
      pose.thumbCmcY = sideSign * 0.12;
      pose.thumbCmcZ = sideSign * 0.72;
      pose.thumbMcpX = 0.26;
      pose.thumbIpX = 0.22;
      break;
    case 'w': // na palma (apoiado rente sobre a superfície frontal da palma, sem atravessar)
      pose.thumbBaseZ = 0.24;
      pose.thumbCmcX = 0.08;
      pose.thumbCmcY = sideSign * 0.08;
      pose.thumbCmcZ = sideSign * 0.96;
      pose.thumbMcpX = 0.04;
      pose.thumbIpX = 0.03;
      break;
    case 'e': // curvo (em C, à frente da palma)
      pose.thumbBaseZ = 0.16;
      pose.thumbCmcX = 0.38;
      pose.thumbCmcY = -sideSign * 0.35;
      pose.thumbCmcZ = -sideSign * 0.22;
      pose.thumbMcpX = 0.55;
      pose.thumbIpX = 0.72;
      break;
    case 'r': // tridimensional (projetado para frente em oposição +Z)
      pose.thumbBaseZ = 0.14;
      pose.thumbCmcX = 1.12;
      pose.thumbCmcY = -sideSign * 0.15;
      pose.thumbCmcZ = -sideSign * 0.12;
      pose.thumbMcpX = 0.08;
      pose.thumbIpX = 0.06;
      break;
    case 't': // horizontal (abduzido horizontalmente para fora)
      pose.thumbBaseZ = 0.12;
      pose.thumbCmcX = 0.08;
      pose.thumbCmcY = -sideSign * 0.15;
      pose.thumbCmcZ = -sideSign * 1.15;
      pose.thumbMcpX = 0.05;
      pose.thumbIpX = 0.04;
      break;
    case 'y': // vertical (estendido para cima paralelo ao indicador)
      pose.thumbBaseZ = 0.12;
      pose.thumbCmcX = 0.12;
      pose.thumbCmcY = -sideSign * 0.22;
      pose.thumbCmcZ = -sideSign * 0.12;
      pose.thumbMcpX = 0.04;
      pose.thumbIpX = 0.04;
      break;
    default:
      break;
  }

  // Etapa 2: Demais Dedos
  switch (fingersChar) {
    case 'q': // fechado (punho fechado)
      pose.fingerMcpX = 1.42;
      pose.fingerPipX = 1.62;
      pose.fingerDipX = 1.18;
      pose.fingerSplayScale = 0.25;
      break;
    case 'u': // muito curvo (garra fechada)
      pose.fingerMcpX = 0.38;
      pose.fingerPipX = 1.48;
      pose.fingerDipX = 1.25;
      pose.fingerSplayScale = 0.85;
      break;
    case 'o': // curvo (formato em C suave)
      pose.fingerMcpX = 0.62;
      pose.fingerPipX = 0.88;
      pose.fingerDipX = 0.65;
      pose.fingerSplayScale = 0.9;
      break;
    case 's': // inclinado (dedos retos inclinados na articulação MCP)
      pose.fingerMcpX = 1.32;
      pose.fingerPipX = 0.08;
      pose.fingerDipX = 0.05;
      pose.fingerSplayScale = 0.5;
      break;
    case 'g': // estendido (dedos totalmente retos e abertos)
      pose.fingerMcpX = 0.02;
      pose.fingerPipX = 0.02;
      pose.fingerDipX = 0.02;
      pose.fingerSplayScale = 1.35;
      break;
    default:
      break;
  }

  // Etapa 3: Orientação da Palma
  switch (palmChar) {
    case 'l': // palma para frente (+Z)
      pose.wristRotX = 0.05;
      pose.wristRotY = 0;
      pose.wristRotZ = 0;
      break;
    case 'ç': // palma para trás (-Z, dorso para frente)
      pose.wristRotX = 0.05;
      pose.wristRotY = Math.PI;
      pose.wristRotZ = 0;
      break;
    case 'z': // palma para a medial (voltada para o centro / outra mão)
      pose.wristRotX = 0.04;
      pose.wristRotY = -sideSign * (Math.PI / 2);
      pose.wristRotZ = 0;
      break;
    case 'x': // palma para a distal (voltada para fora)
      pose.wristRotX = 0.04;
      pose.wristRotY = sideSign * (Math.PI / 2);
      pose.wristRotZ = 0;
      break;
    case 'c': // palma para cima (+Y)
      pose.wristRotX = -Math.PI / 2 + 0.15;
      pose.wristRotY = -sideSign * 0.1;
      pose.wristRotZ = 0;
      break;
    case 'v': // palma para baixo (-Y)
      pose.wristRotX = Math.PI / 2 - 0.15;
      pose.wristRotY = -sideSign * 0.1;
      pose.wristRotZ = 0;
      break;
    default:
      break;
  }

  return pose;
}

export function createPalmGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.34, -0.46);
  shape.quadraticCurveTo(-0.46, -0.1, -0.45, 0.34);
  shape.quadraticCurveTo(-0.44, 0.48, -0.26, 0.5);
  shape.lineTo(0.26, 0.5);
  shape.quadraticCurveTo(0.45, 0.47, 0.46, 0.32);
  shape.quadraticCurveTo(0.47, -0.08, 0.35, -0.46);
  shape.quadraticCurveTo(0.0, -0.54, -0.34, -0.46);

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.06,
    bevelSegments: 5,
    curveSegments: 16,
  });

  geom.translate(0, 0, -0.08);
  geom.computeVertexNormals();
  return geom;
}

export function createArticulatedHand(
  sideSign: 1 | -1,
  skinMat: THREE.Material,
  jointMat: THREE.Material,
  nailMat: THREE.Material,
  cuffMat: THREE.Material,
  accentMat: THREE.Material
): HandRig {
  const root = new THREE.Group();
  const baseX = sideSign * 0.88;
  root.position.set(baseX, -0.18, 0);

  const wrist = new THREE.Group();
  root.add(wrist);

  const wristMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.31, 0.34, 0.68, 24),
    cuffMat
  );
  wristMesh.position.set(0, -0.82, -0.01);
  wristMesh.scale.set(1.06, 1, 0.72);
  wristMesh.castShadow = true;
  wrist.add(wristMesh);

  const cuffRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.33, 0.026, 12, 32),
    accentMat
  );
  cuffRing.rotation.x = Math.PI / 2;
  cuffRing.scale.set(1.06, 0.74, 1);
  cuffRing.position.set(0, -0.55, -0.01);
  wrist.add(cuffRing);

  const palmMesh = new THREE.Mesh(createPalmGeometry(), skinMat);
  palmMesh.castShadow = true;
  palmMesh.receiveShadow = true;
  wrist.add(palmMesh);

  const thenarPad = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 18, 16),
    skinMat
  );
  thenarPad.position.set(sideSign * 0.22, -0.15, 0.08);
  thenarPad.scale.set(0.88, 1.18, 0.42);
  wrist.add(thenarPad);

  const palmCenterPad = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 16, 14),
    jointMat
  );
  palmCenterPad.position.set(-sideSign * 0.06, 0.04, 0.09);
  palmCenterPad.scale.set(1.3, 1.1, 0.35);
  wrist.add(palmCenterPad);

  const fingerSpecs = [
    { name: 'index', x: sideSign * 0.33, y: 0.51, len: [0.42, 0.28, 0.22], rad: 0.096, splay: -sideSign * 0.11 },
    { name: 'middle', x: sideSign * 0.11, y: 0.54, len: [0.46, 0.31, 0.23], rad: 0.1, splay: -sideSign * 0.02 },
    { name: 'ring', x: -sideSign * 0.11, y: 0.51, len: [0.42, 0.28, 0.22], rad: 0.094, splay: sideSign * 0.06 },
    { name: 'pinky', x: -sideSign * 0.32, y: 0.44, len: [0.33, 0.22, 0.19], rad: 0.082, splay: sideSign * 0.14 },
  ];

  const fingers: FingerRig[] = fingerSpecs.map((spec) => {
    const mcp = new THREE.Group();
    mcp.position.set(spec.x, spec.y, 0);
    mcp.rotation.z = spec.splay;
    wrist.add(mcp);

    const knuckle = new THREE.Mesh(
      new THREE.SphereGeometry(spec.rad * 1.06, 16, 14),
      jointMat
    );
    mcp.add(knuckle);

    const [l1, l2, l3] = spec.len;
    const proxMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(spec.rad * 0.94, l1 - spec.rad * 1.4, 8, 16),
      skinMat
    );
    proxMesh.position.y = l1 / 2;
    proxMesh.castShadow = true;
    mcp.add(proxMesh);

    const pip = new THREE.Group();
    pip.position.y = l1;
    mcp.add(pip);

    const pipJoint = new THREE.Mesh(
      new THREE.SphereGeometry(spec.rad * 0.92, 14, 12),
      jointMat
    );
    pip.add(pipJoint);

    const midMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(spec.rad * 0.86, Math.max(0.05, l2 - spec.rad * 1.2), 8, 16),
      skinMat
    );
    midMesh.position.y = l2 / 2;
    midMesh.castShadow = true;
    pip.add(midMesh);

    const dip = new THREE.Group();
    dip.position.y = l2;
    pip.add(dip);

    const dipJoint = new THREE.Mesh(
      new THREE.SphereGeometry(spec.rad * 0.82, 14, 12),
      jointMat
    );
    dip.add(dipJoint);

    const distMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(spec.rad * 0.78, Math.max(0.04, l3 - spec.rad * 1.1), 8, 16),
      skinMat
    );
    distMesh.position.y = l3 / 2;
    distMesh.castShadow = true;
    dip.add(distMesh);

    const nail = new THREE.Mesh(
      new THREE.BoxGeometry(spec.rad * 1.05, l3 * 0.56, 0.025),
      nailMat
    );
    nail.position.set(0, l3 * 0.66, -spec.rad * 0.74);
    dip.add(nail);

    return { mcp, pip, dip, baseSplayZ: spec.splay };
  });

  // Articulated Thumb (Polegar)
  const cmc = new THREE.Group();
  cmc.position.set(sideSign * 0.4, -0.18, 0.14);
  wrist.add(cmc);

  const cmcJoint = new THREE.Mesh(
    new THREE.SphereGeometry(0.135, 16, 14),
    jointMat
  );
  cmc.add(cmcJoint);

  const thumbBaseLen = 0.34;
  const thumbMeta = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.115, thumbBaseLen - 0.16, 8, 16),
    skinMat
  );
  thumbMeta.position.y = thumbBaseLen / 2;
  thumbMeta.castShadow = true;
  cmc.add(thumbMeta);

  const thumbMcp = new THREE.Group();
  thumbMcp.position.y = thumbBaseLen;
  cmc.add(thumbMcp);

  const thumbMcpJoint = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 14, 12),
    jointMat
  );
  thumbMcp.add(thumbMcpJoint);

  const thumbProxLen = 0.28;
  const thumbProx = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.102, thumbProxLen - 0.14, 8, 16),
    skinMat
  );
  thumbProx.position.y = thumbProxLen / 2;
  thumbProx.castShadow = true;
  thumbMcp.add(thumbProx);

  const thumbIp = new THREE.Group();
  thumbIp.position.y = thumbProxLen;
  thumbMcp.add(thumbIp);

  const thumbIpJoint = new THREE.Mesh(
    new THREE.SphereGeometry(0.095, 14, 12),
    jointMat
  );
  thumbIp.add(thumbIpJoint);

  const thumbDistLen = 0.24;
  const thumbDist = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.092, thumbDistLen - 0.12, 8, 16),
    skinMat
  );
  thumbDist.position.y = thumbDistLen / 2;
  thumbDist.castShadow = true;
  thumbIp.add(thumbDist);

  const thumbNail = new THREE.Mesh(
    new THREE.BoxGeometry(0.115, 0.13, 0.025),
    nailMat
  );
  thumbNail.position.set(0, thumbDistLen * 0.68, -0.088);
  thumbIp.add(thumbNail);

  return {
    root,
    wrist,
    thumb: { cmc, mcp: thumbMcp, ip: thumbIp },
    fingers,
    sideSign,
    baseX,
  };
}
