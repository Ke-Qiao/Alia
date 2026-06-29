import { useEffect, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  VRM,
  VRMExpressionPresetName,
  VRMHumanBoneName,
  VRMLoaderPlugin,
  VRMUtils,
  type VRMExpressionManager,
} from "@pixiv/three-vrm";
import type { BodyMode, CurrentMode, Emotion } from "@alia/protocol";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import type { AvatarModelLoadState } from "../../avatarAssets.ts";

interface VrmAvatarRendererProps {
  modelUrl: string;
  webMode: BodyMode;
  emotion: Emotion;
  currentMode: CurrentMode;
  onLoadStateChange: (loadState: AvatarModelLoadState) => void;
}

export function VrmAvatarRenderer(props: VrmAvatarRendererProps) {
  const { modelUrl, webMode } = props;
  const groupPosition = useMemo<[number, number, number]>(() => {
    if (webMode === "sleep") {
      return [0, -1.16, 0];
    }

    if (webMode === "rest") {
      return [0, -1.1, 0];
    }

    if (webMode === "idle") {
      return [0, -1.04, 0];
    }

    return [0, -1, 0];
  }, [webMode]);

  return (
    <div className={`vrm-avatar vrm-avatar-${webMode}`}>
      <Canvas camera={{ position: [0, 1.15, 3.15], fov: 28 }}>
        <ambientLight intensity={1.7} />
        <directionalLight position={[2.4, 3.2, 2.6]} intensity={2.2} />
        <directionalLight position={[-2, 1.2, -1.6]} intensity={0.55} />
        <group position={groupPosition} rotation={[0, Math.PI, 0]} scale={1.08}>
          <VrmModel {...props} key={modelUrl} />
        </group>
      </Canvas>
    </div>
  );
}

function VrmModel(props: VrmAvatarRendererProps) {
  const { modelUrl, webMode, emotion, currentMode, onLoadStateChange } = props;
  const [vrm, setVrm] = useState<VRM | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loadedVrm: VRM | null = null;
    const loader = new GLTFLoader();

    onLoadStateChange("loading");
    loader.setCrossOrigin("anonymous");
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.load(
      modelUrl,
      (gltf) => {
        const parsedVrm = gltf.userData.vrm;

        if (!(parsedVrm instanceof VRM)) {
          if (!cancelled) {
            onLoadStateChange("failed");
          }
          return;
        }

        if (cancelled) {
          VRMUtils.deepDispose(parsedVrm.scene);
          return;
        }

        VRMUtils.rotateVRM0(parsedVrm);
        VRMUtils.removeUnnecessaryVertices(parsedVrm.scene);
        VRMUtils.removeUnnecessaryJoints(parsedVrm.scene);
        parsedVrm.scene.traverse((object) => {
          object.frustumCulled = false;
        });

        loadedVrm = parsedVrm;
        setVrm(parsedVrm);
        onLoadStateChange("ready");
      },
      undefined,
      () => {
        if (!cancelled) {
          onLoadStateChange("failed");
        }
      },
    );

    return () => {
      cancelled = true;
      setVrm(null);

      if (loadedVrm !== null) {
        VRMUtils.deepDispose(loadedVrm.scene);
      }
    };
  }, [modelUrl, onLoadStateChange]);

  useEffect(() => {
    if (vrm === null) {
      return;
    }

    applyVrmPresentation(vrm, webMode, emotion, currentMode);
  }, [currentMode, emotion, vrm, webMode]);

  useFrame((_, delta) => {
    vrm?.update(delta);
  });

  if (vrm === null) {
    return null;
  }

  return <primitive object={vrm.scene} />;
}

function applyVrmPresentation(
  vrm: VRM,
  webMode: BodyMode,
  emotion: Emotion,
  currentMode: CurrentMode,
): void {
  vrm.humanoid.resetNormalizedPose();

  const head = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head);
  const neck = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Neck);
  const chest = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Chest);

  const headPitch = getHeadPitch(webMode);
  const chestPitch = webMode === "sleep" ? 0.12 : webMode === "rest" ? 0.08 : 0;

  if (head !== null) {
    head.rotation.x = headPitch;
  }

  if (neck !== null) {
    neck.rotation.x = headPitch * 0.35;
  }

  if (chest !== null) {
    chest.rotation.x = chestPitch;
  }

  applyVrmExpression(vrm.expressionManager, webMode, emotion, currentMode);
  vrm.update(0);
}

function getHeadPitch(webMode: BodyMode): number {
  if (webMode === "sleep") {
    return 0.58;
  }

  if (webMode === "rest") {
    return 0.42;
  }

  if (webMode === "idle") {
    return 0.16;
  }

  return -0.04;
}

function applyVrmExpression(
  expressionManager: VRMExpressionManager | undefined,
  webMode: BodyMode,
  emotion: Emotion,
  currentMode: CurrentMode,
): void {
  if (expressionManager === undefined) {
    return;
  }

  expressionManager.resetValues();

  const closedEyesWeight =
    webMode === "sleep" ? 1 : webMode === "rest" ? 0.82 : emotion === "sleepy" ? 0.45 : 0;

  setExpression(
    expressionManager,
    VRMExpressionPresetName.Blink,
    closedEyesWeight,
  );

  if (currentMode === "speaking") {
    setExpression(expressionManager, VRMExpressionPresetName.Aa, 0.32);
  }

  if (emotion === "happy") {
    setExpression(expressionManager, VRMExpressionPresetName.Happy, 0.8);
  } else if (emotion === "curious") {
    setExpression(expressionManager, VRMExpressionPresetName.Surprised, 0.28);
    setExpression(expressionManager, VRMExpressionPresetName.Relaxed, 0.22);
  } else if (emotion === "sleepy") {
    setExpression(expressionManager, VRMExpressionPresetName.Relaxed, 0.62);
  } else if (emotion === "concerned") {
    setExpression(expressionManager, VRMExpressionPresetName.Sad, 0.36);
  } else if (emotion === "neutral") {
    setExpression(expressionManager, VRMExpressionPresetName.Neutral, 0.3);
  }
}

function setExpression(
  expressionManager: VRMExpressionManager,
  expressionName: VRMExpressionPresetName | string,
  weight: number,
): void {
  if (expressionManager.getExpression(expressionName) === null) {
    return;
  }

  expressionManager.setValue(expressionName, weight);
}
