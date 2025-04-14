"use client"

import { useState, useEffect } from "react"

export default function TestDbPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function testDbConnection() {
      try {
        const response = await fetch("/api/test-db")
        const data = await response.json()
        setResult(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error occurred")
      } finally {
        setLoading(false)
      }
    }

    testDbConnection()
  }, [])

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-black/80 border border-[#00ff00] rounded-lg shadow-[0_0_20px_rgba(0,255,0,0.3)] p-8 w-full max-w-md">
        <h1 className="text-center text-2xl font-bold mb-8 text-[#00ff00]">Database Connection Test</h1>

        {loading ? (
          <div className="text-center">
            <div className="inline-block w-6 h-6 border-2 border-[#00ff00] border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2">Testing database connection...</p>
          </div>
        ) : error ? (
          <div className="text-red-500">
            <p className="font-bold">Error:</p>
            <p>{error}</p>
          </div>
        ) : (
          <div>
            <p className="mb-4">
              <span className="font-bold">Status:</span>{" "}
              <span className={result.success ? "text-green-500" : "text-red-500"}>
                {result.success ? "Connected" : "Failed"}
              </span>
            </p>
            <p className="mb-4">
              <span className="font-bold">Message:</span> {result.message}
            </p>
            {result.timestamp && (
              <p className="mb-4">
                <span className="font-bold">Server Time:</span> {result.timestamp}
              </p>
            )}
            <p className="mb-4">
              <span className="font-bold">DATABASE_URL:</span> {result.databaseUrl}
            </p>
            {!result.success && result.error && (
              <div className="mt-4 p-4 bg-red-900/20 border border-red-500 rounded">
                <p className="font-bold">Error Details:</p>
                <p className="font-mono text-sm break-all">{result.error}</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 text-center">
          <a href="/" className="text-[#00ff00] underline hover:text-[#00aa00]">
            Back to Calculator
          </a>
        </div>
      </div>
    </main>
  )
}
