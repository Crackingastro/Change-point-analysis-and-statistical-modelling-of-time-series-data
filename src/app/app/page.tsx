"use client"

import type React from "react"
import { useState } from "react"
import { Upload, TrendingUp, Activity, Calendar, AlertCircle, CheckCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts"

interface AnalysisResults {
  change_point_date: string
  volatility_before: number
  volatility_after: number
  volatility_change_pct: number
  avg_price_before: number
  avg_price_after: number
  price_change_pct: number
  chart_data?: ChartDataPoint[]
  volatility_data?: VolatilityDataPoint[]
}

interface ChartDataPoint {
  date: string
  price: number
  isChangePoint?: boolean
}

interface VolatilityDataPoint {
  period: string
  volatility: number
  type: "before" | "after"
}

export default function FinancialAnalysis() {
  const [file, setFile] = useState<File | null>(null)
  const [filename, setFilename] = useState<string>("")
  const [results, setResults] = useState<AnalysisResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [uploadProgress, setUploadProgress] = useState(0)

  const API_BASE = "http://localhost:5000" // Change this to your Flask backend URL

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError("")
      setResults(null)
    }
  }

  const uploadFile = async () => {
    if (!file) return

    setLoading(true)
    setError("")
    setUploadProgress(0)

    const formData = new FormData()
    formData.append("file", file)

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Upload failed")
      }

      const data = await response.json()
      setFilename(data.filename)

      // Fetch all analysis results
      await fetchResults(data.filename)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }

  const fetchResults = async (filename: string) => {
    try {
      const [changePointRes, volatilityRes, priceRes] = await Promise.all([
        fetch(`${API_BASE}/change-point/${filename}`),
        fetch(`${API_BASE}/volatility/${filename}`),
        fetch(`${API_BASE}/price/${filename}`),
      ])

      if (!changePointRes.ok || !volatilityRes.ok || !priceRes.ok) {
        throw new Error("Failed to fetch analysis results")
      }

      const [changePoint, volatility, price] = await Promise.all([
        changePointRes.json(),
        volatilityRes.json(),
        priceRes.json(),
      ])

      setResults({
        change_point_date: changePoint.change_point_date,
        volatility_before: volatility.volatility_before,
        volatility_after: volatility.volatility_after,
        volatility_change_pct: volatility.volatility_change_pct,
        avg_price_before: price.avg_price_before,
        avg_price_after: price.avg_price_after,
        price_change_pct: price.price_change_pct,
      })

      // Generate chart data after setting results
      setTimeout(() => fetchChartData(filename), 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch results")
    }
  }

  const fetchChartData = async (filename: string) => {
    try {
      // For now, we'll generate mock chart data based on the analysis results
      // In a real implementation, you'd add a new Flask endpoint to return time series data
      const mockChartData: ChartDataPoint[] = []
      const mockVolatilityData: VolatilityDataPoint[] = [
        { period: "Before Change Point", volatility: results?.volatility_before || 0, type: "before" },
        { period: "After Change Point", volatility: results?.volatility_after || 0, type: "after" },
      ]

      // Generate sample data points around the change point
      const changePointDate = new Date(results?.change_point_date || "2023-01-01")
      const avgBefore = results?.avg_price_before || 100
      const avgAfter = results?.avg_price_after || 100

      // Generate 30 days before and after change point
      for (let i = -30; i <= 30; i++) {
        const currentDate = new Date(changePointDate)
        currentDate.setDate(currentDate.getDate() + i)

        const basePrice = i < 0 ? avgBefore : avgAfter
        const volatility = i < 0 ? results?.volatility_before || 0.1 : results?.volatility_after || 0.1
        const randomVariation = (Math.random() - 0.5) * basePrice * volatility * 2

        mockChartData.push({
          date: currentDate.toISOString().split("T")[0],
          price: basePrice + randomVariation,
          isChangePoint: i === 0,
        })
      }

      setResults((prev) =>
        prev
          ? {
              ...prev,
              chart_data: mockChartData,
              volatility_data: mockVolatilityData,
            }
          : null,
      )
    } catch (err) {
      console.error("Failed to generate chart data:", err)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Financial Data Analysis</h1>
          <p className="text-lg text-gray-600">Upload your CSV file to analyze price trends and volatility changes</p>
        </div>

        {/* Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload CSV File
            </CardTitle>
            <CardDescription>Your CSV file should contain 'Date' and 'Price' columns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-4 text-gray-500" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">CSV files only</p>
                  </div>
                  <input type="file" className="hidden" accept=".csv" onChange={handleFileChange} />
                </label>
              </div>

              {file && (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium text-blue-900">{file.name}</span>
                  <Button onClick={uploadFile} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                    {loading ? "Analyzing..." : "Analyze"}
                  </Button>
                </div>
              )}

              {loading && uploadProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {results && (
          <div className="space-y-6">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Analysis completed successfully for {filename}
              </AlertDescription>
            </Alert>

            {/* Change Point */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  Change Point Detection
                </CardTitle>
                <CardDescription>The date when a significant change in the data pattern was detected</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center p-6 bg-purple-50 rounded-lg">
                  <div className="text-3xl font-bold text-purple-900 mb-2">{formatDate(results.change_point_date)}</div>
                  <p className="text-purple-700">Detected Change Point</p>
                </div>
              </CardContent>
            </Card>

            {/* Price Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Price Analysis
                </CardTitle>
                <CardDescription>Average price comparison before and after the change point</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-900 mb-1">
                      {formatCurrency(results.avg_price_before)}
                    </div>
                    <p className="text-blue-700 text-sm">Average Before</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-900 mb-1">
                      {formatCurrency(results.avg_price_after)}
                    </div>
                    <p className="text-green-700 text-sm">Average After</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div
                      className={`text-2xl font-bold mb-1 ${
                        results.price_change_pct > 0 ? "text-green-900" : "text-red-900"
                      }`}
                    >
                      {formatPercentage(results.price_change_pct)}
                    </div>
                    <p className="text-orange-700 text-sm">Price Change</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Volatility Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-red-600" />
                  Volatility Analysis
                </CardTitle>
                <CardDescription>Volatility comparison before and after the change point</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-900 mb-1">{results.volatility_before.toFixed(4)}</div>
                    <p className="text-blue-700 text-sm">Volatility Before</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-900 mb-1">{results.volatility_after.toFixed(4)}</div>
                    <p className="text-purple-700 text-sm">Volatility After</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div
                      className={`text-2xl font-bold mb-1 ${
                        results.volatility_change_pct > 0 ? "text-red-900" : "text-green-900"
                      }`}
                    >
                      {formatPercentage(results.volatility_change_pct)}
                    </div>
                    <p className="text-red-700 text-sm">Volatility Change</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Visualization */}
            {results?.chart_data && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    Price Trend Visualization
                  </CardTitle>
                  <CardDescription>
                    Interactive chart showing price movements and change point detection
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={results.chart_data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) =>
                            new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                          }
                        />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `$${value.toFixed(0)}`} />
                        <Tooltip
                          formatter={(value: number) => [`$${value.toFixed(2)}`, "Price"]}
                          labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke="#2563eb"
                          strokeWidth={2}
                          dot={{ fill: "#2563eb", strokeWidth: 2, r: 3 }}
                          name="Price"
                        />
                        <ReferenceLine
                          x={results.change_point_date}
                          stroke="#dc2626"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          label={{ value: "Change Point", position: "top" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Volatility Comparison Chart */}
            {results?.volatility_data && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-red-600" />
                    Volatility Comparison
                  </CardTitle>
                  <CardDescription>Visual comparison of volatility before and after the change point</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={results.volatility_data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value: number) => [value.toFixed(4), "Volatility"]} />
                        <Legend />
                        <Bar
                          dataKey="volatility"
                          fill={(dataPoint) => (dataPoint.type === "before" ? "#3b82f6" : "#8b5cf6")}
                          name="Volatility"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Price Distribution Chart */}
            {results?.chart_data && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Price Distribution
                  </CardTitle>
                  <CardDescription>Area chart showing price distribution over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={results.chart_data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) =>
                            new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                          }
                        />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `$${value.toFixed(0)}`} />
                        <Tooltip
                          formatter={(value: number) => [`$${value.toFixed(2)}`, "Price"]}
                          labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="price"
                          stroke="#10b981"
                          fill="#10b981"
                          fillOpacity={0.3}
                          name="Price"
                        />
                        <ReferenceLine
                          x={results.change_point_date}
                          stroke="#dc2626"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          label={{ value: "Change Point", position: "top" }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Instructions */}
        {!results && !loading && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>How to Use</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <p>Prepare a CSV file with 'Date' and 'Price' columns containing your financial data</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <p>Upload your CSV file using the upload area above</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                    3
                  </div>
                  <p>
                    View the analysis results including change point detection, price trends, and volatility analysis
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
