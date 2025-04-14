"use server"

import { z } from "zod"
import { sql } from "@/lib/db"
import { getStateFromZipCode } from "@/lib/zip-to-state"
import { getStateCodeFromName, DEFAULT_SHIPPING_COST, BASE_SHIPPING_COST } from "@/lib/state-utils"

// Define validation schema
const FormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  zipcode: z.string().regex(/^\d{5}$/, "Please enter a valid 5-digit US zip code"),
  length: z
    .string()
    .refine((val) => /^\d+$/.test(val) && Number.parseInt(val) > 0, "Please enter a valid whole number"),
  width: z.string().refine((val) => /^\d+$/.test(val) && Number.parseInt(val) > 0, "Please enter a valid whole number"),
  height: z
    .string()
    .refine((val) => /^\d+$/.test(val) && Number.parseInt(val) > 0, "Please enter a valid whole number"),
  cages: z
    .string()
    .optional()
    .transform((val) => (val ? val : "1"))
    .refine((val) => /^\d+$/.test(val) && Number.parseInt(val) > 0, "Please enter a valid whole number"),
  flipDirection: z
    .string()
    .optional()
    .transform((val) => val === "true"),
})

export async function submitAreaCalculation(formData: FormData) {
  try {
    console.log("Server action called with form data")

    // Extract and validate form data
    const rawData = {
      email: formData.get("email") as string,
      zipcode: formData.get("zipcode") as string,
      length: formData.get("length") as string,
      width: formData.get("width") as string,
      height: formData.get("height") as string,
      cages: (formData.get("cages") as string) || "1",
      flipDirection: (formData.get("flipDirection") as string) || "false",
    }

    console.log("Raw form data:", rawData)

    // Validate the data
    const validationResult = FormSchema.safeParse(rawData)
    if (!validationResult.success) {
      console.error("Validation failed:", validationResult.error.flatten())
      return {
        success: false,
        message: "Validation failed",
        errors: validationResult.error.flatten().fieldErrors,
      }
    }

    const validData = validationResult.data

    // Parse dimensions
    const length = Number.parseInt(validData.length)
    const width = Number.parseInt(validData.width)
    const height = Number.parseInt(validData.height)
    const cages = Number.parseInt(validData.cages)

    // Calculate floor area (turf)
    const floorArea = length * width * cages

    // Calculate surface area (netting) with shared walls
    // For a single cage: 2 sides + ceiling + 2 ends
    // For each additional cage: 1 long side + ceiling + 2 ends
    const ceilingArea = length * width
    const endWallsArea = 2 * width * height
    const sideWallsArea = length * height

    // Calculate netting for first cage
    const firstCageNetting = 2 * sideWallsArea + ceilingArea + endWallsArea

    // Calculate netting for additional cages
    const additionalCageNetting = sideWallsArea + ceilingArea + endWallsArea

    // Total netting area
    let surfaceArea = 0
    if (cages === 1) {
      surfaceArea = firstCageNetting
    } else {
      surfaceArea = firstCageNetting + additionalCageNetting * (cages - 1)
    }

    // Calculate roll square footage based on direction
    let rollSqFt = 0
    if (validData.flipDirection) {
      // When flipped, round up length to nearest 15' increment and multiply by total width
      const roundedLength = Math.ceil(length / 15) * 15
      rollSqFt = roundedLength * (width * cages)
    } else {
      // When not flipped, round up total width to nearest 15' increment and multiply by length
      const rollWidth = Math.ceil((width * cages) / 15) * 15
      rollSqFt = rollWidth * length
    }

    // Calculate hardware kits (1 per cage)
    const hardwareKits = cages
    const hardwareKitCost = hardwareKits * 175

    // Calculate seam length and glue buckets
    let seamLength = 0
    if (validData.flipDirection) {
      // When flipped, seams run along the width
      const numRolls = Math.ceil(length / 15)
      const numSeams = numRolls - 1
      seamLength = numSeams * (width * cages)
    } else {
      // When not flipped, seams run along the length
      const numRolls = Math.ceil((width * cages) / 15)
      const numSeams = numRolls - 1
      seamLength = numSeams * length
    }
    const seamTapeCost = seamLength * 0.4
    const glueBuckets = Math.ceil(seamLength / 125)
    const glueBucketCost = glueBuckets * 325

    console.log("Hardware kits:", hardwareKits, "Cost:", hardwareKitCost)
    console.log("Seam length:", seamLength, "Tape cost:", seamTapeCost)
    console.log("Glue buckets:", glueBuckets, "Cost:", glueBucketCost)

    console.log("Calculated netting area:", surfaceArea)
    console.log("Calculated turf area:", floorArea)
    console.log("Calculated roll square footage:", rollSqFt)

    // Look up the state based on the zip code
    const shipToState = getStateFromZipCode(validData.zipcode)
    console.log("Determined state from zip code:", shipToState)

    // Get the state code from the state name
    const stateCode = getStateCodeFromName(shipToState)
    console.log("State code:", stateCode)

    // Look up the shipping cost per square foot from the database
    let shippingCostPerSqFt = DEFAULT_SHIPPING_COST
    if (stateCode) {
      try {
        const costResult = await sql`
          SELECT cost_per_square_foot 
          FROM state_shipping_costs 
          WHERE state_code = ${stateCode}
        `
        if (costResult.length > 0) {
          shippingCostPerSqFt = Number.parseFloat(costResult[0].cost_per_square_foot)
        }
      } catch (error) {
        console.error("Error looking up shipping cost:", error)
      }
    }
    console.log("Shipping cost per square foot:", shippingCostPerSqFt)

    // Calculate the total shipping cost
    const shippingCost = rollSqFt * shippingCostPerSqFt + BASE_SHIPPING_COST
    console.log("Total shipping cost:", shippingCost)

    // Check if DATABASE_URL is available
    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL is not defined")
      return {
        success: false,
        message: "Database connection error: DATABASE_URL is not defined",
      }
    }

    // Insert data into the database
    try {
      // Use tagged template literals for the SQL query
      // Store both surface_area (netting) and floor_area (turf)
      const result = await sql`
        INSERT INTO area_calculations (
          email, 
          zipcode, 
          length, 
          width, 
          height, 
          surface_area, 
          floor_area,
          cages,
          flip_direction,
          ship_to_state,
          hardware_kits,
          hardware_cost,
          seam_length,
          seam_tape_cost,
          glue_buckets,
          glue_cost
        )
        VALUES (
          ${validData.email}, 
          ${validData.zipcode}, 
          ${length}, 
          ${width}, 
          ${height}, 
          ${surfaceArea}, 
          ${floorArea},
          ${cages},
          ${validData.flipDirection},
          ${shipToState},
          ${hardwareKits},
          ${hardwareKitCost},
          ${seamLength},
          ${seamTapeCost},
          ${glueBuckets},
          ${glueBucketCost}
        )
        RETURNING id
      `

      console.log("Database result:", result)

      return {
        success: true,
        message: "Data stored successfully in the database!",
        surfaceArea: surfaceArea.toLocaleString(),
        floorArea: floorArea.toLocaleString(),
        id: result[0]?.id,
        state: shipToState,
        stateCode: stateCode,
        shippingCostPerSqFt: shippingCostPerSqFt,
        shippingCost: shippingCost.toFixed(2),
        rollSqFt: rollSqFt,
        hardwareKits: hardwareKits,
        hardwareKitCost: hardwareKitCost,
        seamLength: seamLength,
        seamTapeCost: seamTapeCost.toFixed(2),
        glueBuckets: glueBuckets,
        glueBucketCost: glueBucketCost,
      }
    } catch (dbError) {
      console.error("Database operation error:", dbError)
      return {
        success: false,
        message: `Database error: ${dbError instanceof Error ? dbError.message : "Unknown database error"}`,
      }
    }
  } catch (error) {
    console.error("Server action error:", error)
    return {
      success: false,
      message: `Failed to store data in the database: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}
