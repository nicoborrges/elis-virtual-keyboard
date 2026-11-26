import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RotateCcw, Hand } from 'lucide-react';
import type { StepNumber, VisografemaItem } from '../data/elisMap';
import { ARTICULATION_3D_MAP, type Articulation3DConfig } from '../data/articulation3DMap';
import { createBodyContextProps } from './scene/BodyContextProps';
import type { CompletedSign, SlotEntry } from './VisorArea';
import { cn } from '../utils/cn';
import {
  createArticulatedHand,
  getPoseFromElis,
  type HandPoseTargets,
  type HandRig,
} from './scene/handRig';

interface Hands3DCanvasProps {
  slots: Record<StepNumber, SlotEntry>;
  hoveredItem: VisografemaItem | null;
  isPlaying: boolean;
  playingSign: CompletedSign | null;
  playingIndex: number;
  totalPlayingSigns: number;
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
