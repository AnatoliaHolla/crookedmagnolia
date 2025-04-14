"use client"

import type React from "react"

import { useState, useTransition, useEffect, useRef, Suspense } from "react"
import { submitAreaCalculation } from "./actions"
import Link from "next/link"
import dynamic from "next/dynamic"
import { getStateFromZipCode } from "@/lib/zip-to-state"
import { DEFAULT_SHIPPING_COST, BASE_SHIPPING_COST } from "@/lib/state-utils"
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react"
import Script from "next/script"

// Add the window.paypal type definition to avoid TypeScript errors
declare global {
  interface Window {
    paypal: any
  }
}

// Update the fallback component height
function Rectangle3DFallback() {
  return (
    <div className="w-full h-[200px] md:h-[600px] bg-[rgba(10,26,18,0.8)] rounded-lg border border-[#00ff9d] flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="inline-block w-8 h-8 border-2 border-[#00ff9d] border-t-transparent rounded-full animate-spin mb-2"></div>
        <div className="text-[#e0ffe9]">Loading 3D model...</div>
      </div>
    </div>
  )
}

// Import the BasicCage3D component with no SSR
const BasicCage3D = dynamic(() => import("@/components/BasicCage3D"), {
  ssr: false,
  loading: () => <Rectangle3DFallback />,
})

export default function Home() {
  // Set default values for dimensions
  const [email, setEmail] = useState("")
  const [zipcode, setZipcode] = useState("")
  const [length, setLength] = useState("70")
  const [width, setWidth] = useState("15")
  const [height, setHeight] = useState("12")
  const [cages, setCages] = useState("1")
  const [flipDirection, setFlipDirection] = useState(false)
  const [result, setResult] = useState<{
    nettingSqFt: string
    turfSqFt: string
  } | null>(null)
  const [formState, setFormState] = useState<{
    success: boolean
    message: string | null
    errors?: Record<string, string[]>
  }>({ success: false, message: null })
  const [isPending, startTransition] = useTransition()
  const [formSubmitted, setFormSubmitted] = useState(false)

  // Add state to track if 3D model has an error
  const [modelError, setModelError] = useState(false)

  // State for shipping information
  const [shippingState, setShippingState] = useState<string | null>(null)
  const [shippingCostPerSqFt, setShippingCostPerSqFt] = useState<number>(DEFAULT_SHIPPING_COST)
  const [shippingCost, setShippingCost] = useState<number | null>(null)

  // State for collapsible sections
  const [isRollInfoOpen, setIsRollInfoOpen] = useState(false)
  const [isSeamTotalsOpen, setIsSeamTotalsOpen] = useState(false)
  const [isNettingHardwareOpen, setIsNettingHardwareOpen] = useState(false)
  const [isGravelOpen, setIsGravelOpen] = useState(false)

  // State for add-to-total checkboxes
  const [addSeamToTurf, setAddSeamToTurf] = useState(false)
  const [addHardwareToNetting, setAddHardwareToNetting] = useState(false)

  // State for cart items
  const [addTurfToCart, setAddTurfToCart] = useState(false)
  const [addNetToCart, setAddNetToCart] = useState(false)

  // Add this state variable with the other state variables
  const [paypalLoaded, setPaypalLoaded] = useState(false)
  const paypalButtonRef = useRef<HTMLDivElement>(null)

  // Tooltip states - one for each tooltip
  const [showRollDirectionTooltip, setShowRollDirectionTooltip] = useState(false)
  const [showRollsTooltip, setShowRollsTooltip] = useState(false)
  const [showTurfShippingTooltip, setShowTurfShippingTooltip] = useState(false)
  const [showNetShippingTooltip, setShowNetShippingTooltip] = useState(false)
  const [showHardwareTooltip, setShowHardwareTooltip] = useState(false)

  // Calculate areas
  const lengthNum = Number.parseInt(length) || 70
  const widthNum = Number.parseInt(width) || 14
  const heightNum = Number.parseInt(height) || 12
  const cagesNum = Number.parseInt(cages) || 1

  // Calculate turf square footage
  const turfSqFt = lengthNum * widthNum * cagesNum

  // Calculate netting square footage with shared walls
  // For a single cage: 2 sides + ceiling + 2 ends
  // For each additional cage: 1 long side + ceiling + 2 ends
  const ceilingArea = lengthNum * widthNum
  const endWallsArea = 2 * widthNum * heightNum
  const sideWallsArea = lengthNum * heightNum

  // Calculate netting for first cage
  const firstCageNetting = 2 * sideWallsArea + ceilingArea + endWallsArea

  // Calculate netting for additional cages
  const additionalCageNetting = sideWallsArea + ceilingArea + endWallsArea

  // Total netting area
  let nettingSqFt = 0
  if (cagesNum === 1) {
    nettingSqFt = firstCageNetting
  } else {
    nettingSqFt = firstCageNetting + additionalCageNetting * (cagesNum - 1)
  }

  // Calculate roll square footage based on 15' wide rolls
  // First calculate the total width across all cages
  const totalWidth = widthNum * cagesNum

  // Calculate roll square footage based on direction
  let rollSqFt = 0
  let numRolls = 0
  if (flipDirection) {
    // When flipped, round up length to nearest 15' increment and multiply by total width
    const roundedLength = Math.ceil(lengthNum / 15) * 15
    rollSqFt = roundedLength * totalWidth
    numRolls = Math.ceil(lengthNum / 15)
  } else {
    // When not flipped, round up total width to nearest 15' increment and multiply by length
    const rollWidth = Math.ceil(totalWidth / 15) * 15
    rollSqFt = rollWidth * lengthNum
    numRolls = Math.ceil(totalWidth / 15)
  }

  // Calculate seam length and glue buckets
  let seamLength = 0

  if (flipDirection) {
    // When flipped, seams run along the width direction
    // Calculate number of rolls needed for the length
    const numRollsForLength = Math.ceil(lengthNum / 15)

    // Calculate seams between rolls (numRolls - 1 seams, each totalWidth long)
    if (numRollsForLength > 1) {
      seamLength = (numRollsForLength - 1) * totalWidth
    }
  } else {
    // When not flipped, we're calculating seams between cages
    if (cagesNum > 1) {
      // For multiple cages, we have (cagesNum - 1) seams between them
      // Each seam is the length of the cage
      seamLength = (cagesNum - 1) * lengthNum
    }
  }

  const seamTapeCost = seamLength * 0.4

  // Determine glue cost based on seam length
  let glueBuckets = 0
  let glueBucketCost = 0
  let glueLabel = "Glue:"

  if (seamLength <= 70) {
    // For seams 70 ft or less, use a fixed price glue kit
    glueLabel = "70' Glue Kit:"
    glueBucketCost = 139.99
  } else {
    // For seams greater than 70 ft, calculate buckets and cost
    glueBuckets = Math.ceil(seamLength / 125)
    glueBucketCost = glueBuckets * 325
  }

  // Calculate hardware kits (1 per cage)
  const hardwareKits = cagesNum
  const hardwareKitCost = hardwareKits * 175

  // Calculate turf cost based on the appropriate square footage
  // Add seam length to turf cost if checkbox is checked
  const seamFabricSqFt = seamLength * 1 // Assuming 1 foot width for seam fabric
  const turfCost =
    (flipDirection ? rollSqFt : turfSqFt) * 1.69 +
    (addSeamToTurf ? seamFabricSqFt * 1.69 + glueBucketCost : 0) +
    (zipcode.length === 5 && shippingCost !== null ? shippingCost : 0)

  // Calculate netting cost - Updated to $0.55 per square foot
  // Add hardware kit cost if checkbox is checked
  const nettingCost =
    nettingSqFt * 0.55 + (addHardwareToNetting ? hardwareKitCost : 0) + (zipcode.length === 5 ? nettingSqFt * 0.04 : 0)

  // Calculate cart total
  const cartTotal = (addTurfToCart ? turfCost : 0) + (addNetToCart ? nettingCost : 0)

  // Update shipping cost when zip code changes
  useEffect(() => {
    async function fetchShippingCost() {
      if (zipcode.length === 5) {
        const state = getStateFromZipCode(zipcode)
        setShippingState(state)

        if (state) {
          try {
            // Fetch the shipping cost from the API
            const response = await fetch(`/api/shipping-cost?state=${encodeURIComponent(state)}`)
            const data = await response.json()

            if (data.success && data.costPerSqFt) {
              setShippingCostPerSqFt(data.costPerSqFt)

              // Calculate shipping cost based on state and roll square footage
              const calculatedShippingCost = rollSqFt * data.costPerSqFt + BASE_SHIPPING_COST
              setShippingCost(calculatedShippingCost)
            } else {
              // Use default shipping cost if API call fails
              const calculatedShippingCost = rollSqFt * DEFAULT_SHIPPING_COST + BASE_SHIPPING_COST
              setShippingCost(calculatedShippingCost)
            }
          } catch (error) {
            console.error("Error fetching shipping cost:", error)
            // Use default shipping cost if API call fails
            const calculatedShippingCost = rollSqFt * DEFAULT_SHIPPING_COST + BASE_SHIPPING_COST
            setShippingCost(calculatedShippingCost)
          }
        } else {
          setShippingCostPerSqFt(DEFAULT_SHIPPING_COST)
          const calculatedShippingCost = rollSqFt * DEFAULT_SHIPPING_COST + BASE_SHIPPING_COST
          setShippingCost(calculatedShippingCost)
        }
      } else {
        setShippingState(null)
        setShippingCost(null)
      }
    }

    fetchShippingCost()
  }, [zipcode, rollSqFt])

  // Initialize PayPal button when the SDK is loaded
  useEffect(() => {
    // Only run this effect on the client side and when PayPal is loaded
    if (typeof window === "undefined" || !paypalLoaded || !paypalButtonRef.current) return

    // Make sure window.paypal exists before trying to use it
    if (!window.paypal) {
      console.error("PayPal SDK not loaded properly")
      return
    }

    // Clear any existing buttons
    paypalButtonRef.current.innerHTML = ""

    try {
      window.paypal
        .Buttons({
          // Set up the transaction
          createOrder: (data: any, actions: any) => {
            // Calculate the payment amount
            const paymentAmount = cartTotal.toFixed(2)

            // Create the order with all the required information
            return actions.order.create({
              purchase_units: [
                {
                  amount: {
                    value: paymentAmount,
                  },
                  description: `Batting Cage: ${length}' x ${width}' x ${height}', ${cages} cage(s)`,
                  custom_id: JSON.stringify({
                    length: lengthNum,
                    width: widthNum,
                    height: heightNum,
                    cages: cagesNum,
                    turfRollSqFt: rollSqFt,
                    shipping: shippingCost || 0,
                    seamLength: seamLength,
                    glueBuckets: glueBuckets,
                    flipDirection: flipDirection,
                    includeTurf: addTurfToCart,
                    includeNet: addNetToCart,
                  }),
                },
              ],
            })
          },
          // Finalize the transaction
          onApprove: (data: any, actions: any) =>
            actions.order.capture().then((orderData: any) => {
              // Show a success message
              const successDetail = orderData.purchase_units[0].payments.captures[0]
              alert(
                `Transaction completed! Payment of ${successDetail.amount.value} has been processed. Transaction ID: ${successDetail.id}`,
              )
            }),
          onError: (err: any) => {
            console.error("PayPal error:", err)
            alert("There was an error processing your payment. Please try again.")
          },
        })
        .render(paypalButtonRef.current)
    } catch (error) {
      console.error("Error rendering PayPal buttons:", error)
    }
  }, [
    paypalLoaded,
    cartTotal,
    length,
    width,
    height,
    cages,
    lengthNum,
    widthNum,
    heightNum,
    cagesNum,
    rollSqFt,
    shippingCost,
    seamLength,
    glueBuckets,
    flipDirection,
    addTurfToCart,
    addNetToCart,
  ])

  // Validation functions
  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  }

  const validateZipcode = (value: string) => {
    const zipcodeRegex = /^\d{5}$/
    return zipcodeRegex.test(value)
  }

  // Update the validateNumber function to allow width minimum of 10' instead of 15'
  const validateNumber = (value: string, isWidth = false) => {
    const numValue = Number.parseInt(value)
    if (isWidth) {
      return /^\d+$/.test(value) && numValue >= 10
    }
    return /^\d+$/.test(value) && numValue > 0
  }

  // Input handlers with increment/decrement
  const incrementValue = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    const numValue = Number.parseInt(value) || 0
    setter((numValue + 1).toString())
  }

  // Update the decrementValue function to allow width to go down to 10' instead of 15'
  const decrementValue = (setter: React.Dispatch<React.SetStateAction<string>>, value: string, isWidth = false) => {
    const numValue = Number.parseInt(value) || 0
    if (isWidth) {
      // For width, don't go below 10
      if (numValue > 10) {
        setter((numValue - 1).toString())
      }
    } else {
      // For other fields, don't go below 1
      if (numValue > 1) {
        setter((numValue - 1).toString())
      }
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormSubmitted(true)

    let newFormState = { ...formState }

    // Client-side validation
    if (!validateEmail(email)) {
      newFormState = {
        success: false,
        message: "Please enter a valid email address",
        errors: { email: ["Please enter a valid email address"] },
      }
      setFormState(newFormState)
      return
    }

    if (!validateZipcode(zipcode)) {
      newFormState = {
        success: false,
        message: "Please enter a valid 5-digit US zip code",
        errors: { zipcode: ["Please enter a valid 5-digit US zip code"] },
      }
      setFormState(newFormState)
      return
    }

    if (!validateNumber(length)) {
      newFormState = {
        success: false,
        message: "Please enter a valid whole number for length",
        errors: { length: ["Please enter a valid whole number"] },
      }
      setFormState(newFormState)
      return
    }

    if (!validateNumber(width, true)) {
      newFormState = {
        success: false,
        message: "Width must be at least 10 feet",
        errors: { width: ["Width must be at least 10 feet"] },
      }
      setFormState(newFormState)
      return
    }

    if (!validateNumber(height)) {
      newFormState = {
        success: false,
        message: "Please enter a valid whole number for height",
        errors: { height: ["Please enter a valid whole number"] },
      }
      setFormState(newFormState)
      return
    }

    const formData = new FormData()
    formData.append("email", email)
    formData.append("zipcode", zipcode)
    formData.append("length", length)
    formData.append("width", width)
    formData.append("height", height)
    formData.append("cages", cages)
    formData.append("flipDirection", flipDirection.toString())

    startTransition(async () => {
      const response = await submitAreaCalculation(formData)

      if (response.success) {
        setResult({
          nettingSqFt: response.surfaceArea,
          turfSqFt: response.floorArea,
        })
        setFormState({
          success: true,
          message: response.message,
        })
        setFormSubmitted(false) // Reset form submitted state on success

        // Update shipping information from the response
        if (response.shippingCostPerSqFt) {
          setShippingCostPerSqFt(response.shippingCostPerSqFt)
        }

        if (response.shippingCost) {
          setShippingCost(Number.parseFloat(response.shippingCost))
        }
      } else {
        setFormState({
          success: false,
          message: response.message,
          errors: response.errors,
        })
      }
    })
  }

  // Collapsible section component
  const CollapsibleSection = ({
    title,
    isOpen,
    setIsOpen,
    children,
  }: {
    title: string
    isOpen: boolean
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
    children: React.ReactNode
  }) => (
    <div className="card-container">
      <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <h3 className="text-[#00ff9d]">{title}</h3>
        {isOpen ? <ChevronUp className="h-4 w-4 text-[#00ff9d]" /> : <ChevronDown className="h-4 w-4 text-[#00ff9d]" />}
      </div>
      {isOpen && <div className="mt-2">{children}</div>}
    </div>
  )

  return (
    <main className="min-h-screen p-4 flex flex-col gap-3">
      {/* Page headline - positioned above everything */}
      <div className="text-center mb-3">
        <h1 className="text-[#00ff9d] font-normal">3D | Real-Time | Custom Batting Cage Quote</h1>
        {/* Decorative line that fades from bright green in the middle to dimmer at the edges */}
        <div className="h-1 mx-auto mt-2 w-full max-w-2xl bg-gradient-to-r from-transparent via-[#00ff9d] to-transparent"></div>
      </div>

      {/* Main content container */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Left column - 3D Visualization */}
        <div className="w-full md:w-1/2 bg-[rgba(17,34,24,0.8)] rounded-lg border border-[#00ff9d] p-4 flex flex-col relative">
          {/* Powered by ATXTurf */}
          <div className="absolute top-2 left-2 bg-[rgba(10,26,18,0.8)] p-2 rounded text-xs text-[#e0ffe9] border-l-2 border-[#008f39] z-10">
            Powered by <span className="text-[#008f39] font-semibold">ATXTurf, LLC</span>
          </div>
          <div className="flex-grow">
            <Suspense fallback={<Rectangle3DFallback />}>
              <BasicCage3D
                length={lengthNum}
                width={widthNum}
                height={heightNum}
                cages={cagesNum}
                flipDirection={flipDirection}
              />
            </Suspense>
          </div>
        </div>

        {/* Right column - Form */}
        <div className="w-full md:w-1/2 flex flex-col gap-3">
          <div className="bg-[rgba(10,26,10,0.8)] rounded-lg border border-[#00cc7d] p-4">
            {/* Contact information section */}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-2">
                <div className="space-y-1">
                  {/* Email input */}
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`input-with-buttons ${formSubmitted && !validateEmail(email) ? "border-red-500 border-2" : ""}`}
                    placeholder="Enter your email"
                    required
                  />
                  {formState.errors?.email && <p className="text-red-500 text-xs mt-1">{formState.errors.email[0]}</p>}
                </div>

                <div className="space-y-1">
                  {/* Zipcode input */}
                  <input
                    type="text"
                    id="zipcode"
                    value={zipcode}
                    onChange={(e) => setZipcode(e.target.value)}
                    className={`input-with-buttons ${formSubmitted && !validateZipcode(zipcode) ? "border-red-500 border-2" : ""}`}
                    placeholder="Enter US zip code"
                    required
                  />
                  {formState.errors?.zipcode && (
                    <p className="text-red-500 text-xs mt-1">{formState.errors.zipcode[0]}</p>
                  )}
                  {zipcode.length === 5 && shippingState && (
                    <p className="text-[#00ff9d] text-xs mt-1">Shipping to: {shippingState} - See Ship Quote Below</p>
                  )}
                </div>
              </div>

              <h2 className="section-title text-[#00ff9d] text-lg mb-2">ENTER CAGE SIZE</h2>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label htmlFor="length" className="block uppercase text-sm tracking-wide text-[#00ff9d]">
                    Length (feet)
                  </label>
                  <div className="input-container">
                    <input
                      type="number"
                      id="length"
                      value={length}
                      onChange={(e) => {
                        setLength(e.target.value)
                        // Reset validation error when user is typing
                        if (formSubmitted && !validateNumber(e.target.value)) {
                          // Only keep formSubmitted true if the new value is valid
                          setFormSubmitted(validateNumber(e.target.value))
                        }
                      }}
                      className="input-with-buttons"
                      required
                    />
                    <div className="input-button input-button-up" onClick={() => incrementValue(setLength, length)}>
                      +
                    </div>
                    <div className="input-button input-button-down" onClick={() => decrementValue(setLength, length)}>
                      -
                    </div>
                  </div>
                  {formState.errors?.length && (
                    <p className="text-red-500 text-xs mt-1">{formState.errors.length[0]}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label htmlFor="width" className="block uppercase text-sm tracking-wide text-[#00ff9d]">
                    Width (feet)
                  </label>
                  <div className="input-container">
                    <input
                      type="number"
                      id="width"
                      value={width}
                      onChange={(e) => {
                        setWidth(e.target.value)
                        if (formSubmitted && !validateNumber(e.target.value, true)) {
                          setFormSubmitted(validateNumber(e.target.value, true))
                        }
                      }}
                      className="input-with-buttons"
                      required
                    />
                    <div className="input-button input-button-up" onClick={() => incrementValue(setWidth, width)}>
                      +
                    </div>
                    <div
                      className="input-button input-button-down"
                      onClick={() => decrementValue(setWidth, width, true)}
                    >
                      -
                    </div>
                  </div>
                  {formState.errors?.width && <p className="text-red-500 text-xs mt-1">{formState.errors.width[0]}</p>}
                </div>

                <div className="space-y-1">
                  <label htmlFor="height" className="block uppercase text-sm tracking-wide text-[#00ff9d]">
                    Height (feet)
                  </label>
                  <div className="input-container">
                    <input
                      type="number"
                      id="height"
                      value={height}
                      onChange={(e) => {
                        setHeight(e.target.value)
                        if (formSubmitted && !validateNumber(e.target.value)) {
                          setFormSubmitted(validateNumber(e.target.value))
                        }
                      }}
                      className="input-with-buttons"
                      required
                    />
                    <div className="input-button input-button-up" onClick={() => incrementValue(setHeight, height)}>
                      +
                    </div>
                    <div className="input-button input-button-down" onClick={() => decrementValue(setHeight, height)}>
                      -
                    </div>
                  </div>
                  {formState.errors?.height && (
                    <p className="text-red-500 text-xs mt-1">{formState.errors.height[0]}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label htmlFor="cages" className="block uppercase text-sm tracking-wide text-[#00ff9d]">
                    How Many Cages?
                  </label>
                  <div className="input-container">
                    <input
                      type="number"
                      id="cages"
                      value={cages}
                      onChange={(e) => setCages(e.target.value)}
                      className="input-with-buttons"
                      required
                    />
                    <div className="input-button input-button-up" onClick={() => incrementValue(setCages, cages)}>
                      +
                    </div>
                    <div className="input-button input-button-down" onClick={() => decrementValue(setCages, cages)}>
                      -
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex-1 mr-2">
                  <div className="card-container flex justify-between items-center">
                    <span>Sq Ft of Area:</span>
                    <span className="result-value text-lg font-bold text-white">{turfSqFt.toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex-1 ml-2">
                  <div className="card-container">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={flipDirection}
                        onChange={() => setFlipDirection(!flipDirection)}
                        className="form-checkbox h-4 w-4 text-[#00ff00] border-[#00ff00] rounded focus:ring-[#00ff00]"
                      />
                      <span>Change Roll Direction</span>
                      <div className="relative inline-block">
                        <HelpCircle
                          className="h-4 w-4 text-[#00ff9d] cursor-help"
                          onMouseEnter={() => setShowRollDirectionTooltip(true)}
                          onMouseLeave={() => setShowRollDirectionTooltip(false)}
                        />
                        {showRollDirectionTooltip && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2 bg-[rgba(0,40,0,0.9)] border border-[#00ff9d] rounded text-xs text-[#e0ffe9] z-50">
                            Checking and unchecking this box will automatically re-calculate the Square Feet, Linear
                            Feet of Seam, Turf Cost, Shipping & Total. Turning the turf 90 degrees such that the seams
                            run the other direction can result in either more, or less square feet of turf & cost,
                            depending on the measurements.
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#00ff9d] w-0 h-0"></div>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="card-container">
                  <div className="text-center mb-1 text-[#00ff9d] flex items-center justify-center">
                    SF in 15' W Rolls
                    <div className="relative inline-block ml-1">
                      <HelpCircle
                        className="h-4 w-4 text-[#00ff9d] cursor-help"
                        onMouseEnter={() => setShowRollsTooltip(true)}
                        onMouseLeave={() => setShowRollsTooltip(false)}
                      />
                      {showRollsTooltip && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2 bg-[rgba(0,40,0,0.9)] border border-[#00ff9d] rounded text-xs text-[#e0ffe9] z-50">
                          Turf is made and purchased in 15' wide rolls. To cover the actual square feet of area
                          calculated above, this number may be higher and you may have leftover turf. See Roll Size
                          Information below for further details.
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#00ff9d] w-0 h-0"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-center text-xl font-bold text-white">{rollSqFt.toLocaleString()}</div>
                </div>

                <div className="card-container">
                  <div className="text-center mb-1 text-[#00ff9d]">Netting SF</div>
                  <div className="text-center text-xl font-bold text-white">{nettingSqFt.toLocaleString()}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="card-container">
                  <div className="text-center mb-1 text-[#00ff9d]">Turf @ $1.69 sf</div>
                  <div className="text-center text-xl font-bold text-white">
                    $
                    {turfCost.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div className="mt-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={addTurfToCart}
                        onChange={() => setAddTurfToCart(!addTurfToCart)}
                        className="form-checkbox h-4 w-4 text-[#00ff9d] border-[#00ff9d] rounded focus:ring-[#00ff9d]"
                      />
                      <span>Add to Cart</span>
                    </label>
                  </div>
                </div>

                <div className="card-container">
                  <div className="text-center mb-1 text-[#00ff9d]">Net @ $0.55 sf</div>
                  <div className="text-center text-xl font-bold text-white">
                    $
                    {nettingCost.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div className="mt-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={addNetToCart}
                        onChange={() => setAddNetToCart(!addNetToCart)}
                        className="form-checkbox h-4 w-4 text-[#00ff9d] border-[#00ff9d] rounded focus:ring-[#00ff9d]"
                      />
                      <span>Add to Cart</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="card-container bg-[rgba(0,40,0,0.5)] border-2 border-[#00ff00]">
                  <div className="text-center mb-1 text-[#00ff9d] font-bold flex items-center justify-center">
                    Turf Shipping
                    <div className="relative inline-block ml-1">
                      <HelpCircle
                        className="h-4 w-4 text-[#00ff9d] cursor-help"
                        onMouseEnter={() => setShowTurfShippingTooltip(true)}
                        onMouseLeave={() => setShowTurfShippingTooltip(false)}
                      />
                      {showTurfShippingTooltip && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2 bg-[rgba(0,40,0,0.9)] border border-[#00ff9d] rounded text-xs text-[#e0ffe9] z-50">
                          After a zip code is provided above, these shipping costs will be automatically added into the
                          Turf and Net total costs above.
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#00ff9d] w-0 h-0"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-center text-xl font-bold text-white">
                    {zipcode.length === 5 && shippingCost !== null
                      ? `${shippingCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : "$0.00"}
                  </div>
                  {/* Shipping details removed */}
                </div>

                <div className="card-container bg-[rgba(0,40,0,0.5)] border-2 border-[#00ff00]">
                  <div className="text-center mb-1 text-[#00ff9d] font-bold flex items-center justify-center">
                    Net Shipping
                    <div className="relative inline-block ml-1">
                      <HelpCircle
                        className="h-4 w-4 text-[#00ff9d] cursor-help"
                        onMouseEnter={() => setShowNetShippingTooltip(true)}
                        onMouseLeave={() => setShowNetShippingTooltip(false)}
                      />
                      {showNetShippingTooltip && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2 bg-[rgba(0,40,0,0.9)] border border-[#00ff9d] rounded text-xs text-[#e0ffe9] z-50">
                          After a zip code is provided above, these shipping costs will be automatically added into the
                          Turf and Net total costs above.
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#00ff9d] w-0 h-0"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-center text-xl font-bold text-white">
                    {zipcode.length === 5
                      ? `${(nettingSqFt * 0.04).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : "$0.00"}
                  </div>
                  {/* Shipping details removed */}
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full p-3 bg-[#00cc7d] text-[#e0ffe9] border-none rounded font-bold uppercase tracking-wider cursor-pointer hover:bg-[#00ff9d] hover:shadow-[0_0_15px_rgba(0,255,157,0.5)] transition-all relative overflow-hidden disabled:bg-[#008f39] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isPending ? "Saving..." : "Submit This Calculation"}
              </button>

              {/* Collapsible sections moved below the Save button */}
              <CollapsibleSection title="Roll Size Information" isOpen={isRollInfoOpen} setIsOpen={setIsRollInfoOpen}>
                <div className="mb-2">
                  {flipDirection ? (
                    <p className="text-white">
                      You will receive {numRolls}, 15' × {totalWidth}' Rolls
                    </p>
                  ) : (
                    <p className="text-white">
                      You will receive {numRolls}, 15' × {lengthNum}' Rolls
                    </p>
                  )}
                </div>
                {flipDirection ? (
                  <p className="text-white">
                    {Math.ceil(lengthNum / 15) * 15 - lengthNum > 0 ? (
                      <>
                        {`${Math.ceil(lengthNum / 15) * 15 - lengthNum}' × ${totalWidth}' remnant after installation`} (
                        {((Math.ceil(lengthNum / 15) * 15 - lengthNum) * totalWidth).toLocaleString()} sf)
                      </>
                    ) : (
                      "No remnant"
                    )}
                  </p>
                ) : (
                  <p className="text-white">
                    {Math.ceil(totalWidth / 15) * 15 - totalWidth > 0 ? (
                      <>
                        {`${Math.ceil(totalWidth / 15) * 15 - totalWidth}' × ${lengthNum}' remnant after installation`}{" "}
                        ({((Math.ceil(totalWidth / 15) * 15 - totalWidth) * lengthNum).toLocaleString()} sf)
                      </>
                    ) : (
                      "No remnant"
                    )}
                  </p>
                )}
              </CollapsibleSection>

              <CollapsibleSection title="Seam Totals" isOpen={isSeamTotalsOpen} setIsOpen={setIsSeamTotalsOpen}>
                <div className="flex justify-between items-center">
                  <span>Seam Fabric Length:</span>
                  <span className="result-value text-lg font-bold text-white">
                    {seamLength.toLocaleString()} ft ($
                    {seamTapeCost.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                    )
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span>{glueLabel}</span>
                  <span className="result-value text-lg font-bold text-white">
                    {seamLength <= 70
                      ? `(${glueBucketCost.toFixed(2)})`
                      : `${glueBuckets} (${glueBucketCost.toLocaleString()})`}
                  </span>
                </div>
                <div className="mt-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addSeamToTurf}
                      onChange={() => setAddSeamToTurf(!addSeamToTurf)}
                      className="form-checkbox h-4 w-4 text-[#00ff00] border-[#00ff00] rounded focus:ring-[#00ff00]"
                    />
                    <span>Add to Turf Total</span>
                  </label>
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title="Netting Hardware"
                isOpen={isNettingHardwareOpen}
                setIsOpen={setIsNettingHardwareOpen}
              >
                <div className="flex justify-between items-center">
                  <span className="flex items-center">
                    Hardware Kit:
                    <div className="relative inline-block ml-1">
                      <HelpCircle
                        className="h-4 w-4 text-[#00ff9d] cursor-help"
                        onMouseEnter={() => setShowHardwareTooltip(true)}
                        onMouseLeave={() => setShowHardwareTooltip(false)}
                      />
                      {showHardwareTooltip && (
                        <div className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-[rgba(0,40,0,0.9)] border border-[#00ff9d] rounded text-xs text-[#e0ffe9] z-50">
                          Includes Cable, Cable Clamps, Turnbuckles and Spring Clips (Carabiners).
                          <div className="absolute top-full left-6 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#00ff9d] w-0 h-0"></div>
                        </div>
                      )}
                    </div>
                  </span>
                  <span className="result-value text-lg font-bold text-white">
                    {hardwareKits} kit{hardwareKits > 1 ? "s" : ""} (${hardwareKitCost})
                  </span>
                </div>
                <div className="mt-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addHardwareToNetting}
                      onChange={() => setAddHardwareToNetting(!addHardwareToNetting)}
                      className="form-checkbox h-4 w-4 text-[#00ff00] border-[#00ff00] rounded focus:ring-[#00ff00]"
                    />
                    <span>Add to Netting Total</span>
                  </label>
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title="Going Outside? Show Gravel Amount"
                isOpen={isGravelOpen}
                setIsOpen={setIsGravelOpen}
              >
                <div className="flex justify-between items-center">
                  <span>Gravel Required:</span>
                  <span className="result-value text-lg font-bold text-white">
                    {((turfSqFt * 31) / 2000).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    tons for 4 inches deep
                  </span>
                </div>
              </CollapsibleSection>

              {/* PayPal Payment Section */}
              <div className="card-container bg-[rgba(0,40,0,0.5)] border-2 border-[#00ff00] p-4">
                <h3 className="text-[#00ff9d] text-center mb-3">Pay with PayPal</h3>
                <div className="text-center mb-3">
                  <span className="text-xl font-bold text-white">
                    Total: $
                    {cartTotal.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div ref={paypalButtonRef} id="paypal-button-container" className="mt-3"></div>
              </div>

              {/* Google Reviews Image */}
              <div className="mt-4">
                <img
                  src="https://atxturf.com/wp-content/uploads/2025/03/GoogleReviews65.png"
                  alt="ATXTurf.com - 65 Google Reviews"
                  className="w-full h-auto rounded-lg border border-[#00aa00]"
                />
              </div>
            </form>

            {formState.success && (
              <div className="mt-4 text-center text-[#00ff00] italic">
                {formState.message}
                {result && (
                  <div className="mt-2">
                    Shipping to: {zipcode} ({shippingState || "Unknown"})
                  </div>
                )}
                <div className="mt-2">
                  <Link href="/calculations" className="text-[#00ff00] underline hover:text-[#00aa00]">
                    View all stored calculations
                  </Link>
                </div>
              </div>
            )}

            {!formState.success && formState.message && (
              <div className="mt-4 text-center text-red-500">{formState.message}</div>
            )}
          </div>
        </div>
      </div>
      {/* PayPal SDK */}
      <Script
        src="https://www.paypal.com/sdk/js?client-id=Ad8bhr-SleyRSurvIXCIpovAQSvH2a-BABPPs5Rgh2h5RkrT_l23wepZv60tLaJ8SavvEcvHWkI9BOiA&currency=USD&disable-funding=paylater"
        onLoad={() => setPaypalLoaded(true)}
      />
    </main>
  )
}
