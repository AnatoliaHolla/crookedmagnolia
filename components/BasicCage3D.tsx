"use client"

import { useRef, useEffect, useState } from "react"
import dynamic from "next/dynamic"

// Define the props interface outside of the component
interface BasicCage3DProps {
  length: number
  width: number
  height: number
  cages: number
  flipDirection: boolean
}

// Create a simple fallback component
function Fallback({ length, width, height, cages }: BasicCage3DProps) {
  return (
    <div className="w-full h-[200px] md:h-[600px] bg-[rgba(10,26,18,0.8)] rounded-lg border border-[#00ff9d] flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="inline-block w-8 h-8 border-2 border-[#00ff9d] border-t-transparent rounded-full animate-spin mb-2"></div>
        <div className="text-[#e0ffe9]">Loading 3D model...</div>
        <div className="text-[#e0ffe9] text-xs mt-2">
          Length: {length}' × Width: {width}' × Height: {height}' × Count: {cages}
        </div>
      </div>
    </div>
  )
}

// Create a simplified 2D representation as a fallback
function SimplifiedView({ length, width, height, cages }: BasicCage3DProps) {
  return (
    <div className="w-full h-[200px] md:h-[600px] bg-[rgba(10,26,18,0.8)] rounded-lg border border-[#00ff9d] flex flex-col items-center justify-center p-4">
      <div className="text-[#00ff9d] mb-4 text-center">Batting Cage Visualization</div>

      {/* Simple 2D representation */}
      <div className="relative w-3/4 h-24 border-2 border-[#00ff9d] bg-[#005500] flex items-center justify-center">
        <span className="text-white font-bold text-sm">ATXTurf.com</span>

        {/* Maroon rectangle with white square */}
        <div className="absolute top-1/2 left-8 transform -translate-y-1/2 w-12 h-6 bg-[#800000]">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white"></div>
        </div>
      </div>

      {/* Cage dimensions */}
      <div className="mt-4 text-center text-[#00ff9d] text-sm">
        {length}' × {width}' × {height}' ({cages} cage{cages > 1 ? "s" : ""})
      </div>

      <div className="mt-4 text-center text-[#e0ffe9] text-xs">
        3D visualization is available when viewing on your device
      </div>
    </div>
  )
}

// Create the main component with error handling
function BasicCage3D({ length, width, height, cages, flipDirection }: BasicCage3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [threejsSupported, setThreejsSupported] = useState(true)

  // Initialize the scene
  useEffect(() => {
    if (!containerRef.current) return

    // Check if we're in a browser environment that supports WebGL
    if (typeof window === "undefined") {
      setThreejsSupported(false)
      return
    }

    let cleanup = () => {}
    let frameId: number | null = null

    const initScene = async () => {
      try {
        // Safely check for WebGL support
        const canvas = document.createElement("canvas")
        const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl")

        if (!gl) {
          console.error("WebGL not supported")
          setThreejsSupported(false)
          setError("WebGL not supported by your browser")
          return
        }

        // Dynamically import Three.js modules with error handling
        let THREE, OrbitControls
        try {
          THREE = await import("three")
          const OrbitControlsModule = await import("three/examples/jsm/controls/OrbitControls")
          OrbitControls = OrbitControlsModule.OrbitControls
        } catch (err) {
          console.error("Failed to load Three.js:", err)
          setThreejsSupported(false)
          setError("Failed to load 3D libraries")
          return
        }

        console.log("Three.js loaded successfully")

        // Create scene
        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0x112218) // Dark green background

        // Create camera
        const camera = new THREE.PerspectiveCamera(
          75, // Wider field of view
          containerRef.current.clientWidth / containerRef.current.clientHeight,
          0.1,
          2000, // Increased far plane to see the larger grid
        )

        // Create renderer with error handling
        let renderer
        try {
          renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: "default", // Less demanding setting
          })
          renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
          containerRef.current.appendChild(renderer.domElement)
        } catch (err) {
          console.error("Failed to create WebGL renderer:", err)
          setThreejsSupported(false)
          setError("Failed to initialize 3D renderer")
          return
        }

        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
        scene.add(ambientLight)

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
        directionalLight.position.set(10, 10, 10)
        scene.add(directionalLight)

        // Add a much larger grid for reference - 500x500 with 50 divisions
        const gridSize = 500
        const gridDivisions = 50
        const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x004d33, 0x004d33)
        scene.add(gridHelper)

        // Create a group to hold all cages
        const cageGroup = new THREE.Group()
        scene.add(cageGroup)

        // Create cages
        createCages(THREE, cageGroup, length, width, height, cages)

        // Center the cage group on the grid
        // For a single cage, center it exactly
        // For multiple cages, ensure they're centered as a group
        const totalWidth = width * cages
        cageGroup.position.set(
          -length / 2, // Center on X axis
          0, // Keep on the ground
          -totalWidth / 2, // Center on Z axis
        )

        // Calculate a good camera position based on the dimensions - zoomed in by ~50%
        const maxDimension = Math.max(length, width * cages, height)
        const distance = maxDimension * 1.0 // Reduced from 1.5 for closer view

        // Position the camera at an angle to see the cage(s) properly - closer
        camera.position.set(length * 0.5, height * 0.8, width * cages * 0.8) // Reduced values for closer view
        camera.lookAt(0, height / 2, 0) // Look at the center of the cage(s)

        // Add controls
        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.05
        controls.target.set(0, height / 2, 0) // Look at the center of the cage(s)
        controls.maxDistance = 500 // Reduced to match the closer default view

        // Animation loop with error handling
        const animate = () => {
          try {
            frameId = requestAnimationFrame(animate)
            controls.update()
            renderer.render(scene, camera)
          } catch (err) {
            console.error("Error in animation loop:", err)
            if (frameId !== null) {
              cancelAnimationFrame(frameId)
              frameId = null
            }
          }
        }

        // Start animation with error handling
        try {
          animate()
        } catch (err) {
          console.error("Failed to start animation:", err)
          setError("Failed to start 3D animation")
        }

        // Handle resize
        const handleResize = () => {
          if (!containerRef.current) return

          try {
            const width = containerRef.current.clientWidth
            const height = containerRef.current.clientHeight

            camera.aspect = width / height
            camera.updateProjectionMatrix()
            renderer.setSize(width, height)
          } catch (err) {
            console.error("Error handling resize:", err)
          }
        }

        window.addEventListener("resize", handleResize)

        // Set up cleanup function
        cleanup = () => {
          if (frameId !== null) {
            cancelAnimationFrame(frameId)
          }

          try {
            controls.dispose()
          } catch (err) {
            console.error("Error disposing controls:", err)
          }

          if (containerRef.current && renderer.domElement) {
            try {
              containerRef.current.removeChild(renderer.domElement)
            } catch (err) {
              console.error("Error removing renderer:", err)
            }
          }

          try {
            renderer.dispose()
          } catch (err) {
            console.error("Error disposing renderer:", err)
          }

          window.removeEventListener("resize", handleResize)
        }

        setLoaded(true)
      } catch (err) {
        console.error("Failed to initialize Three.js:", err)
        setThreejsSupported(false)
        setError(err instanceof Error ? err.message : "Failed to load 3D visualization")
      }
    }

    initScene()

    // Clean up on unmount
    return () => cleanup()
  }, [length, width, height, cages, flipDirection])

  // Function to create multiple cages side by side
  function createCages(THREE: any, group: any, length: number, width: number, height: number, cageCount: number) {
    // Ensure positive dimensions
    length = Math.max(1, length)
    width = Math.max(1, width)
    height = Math.max(1, height)
    cageCount = Math.max(1, cageCount)

    console.log("Creating", cageCount, "cages with dimensions:", { length, width, height })

    // Create wireframe material with bright green color for the frame
    const frameMaterial = new THREE.LineBasicMaterial({ color: 0x00ff9d, linewidth: 2 })

    // Create netting material (light gray, transparent, NO wireframe)
    const nettingMaterial = new THREE.MeshBasicMaterial({
      color: 0xcccccc,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3, // Slightly more transparent
      wireframe: false, // No diagonal lines
    })

    // Create floor material (bright green, semi-transparent)
    const floorMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff4c,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
    })

    // Create multiple cages side by side
    for (let i = 0; i < cageCount; i++) {
      // Position each cage along the Z-axis
      const zPosition = i * width

      // Create cage frame edges
      const edges = [
        // Bottom rectangle
        [0, 0, zPosition, length, 0, zPosition],
        [length, 0, zPosition, length, 0, zPosition + width],
        [length, 0, zPosition + width, 0, 0, zPosition + width],
        [0, 0, zPosition + width, 0, 0, zPosition],

        // Top rectangle
        [0, height, zPosition, length, height, zPosition],
        [length, height, zPosition, length, height, zPosition + width],
        [length, height, zPosition + width, 0, height, zPosition + width],
        [0, height, zPosition + width, 0, height, zPosition],

        // Vertical edges
        [0, 0, zPosition, 0, height, zPosition],
        [length, 0, zPosition, length, height, zPosition],
        [length, 0, zPosition + width, length, height, zPosition + width],
        [0, 0, zPosition + width, 0, height, zPosition + width],
      ]

      // Create lines for each edge with bright green color
      edges.forEach((edge) => {
        const points = [new THREE.Vector3(edge[0], edge[1], edge[2]), new THREE.Vector3(edge[3], edge[4], edge[5])]
        const geometry = new THREE.BufferGeometry().setFromPoints(points)
        const line = new THREE.Line(geometry, frameMaterial)
        group.add(line)
      })

      // Add floor
      const floorGeometry = new THREE.PlaneGeometry(length, width)
      const floor = new THREE.Mesh(floorGeometry, floorMaterial)
      floor.rotation.x = -Math.PI / 2
      floor.position.set(length / 2, 0, zPosition + width / 2)
      group.add(floor)

      // Add maroon rectangle (12' x 6') on the floor, 2 ft from the end, rotated 90 degrees
      const maroonRectGeometry = new THREE.PlaneGeometry(6, 12) // Swap dimensions for rotation
      const maroonRectMaterial = new THREE.MeshBasicMaterial({
        color: 0x800000, // Maroon color
        side: THREE.DoubleSide,
        transparent: false,
      })
      const maroonRect = new THREE.Mesh(maroonRectGeometry, maroonRectMaterial)
      maroonRect.rotation.x = -Math.PI / 2 // Make it horizontal
      maroonRect.position.set(2 + 3, 0.01, zPosition + width / 2) // 2 ft from end + half the width of rectangle
      group.add(maroonRect)

      // Add white square (1.5' x 1.5') in the middle of the maroon rectangle
      const whiteSquareGeometry = new THREE.PlaneGeometry(1.5, 1.5)
      const whiteSquareMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff, // White color
        side: THREE.DoubleSide,
        transparent: false,
      })
      const whiteSquare = new THREE.Mesh(whiteSquareGeometry, whiteSquareMaterial)
      whiteSquare.rotation.x = -Math.PI / 2 // Make it horizontal
      whiteSquare.position.set(2 + 3, 0.02, zPosition + width / 2) // Same position as maroon rect but slightly higher
      group.add(whiteSquare)

      // Add "ATXTurf.com" text on the floor
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
        textMesh.position.set(length / 2, 0.01, zPosition + width / 2)
        group.add(textMesh)
      }

      // Add netting walls

      // Front wall (always add)
      const frontWallGeometry = new THREE.PlaneGeometry(length, height)
      const frontWall = new THREE.Mesh(frontWallGeometry, nettingMaterial)
      frontWall.position.set(length / 2, height / 2, zPosition)
      group.add(frontWall)

      // Back wall (always add)
      const backWallGeometry = new THREE.PlaneGeometry(length, height)
      const backWall = new THREE.Mesh(backWallGeometry, nettingMaterial)
      backWall.rotation.y = Math.PI
      backWall.position.set(length / 2, height / 2, zPosition + width)
      group.add(backWall)

      // Left wall (only for first cage)
      if (i === 0) {
        const leftWallGeometry = new THREE.PlaneGeometry(width, height)
        const leftWall = new THREE.Mesh(leftWallGeometry, nettingMaterial)
        leftWall.rotation.y = Math.PI / 2
        leftWall.position.set(0, height / 2, zPosition + width / 2)
        group.add(leftWall)
      }

      // Right wall (only for last cage)
      if (i === cageCount - 1) {
        const rightWallGeometry = new THREE.PlaneGeometry(width, height)
        const rightWall = new THREE.Mesh(rightWallGeometry, nettingMaterial)
        rightWall.rotation.y = -Math.PI / 2
        rightWall.position.set(length, height / 2, zPosition + width / 2)
        group.add(rightWall)
      }

      // Ceiling (always add)
      const ceilingGeometry = new THREE.PlaneGeometry(length, width)
      const ceiling = new THREE.Mesh(ceilingGeometry, nettingMaterial)
      ceiling.rotation.x = -Math.PI / 2
      ceiling.position.set(length / 2, height, zPosition + width / 2)
      group.add(ceiling)
    }
  }

  // If Three.js is not supported or there's an error, show the simplified view
  if (!threejsSupported || error) {
    return <SimplifiedView length={length} width={width} height={height} cages={cages} />
  }

  return (
    <div ref={containerRef} className="w-full h-[200px] md:h-[600px] relative" style={{ touchAction: "none" }}>
      {!loaded && (
        <Fallback length={length} width={width} height={height} cages={cages} flipDirection={flipDirection} />
      )}

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

// Export as a dynamic component with no SSR
export default dynamic(() => Promise.resolve(BasicCage3D), {
  ssr: false,
  loading: ({ length, width, height, cages, flipDirection }: BasicCage3DProps) => (
    <Fallback length={length} width={width} height={height} cages={cages} flipDirection={flipDirection} />
  ),
})
