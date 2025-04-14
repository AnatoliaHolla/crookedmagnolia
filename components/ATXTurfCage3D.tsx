"use client"

import { useRef, useEffect } from "react"
import * as THREE from "three"
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer"
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass"
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass"
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

interface ATXTurfCage3DProps {
  length: number
  width: number
  height: number
  cages: number
  flipDirection: boolean
}

export default function ATXTurfCage3D({ length, width, height, cages, flipDirection }: ATXTurfCage3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const composerRef = useRef<EffectComposer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const frameIdRef = useRef<number | null>(null)
  const cagesRef = useRef<THREE.Group[]>([])
  const textLabelsRef = useRef<THREE.Mesh[]>([])
  const floorsRef = useRef<THREE.Mesh[]>([])

  // Initialize the scene
  useEffect(() => {
    if (!containerRef.current) return

    // Clean up function to handle component unmounting
    const cleanup = () => {
      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current)
      }

      if (controlsRef.current) {
        controlsRef.current.dispose()
      }

      if (rendererRef.current) {
        rendererRef.current.dispose()
        containerRef.current?.removeChild(rendererRef.current.domElement)
      }

      // Clean up scene objects
      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            if (object.geometry) object.geometry.dispose()
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach((material) => material.dispose())
              } else {
                object.material.dispose()
              }
            }
          }
        })
      }
    }

    try {
      // Create scene
      const scene = new THREE.Scene()
      sceneRef.current = scene
      scene.background = new THREE.Color(0x112218) // Dark green background

      // Create camera
      const camera = new THREE.PerspectiveCamera(
        60,
        containerRef.current.clientWidth / containerRef.current.clientHeight,
        0.1,
        1000,
      )
      cameraRef.current = camera

      // Position camera for better view of the model
      const cameraDistance = Math.max(length, width * cages, height) * 2
      camera.position.set(cameraDistance, cameraDistance, cameraDistance)
      camera.lookAt(0, 0, 0)

      // Create renderer
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
      })
      rendererRef.current = renderer
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
      renderer.shadowMap.enabled = true
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)) // Limit pixel ratio for performance

      containerRef.current.appendChild(renderer.domElement)

      // Set up post-processing for glow effect - simplified for better compatibility
      const renderScene = new RenderPass(scene, camera)

      // Add bloom pass for the glow effect with more conservative settings
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(containerRef.current.clientWidth, containerRef.current.clientHeight),
        0.5, // reduced strength
        0.2, // reduced radius
        0.9, // increased threshold
      )

      // Create composer
      const composer = new EffectComposer(renderer)
      composer.addPass(renderScene)
      composer.addPass(bloomPass)
      composerRef.current = composer

      // Add lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
      scene.add(ambientLight)

      const directionalLight = new THREE.DirectionalLight(0x00ff9d, 1.2) // Increased intensity
      directionalLight.position.set(5, 10, 7)
      scene.add(directionalLight)

      const directionalLight2 = new THREE.DirectionalLight(0x00ffcc, 0.6) // Increased intensity
      directionalLight2.position.set(-5, -10, 7)
      scene.add(directionalLight2)

      // Add point lights for extra glow
      const pointLight1 = new THREE.PointLight(0x00ff9d, 1, 100)
      pointLight1.position.set(0, 20, 0)
      scene.add(pointLight1)

      const pointLight2 = new THREE.PointLight(0x00ffcc, 0.8, 100)
      pointLight2.position.set(20, 10, 20)
      scene.add(pointLight2)

      // Create grid
      const gridHelper = new THREE.GridHelper(200, 200, 0x004d33, 0x004d33)
      gridHelper.position.y = -10
      scene.add(gridHelper)

      // Add controls
      const controls = new THREE.OrbitControls(camera, renderer.domElement)
      controlsRef.current = controls
      controls.enableDamping = true
      controls.dampingFactor = 0.05

      // Create cages
      createCages(scene, length, width, height, cages)

      // Animation loop with fallback to regular renderer
      const animate = () => {
        frameIdRef.current = requestAnimationFrame(animate)
        controls.update()

        try {
          // Try to use composer for post-processing
          if (composerRef.current) {
            composerRef.current.render()
          } else {
            // Fallback to regular renderer
            renderer.render(scene, camera)
          }
        } catch (error) {
          console.error("Error in render loop:", error)
          // Fallback to regular renderer
          renderer.render(scene, camera)
        }
      }
      animate()

      // Handle resize with error handling
      const handleResize = () => {
        if (!containerRef.current) return

        try {
          const width = containerRef.current.clientWidth
          const height = containerRef.current.clientHeight

          if (cameraRef.current) {
            cameraRef.current.aspect = width / height
            cameraRef.current.updateProjectionMatrix()
          }

          if (rendererRef.current) {
            rendererRef.current.setSize(width, height)
          }

          if (composerRef.current) {
            composerRef.current.setSize(width, height)
          }
        } catch (error) {
          console.error("Error handling resize:", error)
        }
      }

      window.addEventListener("resize", handleResize)

      // Clean up on unmount
      return () => {
        window.removeEventListener("resize", handleResize)
        cleanup()
      }
    } catch (error) {
      console.error("Error initializing 3D scene:", error)
      cleanup()
      return () => {}
    }
  }, [length, width, height, cages, flipDirection])

  // Create text texture
  function createTextTexture(text: string, width: number, height: number, rotate90 = false) {
    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d")

    if (!context) return new THREE.Texture()

    // Set canvas size - swap width and height if rotating
    if (rotate90) {
      canvas.width = height
      canvas.height = width
    } else {
      canvas.width = width
      canvas.height = height
    }

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height)

    if (rotate90) {
      // Set text properties for rotated text
      const fontSize = Math.min(width, height) * 0.3
      context.font = `bold ${fontSize}px Arial`

      // Save the current context state
      context.save()

      // Translate and rotate the context
      context.translate(canvas.width / 2, canvas.height / 2)
      context.rotate(Math.PI / 2)

      // Set text alignment for rotated text
      context.textAlign = "center"
      context.textBaseline = "middle"

      // Add gradient for better visibility
      context.fillStyle = "white"
      context.strokeStyle = "rgba(0, 0, 0, 0.5)"
      context.lineWidth = fontSize * 0.05

      // Draw rotated text
      context.strokeText(text, 0, 0)
      context.fillText(text, 0, 0)

      // Restore the context to its original state
      context.restore()
    } else {
      // Set text properties for normal text
      const fontSize = Math.min(width, height) * 0.3
      context.font = `bold ${fontSize}px Arial`
      context.textAlign = "center"
      context.textBaseline = "middle"

      // Add gradient for better visibility
      context.fillStyle = "white"
      context.strokeStyle = "rgba(0, 0, 0, 0.5)"
      context.lineWidth = fontSize * 0.05

      // Draw text
      context.strokeText(text, canvas.width / 2, canvas.height / 2)
      context.fillText(text, canvas.width / 2, canvas.height / 2)
    }

    // Create texture
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true

    return texture
  }

  // Add text to cage
  function addTextToCage(scene: THREE.Scene, length: number, width: number, height: number, xOffset = 0) {
    const text = "ATXTurf.com"

    // Create materials for each side with text
    const frontTexture = createTextTexture(text, 1024, 512)
    const backTexture = createTextTexture(text, 1024, 512)
    const leftTexture = createTextTexture(text, 1024, 512)
    const rightTexture = createTextTexture(text, 1024, 512)
    const topTexture = createTextTexture(text, 1024, 512, true) // Rotate text 90 degrees

    // Create materials with the textures
    const frontMaterial = new THREE.MeshBasicMaterial({
      map: frontTexture,
      transparent: true,
      side: THREE.DoubleSide,
    })

    const backMaterial = new THREE.MeshBasicMaterial({
      map: backTexture,
      transparent: true,
      side: THREE.DoubleSide,
    })

    const leftMaterial = new THREE.MeshBasicMaterial({
      map: leftTexture,
      transparent: true,
      side: THREE.DoubleSide,
    })

    const rightMaterial = new THREE.MeshBasicMaterial({
      map: rightTexture,
      transparent: true,
      side: THREE.DoubleSide,
    })

    const topMaterial = new THREE.MeshBasicMaterial({
      map: topTexture,
      transparent: true,
      side: THREE.DoubleSide,
    })

    // Create planes for each side
    // Front side (positive Z)
    const frontPlane = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.85, height * 0.45), frontMaterial)
    frontPlane.position.set(xOffset, 0, length / 2 + 0.1)
    frontPlane.rotation.y = Math.PI
    scene.add(frontPlane)
    textLabelsRef.current.push(frontPlane)

    // Back side (negative Z)
    const backPlane = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.85, height * 0.45), backMaterial)
    backPlane.position.set(xOffset, 0, -length / 2 - 0.1)
    scene.add(backPlane)
    textLabelsRef.current.push(backPlane)

    // Only add side labels for the first and last cage
    // Left side (negative X)
    if (xOffset === 0) {
      const leftPlane = new THREE.Mesh(new THREE.PlaneGeometry(length * 0.85, height * 0.45), leftMaterial)
      leftPlane.position.set(xOffset - width / 2 - 0.1, 0, 0)
      leftPlane.rotation.y = Math.PI / 2
      scene.add(leftPlane)
      textLabelsRef.current.push(leftPlane)
    }

    // Top side (positive Y)
    const topPlane = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.85, length * 0.85), topMaterial)
    topPlane.position.set(xOffset, height / 2 + 0.1, 0)
    topPlane.rotation.x = -Math.PI / 2
    scene.add(topPlane)
    textLabelsRef.current.push(topPlane)

    // Right side label for the last cage will be added separately
    return {
      rightTexture: rightTexture,
      rightMaterial: rightMaterial,
      length: length,
      height: height,
    }
  }

  // Create or update multiple cages
  function createCages(scene: THREE.Scene, length: number, width: number, height: number, count: number) {
    // Round values to whole numbers
    length = Math.round(length)
    width = Math.round(width)
    height = Math.round(height)

    // Remove existing cages and text labels
    cagesRef.current.forEach((cage) => scene.remove(cage))
    cagesRef.current = []

    textLabelsRef.current.forEach((label) => scene.remove(label))
    textLabelsRef.current = []

    // Remove existing floor planes
    floorsRef.current.forEach((floor) => scene.remove(floor))
    floorsRef.current = []

    // Store info for the right side label of the last cage
    let lastCageInfo: any = null

    // Create multiple cages side by side
    for (let i = 0; i < count; i++) {
      // Calculate x offset for this cage
      const xOffset = i * width - ((count - 1) * width) / 2

      // Create cage group
      const cage = new THREE.Group()

      // Create enhanced wireframe material with glow
      const wireMaterial = new THREE.LineBasicMaterial({
        color: 0x00ff9d,
        linewidth: 2, // Note: linewidth only works in WebGL2 with certain GPUs
      })

      // Create solid material with transparency
      const solidMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ff9d,
        transparent: true,
        opacity: 0.08, // Reduced opacity for better glow effect
        side: THREE.DoubleSide,
        emissive: 0x00ff9d, // Add emissive for glow
        emissiveIntensity: 0.2, // Subtle emissive intensity
      })

      // Create cage geometry
      const geometry = new THREE.BoxGeometry(width, height, length)

      // Create wireframe
      const wireframe = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), wireMaterial)

      // Create solid mesh
      const solid = new THREE.Mesh(geometry, solidMaterial)

      // Add to cage group
      cage.add(wireframe)
      cage.add(solid)

      // Position cage
      cage.position.set(xOffset, 0, 0)

      // Add cage to scene
      scene.add(cage)
      cagesRef.current.push(cage)

      // Add bright green floor inside the cage
      const floorGeometry = new THREE.PlaneGeometry(width - 0.1, length - 0.1)
      const floorMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff4c, // Bright green
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      })

      const floor = new THREE.Mesh(floorGeometry, floorMaterial)
      floor.rotation.x = Math.PI / 2 // Rotate to be horizontal
      floor.position.set(xOffset, -height / 2 + 0.05, 0) // Position at bottom of cage, slightly above

      scene.add(floor)
      floorsRef.current.push(floor)

      // Add text labels to the cage
      lastCageInfo = addTextToCage(scene, length, width, height, xOffset)
    }

    // Add right side label for the last cage
    if (lastCageInfo && count > 0) {
      const rightPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(lastCageInfo.length * 0.85, lastCageInfo.height * 0.45),
        lastCageInfo.rightMaterial,
      )
      const lastXOffset = (count - 1) * width - ((count - 1) * width) / 2
      rightPlane.position.set(lastXOffset + width / 2 + 0.1, 0, 0)
      rightPlane.rotation.y = -Math.PI / 2
      scene.add(rightPlane)
      textLabelsRef.current.push(rightPlane)
    }

    // Adjust camera position based on number of cages
    if (cameraRef.current) {
      if (count > 1) {
        const totalWidth = count * width
        cameraRef.current.position.set(totalWidth * 0.7, totalWidth * 0.8, totalWidth * 0.9)
        cameraRef.current.lookAt(0, 0, 0)
      } else {
        cameraRef.current.position.set(50, 60, 70)
        cameraRef.current.lookAt(0, 0, 0)
      }
    }
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-[200px] md:h-[600px] relative" // Increased height for desktop (3x)
      style={{ touchAction: "none" }} // Prevent touch actions for better control on mobile
    >
      {/* Powered by ATXTurf */}
      <div className="absolute top-1 left-1 bg-[rgba(10,26,18,0.8)] p-2 rounded text-xs text-[#e0ffe9] border-l-2 border-[#008f39] z-10">
        Powered by <span className="text-[#008f39] font-semibold">ATXTurf, LLC</span>
      </div>

      {/* Instructions overlay */}
      <div className="absolute top-1 right-1 bg-[rgba(10,26,18,0.8)] p-2 rounded text-xs text-[#e0ffe9]">
        Drag to rotate | Pinch to zoom
      </div>

      {/* Dimensions display */}
      <div className="absolute bottom-1 left-1 bg-[rgba(10,26,18,0.8)] p-2 rounded text-xs text-[#e0ffe9] border-l-2 border-[#00ff9d]">
        Length: {length} ft × Width: {width} ft × Height: {height} ft × Count: {cages}
      </div>
    </div>
  )
}
