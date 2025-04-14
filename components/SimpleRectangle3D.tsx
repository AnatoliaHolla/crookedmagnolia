"use client"

import { useRef, useEffect } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

interface SimpleRectangle3DProps {
  length: number
  width: number
  height: number
  cages: number
  flipDirection: boolean
}

export default function SimpleRectangle3D({ length, width, height, cages, flipDirection }: SimpleRectangle3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const frameIdRef = useRef<number | null>(null)

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
      scene.background = new THREE.Color(0x051505) // Dark green background

      // Create camera
      const camera = new THREE.PerspectiveCamera(
        50,
        containerRef.current.clientWidth / containerRef.current.clientHeight,
        0.1,
        1000,
      )
      cameraRef.current = camera
      camera.position.set(length * 0.8, height * 1.2, width * cages * 1.2)
      camera.lookAt(length / 2, height / 2, (width * cages) / 2)

      // Create renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true })
      rendererRef.current = renderer
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
      renderer.shadowMap.enabled = true
      containerRef.current.appendChild(renderer.domElement)

      // Add lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
      scene.add(ambientLight)

      const pointLight = new THREE.PointLight(0xffffff, 1.5)
      pointLight.position.set(10, 10, 10)
      pointLight.castShadow = true
      scene.add(pointLight)

      const pointLight2 = new THREE.PointLight(0xffffff, 0.5)
      pointLight2.position.set(-10, -10, -10)
      scene.add(pointLight2)

      // Add controls
      const controls = new OrbitControls(camera, renderer.domElement)
      controlsRef.current = controls
      controls.enableDamping = true
      controls.dampingFactor = 0.25
      controls.enableZoom = true
      controls.minDistance = 5
      controls.maxDistance = 200

      // Create cages
      createCages(scene, length, width, height, cages, flipDirection)

      // Animation loop
      const animate = () => {
        frameIdRef.current = requestAnimationFrame(animate)
        controls.update()
        renderer.render(scene, camera)
      }
      animate()

      // Handle resize
      const handleResize = () => {
        if (!containerRef.current) return

        const width = containerRef.current.clientWidth
        const height = containerRef.current.clientHeight

        if (cameraRef.current) {
          cameraRef.current.aspect = width / height
          cameraRef.current.updateProjectionMatrix()
        }

        if (rendererRef.current) {
          rendererRef.current.setSize(width, height)
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

  // Function to create cage objects
  function createCages(
    scene: THREE.Scene,
    length: number,
    width: number,
    height: number,
    cages: number,
    flipDirection: boolean,
  ) {
    for (let i = 0; i < cages; i++) {
      const offset = i * width

      // Create cage group
      const cageGroup = new THREE.Group()
      scene.add(cageGroup)
      cageGroup.position.set(0, 0, offset)

      // Floor (bright green)
      const floorGeometry = new THREE.PlaneGeometry(length, width)
      const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x00cc00, side: THREE.DoubleSide })
      const floor = new THREE.Mesh(floorGeometry, floorMaterial)
      floor.rotation.x = -Math.PI / 2
      floor.position.set(length / 2, 0, width / 2)
      floor.receiveShadow = true
      cageGroup.add(floor)

      // Add "ATXTurf.com" text using a simple approach
      const canvas = document.createElement("canvas")
      canvas.width = 512
      canvas.height = 128
      const context = canvas.getContext("2d")
      if (context) {
        context.fillStyle = "white"
        context.font = "bold 64px Arial"
        context.textAlign = "center"
        context.textBaseline = "middle"
        context.fillText("ATXTurf.com", 256, 64)

        const textTexture = new THREE.CanvasTexture(canvas)
        const textMaterial = new THREE.MeshBasicMaterial({
          map: textTexture,
          transparent: true,
          side: THREE.DoubleSide,
        })
        const textGeometry = new THREE.PlaneGeometry(length * 0.6, length * 0.15)
        const textMesh = new THREE.Mesh(textGeometry, textMaterial)
        textMesh.rotation.x = -Math.PI / 2
        textMesh.position.set(length / 2, 0.01, width / 2)
        cageGroup.add(textMesh)
      }

      // Add roll lines
      const lineCount = Math.ceil(flipDirection ? length / 15 : width / 15)
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 })

      for (let j = 0; j < lineCount; j++) {
        const linePosition = j * 15
        let points: THREE.Vector3[]

        if (flipDirection) {
          // Lines run along the width
          points = [new THREE.Vector3(linePosition, 0.01, 0), new THREE.Vector3(linePosition, 0.01, width)]
        } else {
          // Lines run along the length
          points = [new THREE.Vector3(0, 0.01, linePosition), new THREE.Vector3(length, 0.01, linePosition)]
        }

        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points)
        const line = new THREE.Line(lineGeometry, lineMaterial)
        cageGroup.add(line)
      }

      // Ceiling (light gray netting)
      const ceilingGeometry = new THREE.PlaneGeometry(length, width)
      const ceilingMaterial = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5,
        wireframe: true,
      })
      const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial)
      ceiling.rotation.x = -Math.PI / 2
      ceiling.position.set(length / 2, height, width / 2)
      cageGroup.add(ceiling)

      // Left wall
      const leftWallGeometry = new THREE.PlaneGeometry(width, height)
      const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5,
        wireframe: true,
      })
      const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial)
      leftWall.rotation.y = Math.PI / 2
      leftWall.position.set(0, height / 2, width / 2)
      cageGroup.add(leftWall)

      // Right wall (only for last cage)
      if (i === cages - 1) {
        const rightWallGeometry = new THREE.PlaneGeometry(width, height)
        const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial)
        rightWall.rotation.y = -Math.PI / 2
        rightWall.position.set(length, height / 2, width / 2)
        cageGroup.add(rightWall)
      }

      // Front wall
      const frontWallGeometry = new THREE.PlaneGeometry(length, height)
      const frontWall = new THREE.Mesh(frontWallGeometry, wallMaterial)
      frontWall.position.set(length / 2, height / 2, 0)
      cageGroup.add(frontWall)

      // Back wall
      const backWallGeometry = new THREE.PlaneGeometry(length, height)
      const backWall = new THREE.Mesh(backWallGeometry, wallMaterial)
      backWall.rotation.y = Math.PI
      backWall.position.set(length / 2, height / 2, width)
      cageGroup.add(backWall)

      // Add cage frame edges
      addCageFrame(cageGroup, length, width, height)
    }
  }

  // Function to add cage frame edges
  function addCageFrame(group: THREE.Group, length: number, width: number, height: number) {
    const edgeColor = 0x00ff00
    const edgeThickness = 0.1

    // Create edges using cylinders
    const createEdge = (start: THREE.Vector3, end: THREE.Vector3) => {
      const direction = new THREE.Vector3().subVectors(end, start)
      const edgeLength = direction.length()
      direction.normalize()

      const edgeGeometry = new THREE.CylinderGeometry(edgeThickness, edgeThickness, edgeLength, 8)
      const edgeMaterial = new THREE.MeshStandardMaterial({ color: edgeColor })
      const edge = new THREE.Mesh(edgeGeometry, edgeMaterial)

      // Position at midpoint
      const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
      edge.position.copy(midpoint)

      // Orient along direction
      const quaternion = new THREE.Quaternion()
      const upVector = new THREE.Vector3(0, 1, 0)

      // Handle vertical edges specially
      if (Math.abs(direction.y) > 0.99) {
        // Already aligned with Y axis, no rotation needed
      } else {
        // For non-vertical edges
        const rotationMatrix = new THREE.Matrix4()
        rotationMatrix.lookAt(new THREE.Vector3(0, 0, 0), direction, upVector)
        quaternion.setFromRotationMatrix(rotationMatrix)
        edge.quaternion.copy(quaternion)
        edge.rotateX(Math.PI / 2) // Adjust for cylinder's default orientation
      }

      group.add(edge)
    }

    // Bottom frame
    createEdge(new THREE.Vector3(0, 0, 0), new THREE.Vector3(length, 0, 0))
    createEdge(new THREE.Vector3(length, 0, 0), new THREE.Vector3(length, 0, width))
    createEdge(new THREE.Vector3(length, 0, width), new THREE.Vector3(0, 0, width))
    createEdge(new THREE.Vector3(0, 0, width), new THREE.Vector3(0, 0, 0))

    // Top frame
    createEdge(new THREE.Vector3(0, height, 0), new THREE.Vector3(length, height, 0))
    createEdge(new THREE.Vector3(length, height, 0), new THREE.Vector3(length, height, width))
    createEdge(new THREE.Vector3(length, height, width), new THREE.Vector3(0, height, width))
    createEdge(new THREE.Vector3(0, height, width), new THREE.Vector3(0, height, 0))

    // Vertical edges
    createEdge(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, height, 0))
    createEdge(new THREE.Vector3(length, 0, 0), new THREE.Vector3(length, height, 0))
    createEdge(new THREE.Vector3(length, 0, width), new THREE.Vector3(length, height, width))
    createEdge(new THREE.Vector3(0, 0, width), new THREE.Vector3(0, height, width))
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-[200px] relative"
      style={{ touchAction: "none" }} // Prevent touch actions for better control on mobile
    >
      {/* Instructions overlay */}
      <div className="absolute bottom-1 right-1 text-[#00ff00] text-xs bg-black/50 p-1 rounded">
        Click + drag to rotate | Scroll to zoom
      </div>
    </div>
  )
}
