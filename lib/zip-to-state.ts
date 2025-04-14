// Mapping of zip code ranges to states
type ZipCodeRange = {
  min: number
  max: number
  state: string
}

// Comprehensive list of US zip code ranges by state
const ZIP_CODE_RANGES: ZipCodeRange[] = [
  { min: 35000, max: 36999, state: "Alabama" },
  { min: 99500, max: 99999, state: "Alaska" },
  { min: 85000, max: 86999, state: "Arizona" },
  { min: 71600, max: 72999, state: "Arkansas" },
  { min: 90000, max: 96699, state: "California" },
  { min: 80000, max: 81999, state: "Colorado" },
  { min: 6000, max: 6999, state: "Connecticut" },
  { min: 19700, max: 19999, state: "Delaware" },
  { min: 32000, max: 34999, state: "Florida" },
  { min: 30000, max: 31999, state: "Georgia" },
  { min: 96700, max: 96899, state: "Hawaii" },
  { min: 83200, max: 83999, state: "Idaho" },
  { min: 60000, max: 62999, state: "Illinois" },
  { min: 46000, max: 47999, state: "Indiana" },
  { min: 50000, max: 52999, state: "Iowa" },
  { min: 66000, max: 67999, state: "Kansas" },
  { min: 40000, max: 42999, state: "Kentucky" },
  { min: 70000, max: 71599, state: "Louisiana" },
  { min: 3900, max: 4999, state: "Maine" },
  { min: 20600, max: 21999, state: "Maryland" },
  { min: 1000, max: 2799, state: "Massachusetts" },
  { min: 48000, max: 49999, state: "Michigan" },
  { min: 55000, max: 56999, state: "Minnesota" },
  { min: 38600, max: 39999, state: "Mississippi" },
  { min: 63000, max: 65999, state: "Missouri" },
  { min: 59000, max: 59999, state: "Montana" },
  { min: 68000, max: 69999, state: "Nebraska" },
  { min: 88900, max: 89999, state: "Nevada" },
  { min: 3000, max: 3899, state: "New Hampshire" },
  { min: 7000, max: 8999, state: "New Jersey" },
  { min: 87000, max: 88499, state: "New Mexico" },
  { min: 10000, max: 14999, state: "New York" },
  { min: 27000, max: 28999, state: "North Carolina" },
  { min: 58000, max: 58999, state: "North Dakota" },
  { min: 43000, max: 45999, state: "Ohio" },
  { min: 73000, max: 74999, state: "Oklahoma" },
  { min: 97000, max: 97999, state: "Oregon" },
  { min: 15000, max: 19699, state: "Pennsylvania" },
  { min: 2800, max: 2999, state: "Rhode Island" },
  { min: 29000, max: 29999, state: "South Carolina" },
  { min: 57000, max: 57999, state: "South Dakota" },
  { min: 37000, max: 38599, state: "Tennessee" },
  { min: 75000, max: 79999, state: "Texas" },
  { min: 88500, max: 88599, state: "Texas" },
  { min: 84000, max: 84999, state: "Utah" },
  { min: 5000, max: 5999, state: "Vermont" },
  { min: 22000, max: 24699, state: "Virginia" },
  { min: 98000, max: 99499, state: "Washington" },
  { min: 24700, max: 26999, state: "West Virginia" },
  { min: 53000, max: 54999, state: "Wisconsin" },
  { min: 82000, max: 83199, state: "Wyoming" },
  { min: 20000, max: 20599, state: "District of Columbia" },
]

/**
 * Looks up the state based on a zip code
 * @param zipCode The zip code to look up
 * @returns The state name or "Unknown" if not found
 */
export function getStateFromZipCode(zipCode: string): string {
  // Ensure the zip code is a valid format
  if (!/^\d{5}$/.test(zipCode)) {
    return "Unknown"
  }

  const zipNumber = Number.parseInt(zipCode, 10)

  // Find the matching range
  const match = ZIP_CODE_RANGES.find((range) => zipNumber >= range.min && zipNumber <= range.max)

  return match ? match.state : "Unknown"
}
