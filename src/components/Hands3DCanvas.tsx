import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RotateCcw, Hand } from 'lucide-react';
import type { StepNumber, VisografemaItem } from '../data/elisMap';
import { ARTICULATION_3D_MAP, type Articulation3DConfig } from '../data/articulation3DMap';
import { createBodyContextProps } from './scene/BodyContextProps';
import type { CompletedSign, SlotEntry } from './VisorArea';
import { cn } from '../utils/cn';

interface Hands3DCanvasProps {
  slots: Record<StepNumber, SlotEntry>;
  hoveredItem: VisografemaItem | null;
  isPlaying: boolean;
  playingSign: CompletedSign | null;
  playingIndex: number;
  totalPlayingSigns: number;
}

interface FingerRig {
  mcp: THREE.Group;
  pip: THREE.Group;
  dip: THREE.Group;
  baseSplayZ: number;
}

interface ThumbRig {
  cmc: THREE.Group;
  mcp: THREE.Group;
  ip: THREE.Group;
}

interface HandRig {
  root: THREE.Group;
  wrist: THREE.Group;
  thumb: ThumbRig;
  fingers: FingerRig[]; // [index, middle, ring, pinky]
  sideSign: 1 | -1; // -1 = left hand on screen, +1 = right hand on screen
  baseX: number;
}

interface HandPoseTargets {
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

function getPoseFromElis(
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

function createPalmGeometry(): THREE.ExtrudeGeometry {
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

function createArticulatedHand(
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

export const Hands3DCanvas: React.FC<Hands3DCanvasProps> = ({
  slots,
  hoveredItem,
  isPlaying,
  playingSign,
  playingIndex,
  totalPlayingSigns,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const [mirrorHands, setMirrorHands] = useState(true);

  const poseStateRef = useRef<{
    thumbChar: string | null;
    fingersChar: string | null;
    palmChar: string | null;
    articulationId: number | null;
    movementId: number | null;
    mirrorHands: boolean;
    isPlaying: boolean;
  }>({
    thumbChar: null,
    fingersChar: null,
    palmChar: null,
    articulationId: null,
    movementId: null,
    mirrorHands: true,
    isPlaying: false,
  });

  // Resolve active pose source: Loop playback overrides editing/hover state while playing
  const playingThumb = playingSign?.items.find((i) => i.step === 1)?.char ?? null;
  const playingFingers = playingSign?.items.find((i) => i.step === 2)?.char ?? null;
  const playingPalm = playingSign?.items.find((i) => i.step === 3)?.char ?? null;
  const playingArticulationId = playingSign?.items.find((i) => i.step === 4)?.id ?? null;
  const playingMovementId = playingSign?.items.find((i) => i.step === 5)?.id ?? null;

  const effectiveThumb = isPlaying && playingSign
    ? playingThumb
    : hoveredItem?.step === 1
    ? hoveredItem.char
    : slots[1].item?.char ?? null;

  const effectiveFingers = isPlaying && playingSign
    ? playingFingers
    : hoveredItem?.step === 2
    ? hoveredItem.char
    : slots[2].item?.char ?? null;

  const effectivePalm = isPlaying && playingSign
    ? playingPalm
    : hoveredItem?.step === 3
    ? hoveredItem.char
    : slots[3].item?.char ?? null;

  const effectiveArticulationId = isPlaying && playingSign
    ? playingArticulationId
    : hoveredItem?.step === 4
    ? hoveredItem.id
    : slots[4].item?.id ?? null;

  const effectiveMovementId = isPlaying && playingSign
    ? playingMovementId
    : hoveredItem?.step === 5
    ? hoveredItem.id
    : slots[5].item?.id ?? null;

  useEffect(() => {
    poseStateRef.current = {
      thumbChar: effectiveThumb,
      fingersChar: effectiveFingers,
      palmChar: effectivePalm,
      articulationId: effectiveArticulationId,
      movementId: effectiveMovementId,
      mirrorHands,
      isPlaying,
    };
  }, [
    effectiveThumb,
    effectiveFingers,
    effectivePalm,
    effectiveArticulationId,
    effectiveMovementId,
    mirrorHands,
    isPlaying,
  ]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      container.innerHTML =
        '<div class="flex items-center justify-center h-full text-xs text-ink-400 px-4 text-center">Visualização 3D indisponível neste navegador (WebGL desativado).</div>';
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 220;
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const computeIdealZ = (aspect: number) =>
      Math.max(6.4, 7.7 / Math.max(aspect, 0.55));

    const initialAspect = width / height;
    const camera = new THREE.PerspectiveCamera(38, initialAspect, 0.1, 60);
    camera.position.set(0, 0.3, computeIdealZ(initialAspect));
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 3.5;
    controls.maxDistance = 13;
    controls.target.set(0, 0.14, 0);
    controlsRef.current = controls;

    // 3-Point Studio Lighting
    const hemiLight = new THREE.HemisphereLight(0xf3e7cf, 0x1f1612, 1.1);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff5eb, 1.65);
    keyLight.position.set(2.8, 4.2, 4.6);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xd8ae5e, 1.15);
    rimLight.position.set(-3.5, 2.2, -3.5);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(0x8fc4ae, 0.7, 12);
    fillLight.position.set(-2.5, -1.2, 3.2);
    scene.add(fillLight);

    // Subtle studio floor grid disc
    const baseDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(2.55, 2.65, 0.05, 48),
      new THREE.MeshStandardMaterial({
        color: 0x1a1816,
        roughness: 0.75,
        metalness: 0.25,
        transparent: true,
        opacity: 0.55,
      })
    );
    baseDisc.position.set(0, -1.36, 0);
    baseDisc.receiveShadow = true;
    scene.add(baseDisc);

    const baseRingMat = new THREE.MeshBasicMaterial({
      color: 0xd8ae5e,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    });
    const baseRing = new THREE.Mesh(
      new THREE.RingGeometry(2.5, 2.56, 64),
      baseRingMat
    );
    baseRing.rotation.x = -Math.PI / 2;
    baseRing.position.set(0, -1.33, 0);
    scene.add(baseRing);

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xeac7b2,
      roughness: 0.44,
      metalness: 0.04,
    });
    const jointMat = new THREE.MeshStandardMaterial({
      color: 0xdab099,
      roughness: 0.52,
      metalness: 0.05,
    });
    const nailMat = new THREE.MeshStandardMaterial({
      color: 0xf8e7dc,
      roughness: 0.22,
      metalness: 0.08,
    });
    const cuffMat = new THREE.MeshStandardMaterial({
      color: 0x2a2723,
      roughness: 0.45,
      metalness: 0.4,
    });
    const rightAccentMat = new THREE.MeshStandardMaterial({
      color: 0xd8ae5e,
      emissive: 0xa67b2e,
      emissiveIntensity: 0.55,
      roughness: 0.25,
      metalness: 0.6,
    });
    const leftAccentMat = new THREE.MeshStandardMaterial({
      color: 0xb8615c,
      emissive: 0x6e2a2c,
      emissiveIntensity: 0.45,
      roughness: 0.25,
      metalness: 0.6,
    });

    const leftHand = createArticulatedHand(
      -1,
      skinMat,
      jointMat,
      nailMat,
      cuffMat,
      leftAccentMat
    );
    const rightHand = createArticulatedHand(
      1,
      skinMat,
      jointMat,
      nailMat,
      cuffMat,
      rightAccentMat
    );

    scene.add(leftHand.root);
    scene.add(rightHand.root);

    // Contextual 3D solid body props (Head, Torso, Arm, Leg + Hotspot Beacon)
    const bodyProps = createBodyContextProps(skinMat, jointMat, cuffMat);
    scene.add(bodyProps.root);

    let activeCameraZScale = 1;
    let targetCameraDist = computeIdealZ(initialAspect);
    let smoothZoomActive = false;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(100, entry.contentRect.width);
        const h = Math.max(100, entry.contentRect.height);
        const nextAspect = w / h;
        camera.aspect = nextAspect;
        camera.updateProjectionMatrix();
        const dir = camera.position.clone().sub(controls.target).normalize();
        const minFitDist = computeIdealZ(nextAspect) * activeCameraZScale;
        if (camera.position.distanceTo(controls.target) < minFitDist) {
          camera.position.copy(controls.target).addScaledVector(dir, minFitDist);
        }
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    const lerp = THREE.MathUtils.lerp;
    let rafId = 0;
    const clock = new THREE.Clock();

    const animatePropVisibility = (group: THREE.Group, active: boolean, speed: number) => {
      const targetScale = active ? 1 : 0.001;
      const nextScale = lerp(group.scale.x, targetScale, speed);
      group.scale.setScalar(nextScale);
      group.visible = nextScale > 0.025;
    };

    const applyHandPose = (
      hand: HandRig,
      pose: HandPoseTargets,
      dt: number,
      elapsed: number,
      artConfig: Articulation3DConfig | null,
      movementId: number | null,
      animateMovement: boolean,
      playingActive: boolean
    ) => {
      const speed = Math.min(1, dt * (playingActive ? 11 : 9));

      // Spatial target from Etapa 4 (Ponto de Articulação)
      let targetBaseX = hand.baseX;
      let targetBaseY = -0.18;
      let targetBaseZ = 0;

      if (artConfig) {
        if (hand.sideSign === 1) {
          [targetBaseX, targetBaseY, targetBaseZ] = artConfig.rightHandPos;
        } else if (artConfig.leftHandPos) {
          [targetBaseX, targetBaseY, targetBaseZ] = artConfig.leftHandPos;
        }
      }

      let offsetX = 0;
      let offsetY = Math.sin(elapsed * 1.8 + (hand.sideSign > 0 ? 0 : 0.7)) * 0.035;
      let offsetZ = 0;
      let extraWristX = 0;
      let extraWristY = 0;
      let extraWristZ = 0;
      let fingerPulse = 0;
      let drumWave = false;

      if (animateMovement && movementId !== null) {
        const freq = playingActive ? 4.8 : 4.2;
        const wave = Math.sin(elapsed * freq);
        const cosWave = Math.cos(elapsed * freq);

        if (movementId === 52) offsetZ = Math.max(0, wave) * 0.38; // para frente
        else if (movementId === 53) offsetZ = -Math.max(0, wave) * 0.38; // para trás
        else if (movementId === 54) offsetZ = wave * 0.35; // frente e trás
        else if (movementId === 55) offsetY = Math.max(0, wave) * 0.36; // para cima
        else if (movementId === 56) offsetY = -Math.max(0, wave) * 0.36; // para baixo
        else if (movementId === 57) offsetY = wave * 0.34; // cima e baixo
        else if (movementId === 58) offsetX = Math.max(0, wave) * 0.35; // direita
        else if (movementId === 59) offsetX = -Math.max(0, wave) * 0.35; // esquerda
        else if (movementId === 60) offsetX = wave * 0.34; // direita e esquerda
        else if (movementId === 61) offsetX = -hand.sideSign * Math.max(0, wave) * 0.32; // para o meio
        else if (movementId === 62) offsetX = hand.sideSign * Math.max(0, wave) * 0.32; // para fora
        else if (movementId === 63) {
          // cima e direita
          offsetX = Math.max(0, wave) * 0.28;
          offsetY = Math.max(0, wave) * 0.28;
        } else if (movementId === 64) {
          // cima e esquerda
          offsetX = -Math.max(0, wave) * 0.28;
          offsetY = Math.max(0, wave) * 0.28;
        } else if (movementId === 65) {
          // baixo e direita
          offsetX = Math.max(0, wave) * 0.28;
          offsetY = -Math.max(0, wave) * 0.28;
        } else if (movementId === 66) {
          // baixo e esquerda
          offsetX = -Math.max(0, wave) * 0.28;
          offsetY = -Math.max(0, wave) * 0.28;
        } else if (movementId === 67) {
          // arco
          offsetX = wave * 0.26;
          offsetY = Math.abs(cosWave) * 0.3;
        } else if (movementId === 68) {
          // flexão/extensão do braço
          offsetY = wave * 0.2;
          offsetZ = wave * 0.22;
          extraWristX = -wave * 0.25;
        } else if (movementId === 69) {
          // circular vertical
          offsetY = wave * 0.26;
          offsetZ = cosWave * 0.26;
        } else if (movementId === 70) {
          // circular horizontal
          offsetX = wave * 0.26;
          offsetZ = cosWave * 0.26;
        } else if (movementId === 71) {
          // circular frontal
          offsetX = wave * 0.26;
          offsetY = cosWave * 0.26;
        } else if (movementId >= 72 && movementId <= 77) {
          // abrir/fechar/flexionar/unir dedos
          fingerPulse = (wave + 1) * 0.45;
        } else if (movementId === 78 || movementId === 79) {
          // tamborilar / friccionar dedos
          drumWave = true;
        } else if (movementId === 80) {
          // dobrar o punho
          extraWristX = wave * 0.5;
        } else if (movementId === 81) {
          // mover o punho lateralmente
          extraWristZ = wave * 0.48;
        } else if (movementId === 82 || movementId === 83) {
          // girar punho / antebraço
          extraWristY = wave * 0.65;
        } else if (movementId >= 84) {
          // movimentos sem as mãos (pulso rítmico suave para indicar execução)
          offsetY = wave * 0.1;
          extraWristZ = wave * 0.12;
        }
      } else if (playingActive && animateMovement) {
        // Gentle emphasis motion when playing a sign without Step 5 movement
        offsetZ = Math.sin(elapsed * 3.4) * 0.12;
      }

      hand.root.position.x = lerp(hand.root.position.x, targetBaseX + offsetX, speed);
      hand.root.position.y = lerp(hand.root.position.y, targetBaseY + offsetY, speed);
      hand.root.position.z = lerp(hand.root.position.z, targetBaseZ + offsetZ, speed);

      hand.wrist.rotation.x = lerp(hand.wrist.rotation.x, pose.wristRotX + extraWristX, speed);
      hand.wrist.rotation.y = lerp(hand.wrist.rotation.y, pose.wristRotY + extraWristY, speed);
      hand.wrist.rotation.z = lerp(hand.wrist.rotation.z, pose.wristRotZ + extraWristZ, speed);

      // Thumb joints
      hand.thumb.cmc.position.z = lerp(hand.thumb.cmc.position.z, pose.thumbBaseZ, speed);
      hand.thumb.cmc.rotation.x = lerp(hand.thumb.cmc.rotation.x, pose.thumbCmcX, speed);
      hand.thumb.cmc.rotation.y = lerp(hand.thumb.cmc.rotation.y, pose.thumbCmcY, speed);
      hand.thumb.cmc.rotation.z = lerp(hand.thumb.cmc.rotation.z, pose.thumbCmcZ, speed);
      hand.thumb.mcp.rotation.x = lerp(hand.thumb.mcp.rotation.x, pose.thumbMcpX, speed);
      hand.thumb.ip.rotation.x = lerp(hand.thumb.ip.rotation.x, pose.thumbIpX, speed);

      // Four fingers
      hand.fingers.forEach((f, idx) => {
        const stagger = idx * 0.03;
        const perFingerPulse = drumWave
          ? (Math.sin(elapsed * 8.5 + idx * 1.15) + 1) * 0.35
          : fingerPulse;
        f.mcp.rotation.x = lerp(f.mcp.rotation.x, pose.fingerMcpX + perFingerPulse + stagger, speed);
        f.mcp.rotation.z = lerp(f.mcp.rotation.z, f.baseSplayZ * pose.fingerSplayScale, speed);
        f.pip.rotation.x = lerp(f.pip.rotation.x, pose.fingerPipX + perFingerPulse * 1.1, speed);
        f.dip.rotation.x = lerp(f.dip.rotation.x, pose.fingerDipX + perFingerPulse * 0.8, speed);
      });
    };

    const animate = () => {
      rafId = window.requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;
      const state = poseStateRef.current;
      const propSpeed = Math.min(1, dt * 10);

      const artConfig = state.articulationId
        ? ARTICULATION_3D_MAP[state.articulationId] ?? null
        : null;

      // Update contextual solid body modules (Head, Torso, Arm, Leg, Neutral Ring)
      animatePropVisibility(bodyProps.head, artConfig?.propType === 'head', propSpeed);
      animatePropVisibility(bodyProps.torso, artConfig?.propType === 'torso', propSpeed);
      animatePropVisibility(
        bodyProps.neutralSpaceRing,
        Boolean(artConfig?.showNeutralSpaceRing),
        propSpeed
      );
      animatePropVisibility(bodyProps.arm, artConfig?.propType === 'arm', propSpeed);
      animatePropVisibility(bodyProps.leg, artConfig?.propType === 'leg', propSpeed);

      if (bodyProps.neutralSpaceRing.visible) {
        bodyProps.neutralSpaceRing.rotation.z = elapsed * 0.45;
      }

      // Update Hotspot Beacon at exact landmark
      if (artConfig) {
        bodyProps.beacon.visible = true;
        const [bx, by, bz] = artConfig.hotspotPos;
        bodyProps.beacon.position.x = lerp(bodyProps.beacon.position.x, bx, propSpeed);
        bodyProps.beacon.position.y = lerp(bodyProps.beacon.position.y, by, propSpeed);
        bodyProps.beacon.position.z = lerp(bodyProps.beacon.position.z, bz, propSpeed);
        const pulse = (artConfig.beaconScale ?? 1) * (1 + Math.sin(elapsed * 5.2) * 0.14);
        bodyProps.beacon.scale.setScalar(pulse);
        bodyProps.beacon.lookAt(camera.position);
        bodyProps.beaconRingMat.color.setHex(state.isPlaying ? 0x8fc4ae : 0xd8ae5e);
        bodyProps.beaconCoreMat.color.setHex(state.isPlaying ? 0xd6ede3 : 0xf5e9cc);
      } else {
        bodyProps.beacon.visible = false;
      }

      // Smooth camera auto-framing when contextual prop enters/leaves scene
      const desiredScale = artConfig?.cameraZScale ?? 1;
      if (Math.abs(desiredScale - activeCameraZScale) > 0.005) {
        activeCameraZScale = desiredScale;
        targetCameraDist = computeIdealZ(camera.aspect || 1) * activeCameraZScale;
        smoothZoomActive = true;
      }
      if (smoothZoomActive) {
        const offset = camera.position.clone().sub(controls.target);
        const curDist = offset.length();
        const nextDist = lerp(curDist, targetCameraDist, Math.min(1, dt * 6));
        if (Math.abs(nextDist - targetCameraDist) < 0.02) {
          offset.setLength(targetCameraDist);
          smoothZoomActive = false;
        } else {
          offset.setLength(nextDist);
        }
        camera.position.copy(controls.target).add(offset);
      }

      // Subtle sage ring glow while playing
      baseRingMat.color.setHex(state.isPlaying ? 0x8fc4ae : 0xd8ae5e);
      baseRingMat.opacity = state.isPlaying
        ? 0.45 + Math.sin(elapsed * 5) * 0.15
        : 0.35;

      const rightPose = getPoseFromElis(
        state.thumbChar,
        state.fingersChar,
        state.palmChar,
        1
      );

      // In Membros (#37–#44) and Mão (#45–#51), left hand acts automatically as the support/reference target
      const useLeftAsSupport = Boolean(artConfig?.forceLeftSupport) || !state.mirrorHands;
      const leftPose = useLeftAsSupport
        ? getPoseFromElis(null, artConfig?.forceLeftSupport ? 'g' : null, null, -1)
        : getPoseFromElis(state.thumbChar, state.fingersChar, state.palmChar, -1);

      if (artConfig?.forceLeftSupport && artConfig.leftSupportRot) {
        [leftPose.wristRotX, leftPose.wristRotY, leftPose.wristRotZ] =
          artConfig.leftSupportRot;
      }

      applyHandPose(
        rightHand,
        rightPose,
        dt,
        elapsed,
        artConfig,
        state.movementId,
        true,
        state.isPlaying
      );
      applyHandPose(
        leftHand,
        leftPose,
        dt,
        elapsed,
        artConfig,
        state.movementId,
        !useLeftAsSupport,
        state.isPlaying
      );

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    };
  }, []);

  const handleResetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      const aspect = cameraRef.current.aspect || 1;
      const idealZ = Math.max(6.4, 7.7 / Math.max(aspect, 0.55));
      cameraRef.current.position.set(0, 0.3, idealZ);
      controlsRef.current.target.set(0, 0.14, 0);
      controlsRef.current.update();
    }
  };

  return (
    <div className="relative flex-1 min-h-[190px] w-full overflow-hidden">
      {/* Three.js WebGL Mount */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
        aria-label="Modelo 3D interativo de duas mãos articuladas para visualização ELiS"
      />

      {/* Motivo Acme: cantoneiras douradas emoldurando o palco 3D */}
      <div
        aria-hidden="true"
        className="acme-frame pointer-events-none absolute inset-2.5"
      />

      {/* Minimal Live Playback Pill (only shown while playing) */}
      {isPlaying && playingSign && (
        <div className="pointer-events-none absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-vida-950/80 backdrop-blur-md border border-vida-400/40 text-[11px] font-medium text-vida-200">
          <span className="w-1.5 h-1.5 rounded-full bg-vida-400 animate-ping" />
          <span>
            Tocando {playingIndex + 1}/{totalPlayingSigns}
          </span>
        </div>
      )}

      {/* Quiet Floating Controls (Top-Right) */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setMirrorHands((prev) => !prev)}
          title={
            mirrorHands
              ? 'Modo atual: 2 mãos espelhadas (clique para 1 mão + apoio)'
              : 'Modo atual: 1 mão + apoio (clique para espelhar 2 mãos)'
          }
          aria-label={mirrorHands ? 'Alternar para 1 mão + apoio' : 'Alternar para 2 mãos espelhadas'}
          className={cn(
            'flex items-center gap-1 px-2 py-1.5 rounded-xl text-[10px] font-medium backdrop-blur-md border transition-colors',
            mirrorHands
              ? 'bg-ink-900/60 border-ink-700/60 text-ink-200 hover:bg-ink-800/80'
              : 'bg-ink-900/40 border-ink-800/60 text-ink-400 hover:text-ink-200 hover:bg-ink-800/70'
          )}
        >
          <Hand className="w-3.5 h-3.5" />
          <span>{mirrorHands ? '2' : '1'}</span>
        </button>

        <button
          type="button"
          onClick={handleResetCamera}
          title="Centralizar câmera 3D"
          aria-label="Centralizar câmera 3D"
          className="p-1.5 rounded-xl bg-ink-900/60 hover:bg-ink-800/80 border border-ink-700/60 text-ink-300 backdrop-blur-md transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
