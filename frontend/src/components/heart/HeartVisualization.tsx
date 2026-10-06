import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import { RotateCcw } from 'lucide-react'
import {
  Box3,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Vector3,
} from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { VesselKey, VisualizationBand } from '../../types/api'
import { formatPercent } from '../../utils/riskBands'
import { vesselPresentation } from '../../utils/vesselVisualization'

const MODEL_PATH = '/models/heart/processed/cardiotwin_heart.glb'
const VESSELS: VesselKey[] = ['LAD', 'LCX', 'RCA']
const INITIAL_CAMERA = new Vector3(0.58, 0.24, 3.55)
const INITIAL_TARGET = new Vector3(0, -0.16, 0)
const TOOLTIP_WIDTH = 244
const TOOLTIP_HEIGHT = 104

interface HeartVisualizationProps {
  ladRisk?: number
  lcxRisk?: number
  rcaRisk?: number
  ladBand?: VisualizationBand
  lcxBand?: VisualizationBand
  rcaBand?: VisualizationBand
  ladThreshold?: number
  lcxThreshold?: number
  rcaThreshold?: number
  selectedVessel?: VesselKey | null
  onSelectVessel?: (vessel: VesselKey) => void
}

interface TooltipState {
  vessel: VesselKey
  x: number
  y: number
}

const vesselLabels: Record<VesselKey, string> = {
  LAD: 'Left Anterior Descending',
  LCX: 'Left Circumflex',
  RCA: 'Right Coronary Artery',
}

class HeartModelErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full min-h-[360px] items-center justify-center rounded-lg bg-slate-50 px-6 text-center">
          <div>
            <p className="text-base font-semibold text-slate-950">3D anatomical model unavailable.</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">CAD and vessel risk results remain available in the text panels.</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function LoadingModel() {
  return (
    <div className="flex h-full min-h-[360px] items-center justify-center rounded-lg bg-slate-50 px-6 text-center">
      <div>
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-rose-700" />
        <p className="mt-4 text-sm font-semibold text-slate-950">Loading anatomical heart model...</p>
      </div>
    </div>
  )
}

function makeMaterial(name: string, color: string, options: Partial<MeshStandardMaterial> = {}) {
  return new MeshStandardMaterial({
    name,
    color: new Color(color),
    roughness: 0.54,
    metalness: 0.02,
    side: DoubleSide,
    ...options,
  })
}

function applyMaterial(object: Object3D, material: MeshStandardMaterial) {
  object.traverse((child) => {
    if (child instanceof Mesh) {
      child.material = material.clone()
      child.castShadow = false
      child.receiveShadow = false
    }
  })
}

function cloneMeshMaterials(object: Object3D) {
  object.traverse((child) => {
    if (child instanceof Mesh && child.material instanceof MeshStandardMaterial) {
      child.material = child.material.clone()
    }
  })
}

function vesselFromObject(object: Object3D): VesselKey | null {
  let current: Object3D | null = object
  while (current) {
    const vessel = current.userData.vessel
    if (vessel === 'LAD' || vessel === 'LCX' || vessel === 'RCA') {
      return vessel
    }
    current = current.parent
  }
  return null
}

function vesselFromEvent(event: ThreeEvent<MouseEvent | PointerEvent>) {
  return vesselFromObject(event.object)
}

function HeartModel({
  risks,
  bands,
  selectedVessel,
  hoveredVessel,
  onHover,
  onLeave,
  onSelect,
}: {
  risks: Record<VesselKey, number>
  bands: Record<VesselKey, VisualizationBand>
  selectedVessel: VesselKey | null
  hoveredVessel: VesselKey | null
  onHover: (vessel: VesselKey, x: number, y: number) => void
  onLeave: () => void
  onSelect: (vessel: VesselKey) => void
}) {
  const gltf = useGLTF(MODEL_PATH) as unknown as { scene: Group }

  const scene = useMemo(() => {
    const cloned = gltf.scene.clone(true)
    const heartBody = cloned.getObjectByName('HeartBody')
    const aorta = cloned.getObjectByName('Aorta')
    const leftCoronaryStem = cloned.getObjectByName('LeftCoronaryStem')

    if (heartBody) {
      applyMaterial(
        heartBody,
        makeMaterial('Heart tissue', '#be6b72', {
          transparent: true,
          opacity: 0.84,
          roughness: 0.66,
          metalness: 0,
          depthWrite: true,
          depthTest: true,
        }),
      )
    }
    if (aorta) {
      applyMaterial(aorta, makeMaterial('Aorta and great vessels', '#d9777f', { opacity: 0.82, transparent: true, roughness: 0.58 }))
    }
    if (leftCoronaryStem) {
      applyMaterial(leftCoronaryStem, makeMaterial('Left coronary stem', '#f8fafc', { emissive: new Color('#475569'), emissiveIntensity: 0.18 }))
    }
    for (const vessel of VESSELS) {
      const vesselObject = cloned.getObjectByName(vessel)
      if (vesselObject) {
        cloneMeshMaterials(vesselObject)
      }
      vesselObject?.traverse((child) => {
        child.userData.vessel = vessel
      })
    }
    return cloned
  }, [gltf.scene])

  useEffect(() => {
    for (const vessel of VESSELS) {
      const object = scene.getObjectByName(vessel)
      if (!object) {
        continue
      }
      const presentation = vesselPresentation(risks[vessel], bands[vessel], selectedVessel === vessel, hoveredVessel === vessel)
      object.traverse((child) => {
        if (child instanceof Mesh) {
          const material = child.material instanceof MeshStandardMaterial ? child.material : new MeshStandardMaterial()
          material.color.set(presentation.color)
          material.emissive.set(presentation.emissive)
          material.emissiveIntensity = presentation.emissiveIntensity
          material.opacity = presentation.opacity
          material.transparent = presentation.opacity < 1
          material.roughness = presentation.roughness
          material.metalness = presentation.metalness
          material.depthWrite = true
          material.depthTest = true
          material.needsUpdate = true
        }
      })
    }
  }, [bands, hoveredVessel, risks, scene, selectedVessel])

  return (
    <group rotation={[0.1, -0.42, 0]} scale={0.93}>
      <primitive
        object={scene}
        onClick={(event: ThreeEvent<MouseEvent>) => {
          const vessel = vesselFromEvent(event)
          if (!vessel) {
            return
          }
          event.stopPropagation()
          onSelect(vessel)
        }}
        onPointerMove={(event: ThreeEvent<PointerEvent>) => {
          const vessel = vesselFromEvent(event)
          if (!vessel) {
            return
          }
          event.stopPropagation()
          onHover(vessel, event.nativeEvent.clientX, event.nativeEvent.clientY)
        }}
        onPointerOver={(event: ThreeEvent<PointerEvent>) => {
          const vessel = vesselFromEvent(event)
          if (!vessel) {
            return
          }
          event.stopPropagation()
          document.body.style.cursor = 'pointer'
          onHover(vessel, event.nativeEvent.clientX, event.nativeEvent.clientY)
        }}
        onPointerOut={(event: ThreeEvent<PointerEvent>) => {
          if (!vesselFromEvent(event)) {
            return
          }
          event.stopPropagation()
          document.body.style.cursor = ''
          onLeave()
        }}
      />
    </group>
  )
}

function CameraControls({
  selectedVessel,
  focusSignal,
  resetSignal,
}: {
  selectedVessel: VesselKey | null
  focusSignal: number
  resetSignal: number
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const { camera, scene } = useThree()

  useEffect(() => {
    const perspectiveCamera = camera as PerspectiveCamera
    perspectiveCamera.position.copy(INITIAL_CAMERA)
    perspectiveCamera.near = 0.01
    perspectiveCamera.far = 100
    perspectiveCamera.updateProjectionMatrix()
    if (controlsRef.current) {
      controlsRef.current.target.copy(INITIAL_TARGET)
      controlsRef.current.update()
    }
  }, [camera, resetSignal])

  useEffect(() => {
    if (!selectedVessel || focusSignal === 0 || !controlsRef.current) {
      return
    }
    const vesselObject = scene.getObjectByName(selectedVessel)
    if (!vesselObject) {
      return
    }
    const box = new Box3().setFromObject(vesselObject)
    const center = box.getCenter(new Vector3())
    const size = box.getSize(new Vector3())
    const maxSize = Math.max(size.x, size.y, size.z, 0.25)
    const direction = new Vector3(0.45, 0.28, 1).normalize()
    camera.position.copy(center.clone().add(direction.multiplyScalar(maxSize * 3.3)))
    camera.lookAt(center)
    controlsRef.current.target.copy(center)
    controlsRef.current.update()
  }, [camera, focusSignal, scene, selectedVessel])

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.65}
      zoomSpeed={0.7}
      minDistance={0.9}
      maxDistance={5}
      target={INITIAL_TARGET}
      touches={{ ONE: 0, TWO: 2 }}
    />
  )
}

function bandLabel(band?: VisualizationBand) {
  if (!band) {
    return 'Awaiting analysis'
  }
  return band.charAt(0).toUpperCase() + band.slice(1)
}

export function HeartVisualization({
  ladRisk = 0,
  lcxRisk = 0,
  rcaRisk = 0,
  ladBand = 'low',
  lcxBand = 'low',
  rcaBand = 'low',
  ladThreshold,
  lcxThreshold,
  rcaThreshold,
  selectedVessel = null,
  onSelectVessel,
}: HeartVisualizationProps) {
  const viewerRef = useRef<HTMLDivElement | null>(null)
  const [hoveredVessel, setHoveredVessel] = useState<VesselKey | null>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [resetSignal, setResetSignal] = useState(0)
  const [focusSignal, setFocusSignal] = useState(0)

  const risks: Record<VesselKey, number> = { LAD: ladRisk, LCX: lcxRisk, RCA: rcaRisk }
  const bands: Record<VesselKey, VisualizationBand> = { LAD: ladBand, LCX: lcxBand, RCA: rcaBand }
  const thresholds: Record<VesselKey, number | undefined> = { LAD: ladThreshold, LCX: lcxThreshold, RCA: rcaThreshold }
  const selected = selectedVessel ?? 'LAD'

  function clearHover() {
    setHoveredVessel(null)
    setTooltip(null)
  }

  function showTooltip(vessel: VesselKey, clientX: number, clientY: number) {
    const bounds = viewerRef.current?.getBoundingClientRect()
    if (!bounds) {
      return
    }
    const x = Math.max(8, Math.min(clientX - bounds.left + 14, bounds.width - TOOLTIP_WIDTH - 8))
    const y = Math.max(8, Math.min(clientY - bounds.top - 18, bounds.height - TOOLTIP_HEIGHT - 8))
    setHoveredVessel(vessel)
    setTooltip({ vessel, x, y })
  }

  useEffect(() => {
    window.addEventListener('scroll', clearHover, true)
    window.addEventListener('blur', clearHover)
    return () => {
      window.removeEventListener('scroll', clearHover, true)
      window.removeEventListener('blur', clearHover)
    }
  }, [])

  function handleSelect(vessel: VesselKey) {
    onSelectVessel?.(vessel)
  }

  function handleFocus(vessel: VesselKey) {
    handleSelect(vessel)
    setFocusSignal((value) => value + 1)
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-700">Interactive anatomical visualization</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-950">CardioTwin 3D heart</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">BodyParts3D-derived generic heart anatomy.</p>
        </div>
        <button
          type="button"
          onClick={() => setResetSignal((value) => value + 1)}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-200"
          aria-label="Reset 3D heart view"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Reset View
        </button>
      </div>

      <div ref={viewerRef} className="relative mt-5 h-[360px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50 sm:h-[460px] xl:h-[520px]" onPointerLeave={clearHover}>
        <HeartModelErrorBoundary>
          <Suspense fallback={<LoadingModel />}>
            <Canvas
              camera={{ position: INITIAL_CAMERA.toArray(), fov: 38, near: 0.01, far: 100 }}
              gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
              aria-label="Interactive generic anatomical heart visualization"
              onPointerMissed={clearHover}
              onPointerLeave={clearHover}
            >
              <color attach="background" args={['#f8fafc']} />
              <ambientLight intensity={1.2} />
              <directionalLight position={[3.5, 4.5, 5]} intensity={2.05} />
              <directionalLight position={[-3, 1.5, 2]} intensity={0.72} />
              <directionalLight position={[-2, 2, -3]} intensity={0.38} />
              <hemisphereLight args={['#ffffff', '#e2e8f0', 1.1]} />
              <HeartModel
                risks={risks}
                bands={bands}
                selectedVessel={selectedVessel}
                hoveredVessel={hoveredVessel}
                onSelect={handleSelect}
                onHover={(vessel, x, y) => {
                  showTooltip(vessel, x, y)
                }}
                onLeave={clearHover}
              />
              <CameraControls selectedVessel={selectedVessel} focusSignal={focusSignal} resetSignal={resetSignal} />
            </Canvas>
          </Suspense>
        </HeartModelErrorBoundary>

        {tooltip ? (
          <div
            className="pointer-events-none absolute z-10 w-[244px] rounded-md border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-700 shadow-lg"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <p className="font-semibold text-slate-950">
              {tooltip.vessel} <span className="font-normal text-slate-500">{vesselLabels[tooltip.vessel]}</span>
            </p>
            <p className="mt-1">Model-estimated stenosis probability: {formatPercent(risks[tooltip.vessel])}</p>
            <p>Visualization band: {bandLabel(bands[tooltip.vessel])}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Focus vessel</p>
        <div className="inline-flex w-full rounded-md border border-slate-200 bg-slate-50 p-1 sm:w-auto" role="group" aria-label="Focus coronary vessel">
          {VESSELS.map((vessel) => (
            <button
              key={vessel}
              type="button"
              onClick={() => handleFocus(vessel)}
              className={`min-w-0 flex-1 rounded px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-rose-200 sm:flex-none ${
                selected === vessel ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-950'
              }`}
              aria-label={`Select ${vesselLabels[vessel]} in 3D heart`}
            >
              {vessel}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 border-t border-slate-200 pt-4">
        <p className="text-sm font-semibold text-slate-950">
          {selected} <span className="font-normal text-slate-500">- {vesselLabels[selected]}</span>
        </p>
        <div className="mt-2 grid gap-x-5 gap-y-1 text-sm sm:grid-cols-3">
          <div>
            <span className="text-slate-500">Predicted risk: </span><span className="font-semibold text-slate-950">{formatPercent(risks[selected])}</span>
          </div>
          <div>
            <span className="text-slate-500">Threshold: </span><span className="font-semibold text-slate-950">{thresholds[selected] === undefined ? 'N/A' : formatPercent(thresholds[selected])}</span>
          </div>
          <div>
            <span className="text-slate-500">Visualization band: </span><span className="font-semibold text-slate-950">{bandLabel(bands[selected])}</span>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs leading-4 text-slate-500">
        Vessel highlighting represents model-estimated stenosis probability. Greater visual emphasis indicates higher model probability.
        Highlighting does not represent measured physical narrowing.
      </p>
    </section>
  )
}

useGLTF.preload(MODEL_PATH)
