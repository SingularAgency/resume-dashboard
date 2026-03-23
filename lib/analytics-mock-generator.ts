// Dynamic mock data generator for analytics
// Generates realistic, correlated data based on the selected date range

import type {
  DashboardData,
  UserTrendData,
  ResumeTrendData,
  ResumeDeliveryData,
  PaymentMethodData,
  PDFGeneratedData,
  RecentActivity,
  User,
} from "./mock-data"

// Seed for consistent random values during a session
let seed = Date.now()

function seededRandom(): number {
  seed = (seed * 9301 + 49297) % 233280
  return seed / 233280
}

function randomInRange(min: number, max: number): number {
  return Math.floor(min + seededRandom() * (max - min + 1))
}

// Generate dates array for the given range
function generateDates(days: number, endDate?: Date): string[] {
  const dates: string[] = []
  const end = endDate || new Date()
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(end)
    date.setDate(date.getDate() - i)
    dates.push(date.toISOString().split("T")[0])
  }
  
  return dates
}

// Generate realistic user trend with gradual growth
function generateUsersTrend(dates: string[]): UserTrendData[] {
  let baseUsers = randomInRange(80, 120)
  const growthRate = 0.02 + seededRandom() * 0.03
  
  return dates.map((date, index) => {
    // Add daily fluctuation with overall growth trend
    const fluctuation = (seededRandom() - 0.5) * 30
    const growth = baseUsers * Math.pow(1 + growthRate, index / dates.length * 10)
    const users = Math.max(50, Math.round(growth + fluctuation))
    
    return { date, users }
  })
}

// Generate resume trend correlated with users
function generateResumeTrend(
  dates: string[],
  usersTrend: UserTrendData[]
): ResumeTrendData[] {
  return dates.map((date, index) => {
    // Resumes created should be somewhat correlated with user activity
    const userMultiplier = 0.4 + seededRandom() * 0.3
    const baseResumes = Math.round(usersTrend[index].users * userMultiplier)
    const fluctuation = (seededRandom() - 0.5) * 15
    const resumes = Math.max(20, Math.round(baseResumes + fluctuation))
    
    return { date, resumes }
  })
}

// Generate resume delivery data (downloaded vs printed/shipped)
function generateResumeDelivery(
  dates: string[],
  resumeTrend: ResumeTrendData[]
): ResumeDeliveryData[] {
  return dates.map((date, index) => {
    const totalResumes = resumeTrend[index].resumes
    // Downloaded is typically higher than printed/shipped
    const downloadedRatio = 0.65 + seededRandom() * 0.15
    const downloaded = Math.round(totalResumes * downloadedRatio)
    const printedShipped = Math.max(5, totalResumes - downloaded + randomInRange(-5, 5))
    
    return { date, downloaded, printedShipped }
  })
}

// Generate PDF data
function generatePDFsGenerated(
  dates: string[],
  resumeTrend: ResumeTrendData[]
): PDFGeneratedData[] {
  return dates.map((date, index) => {
    // PDFs generated should be close to or slightly less than resumes paid
    const pdfRatio = 0.85 + seededRandom() * 0.15
    const pdfs = Math.max(15, Math.round(resumeTrend[index].resumes * pdfRatio))
    
    return { date, pdfs }
  })
}

// Generate payment methods distribution
function generatePaymentMethods(): PaymentMethodData[] {
  const cardPercent = randomInRange(55, 70)
  const paypalPercent = randomInRange(20, 35)
  const otherPercent = 100 - cardPercent - paypalPercent
  
  return [
    { method: "Card", value: cardPercent },
    { method: "PayPal", value: paypalPercent },
    { method: "Other", value: Math.max(5, otherPercent) },
  ]
}

// Generate recent activity with realistic data
function generateRecentActivity(dates: string[]): RecentActivity[] {
  const templates = ["Professional", "Modern", "Classic", "Executive", "Simple", "Creative", "Minimal"]
  const paymentMethods = ["Card", "Card", "Card", "PayPal", "PayPal", "Other"]
  const shipmentStatuses: RecentActivity["shipmentStatus"][] = [
    "not_applicable", "processing", "shipped", "in_transit", "delivered", "failed"
  ]
  
  // Generate activities for the last few days of the range
  const recentDates = dates.slice(-5)
  const activities: RecentActivity[] = []
  
  let activityId = 1
  
  recentDates.forEach((date) => {
    const numActivities = randomInRange(2, 4)
    
    for (let i = 0; i < numActivities; i++) {
      const isPaid = seededRandom() > 0.15
      const paymentStatus: RecentActivity["paymentStatus"] = 
        isPaid ? (seededRandom() > 0.1 ? "completed" : "pending") : "failed"
      
      const pdfGenerated = paymentStatus === "completed" && seededRandom() > 0.1
      const printAndShip = pdfGenerated && seededRandom() > 0.6
      
      let resumeType: RecentActivity["resumeType"] = "downloaded"
      if (printAndShip && seededRandom() > 0.5) {
        resumeType = seededRandom() > 0.5 ? "both" : "printed_shipped"
      }
      
      let shipmentStatus: RecentActivity["shipmentStatus"] = "not_applicable"
      let trackingNumber: string | null = null
      
      if (printAndShip || resumeType === "printed_shipped" || resumeType === "both") {
        const statusIndex = randomInRange(1, 4) // Skip not_applicable
        shipmentStatus = shipmentStatuses[statusIndex]
        
        if (shipmentStatus !== "processing" && shipmentStatus !== "failed") {
          trackingNumber = `1Z999AA1${randomInRange(10000000, 99999999)}`
        }
      }
      
      activities.push({
        resumeId: `RES-${String(activityId).padStart(3, "0")}`,
        userId: `USR-${randomInRange(1000, 9999)}`,
        paymentStatus,
        paymentMethod: paymentMethods[randomInRange(0, paymentMethods.length - 1)],
        pdfGenerated,
        printAndShip,
        resumeType,
        resumeResultPdf: pdfGenerated ? `/resumes/res-${String(activityId).padStart(3, "0")}.pdf` : null,
        templateUsed: templates[randomInRange(0, templates.length - 1)],
        shipmentStatus,
        trackingNumber,
        createdDate: date,
      })
      
      activityId++
    }
  })
  
  // Sort by date descending
  return activities.sort((a, b) => 
    new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
  )
}

// Generate users with realistic data
function generateUsers(dates: string[]): User[] {
  const firstNames = [
    "John", "Sarah", "Michael", "Emily", "David", "Jennifer", "Robert", "Lisa",
    "James", "Amanda", "Chris", "Rachel", "Daniel", "Jessica", "Matthew", "Ashley",
    "Andrew", "Nicole", "Joshua", "Stephanie", "Ryan", "Megan", "Brandon", "Lauren"
  ]
  const lastNames = [
    "Smith", "Johnson", "Brown", "Davis", "Wilson", "Martinez", "Taylor", "Anderson",
    "Thomas", "White", "Lee", "Green", "Harris", "Clark", "Lewis", "Walker",
    "Hall", "Young", "King", "Wright", "Lopez", "Hill", "Scott", "Adams"
  ]
  
  const users: User[] = []
  const numUsers = randomInRange(15, 25)
  
  for (let i = 0; i < numUsers; i++) {
    const firstName = firstNames[randomInRange(0, firstNames.length - 1)]
    const lastName = lastNames[randomInRange(0, lastNames.length - 1)]
    const emailDomains = ["email.com", "gmail.com", "yahoo.com", "outlook.com"]
    const domain = emailDomains[randomInRange(0, emailDomains.length - 1)]
    
    // About 60-70% of users have purchased
    const hasPurchased = seededRandom() > 0.35
    
    // Generate signup date within the date range
    const signupDateIndex = randomInRange(0, Math.max(0, dates.length - 5))
    const lastActiveIndex = randomInRange(signupDateIndex, dates.length - 1)
    
    users.push({
      id: `USR-${randomInRange(1000, 9999)}`,
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
      phone: `+1 (555) ${randomInRange(100, 999)}-${randomInRange(1000, 9999)}`,
      hasPurchased,
      signupDate: dates[signupDateIndex],
      lastActive: dates[lastActiveIndex],
    })
  }
  
  // Sort by signup date descending
  return users.sort((a, b) => 
    new Date(b.signupDate).getTime() - new Date(a.signupDate).getTime()
  )
}

// Calculate metrics from generated data
function calculateMetrics(
  usersTrend: UserTrendData[],
  resumeTrend: ResumeTrendData[],
  resumeDelivery: ResumeDeliveryData[],
  pdfsGenerated: PDFGeneratedData[]
) {
  const totalResumes = resumeTrend.reduce((sum, d) => sum + d.resumes, 0)
  const totalPdfs = pdfsGenerated.reduce((sum, d) => sum + d.pdfs, 0)
  const totalDownloaded = resumeDelivery.reduce((sum, d) => sum + d.downloaded, 0)
  const totalPrintedShipped = resumeDelivery.reduce((sum, d) => sum + d.printedShipped, 0)
  
  // Payment calculations
  const paidRatio = 0.7 + seededRandom() * 0.15
  const resumesPaid = Math.round(totalResumes * paidRatio)
  
  const avgResumePrice = randomInRange(15, 25)
  const paymentsGenerated = resumesPaid * avgResumePrice
  const completedRatio = 0.85 + seededRandom() * 0.1
  const paymentsCompleted = Math.round(paymentsGenerated * completedRatio)
  const paymentsPending = paymentsGenerated - paymentsCompleted
  
  return {
    resumesCreated: totalResumes,
    resumesPaid,
    resumePdfsGenerated: totalPdfs,
    resumePrintShipQty: totalPrintedShipped,
    paymentsGenerated,
    paymentsPending,
    paymentsCompleted,
  }
}

// Generate sparkline data for metric cards
function generateSparklineData(
  metricType: string,
  trendData: number[]
): number[] {
  // Return last 7 data points for sparklines
  const lastSevenPoints = trendData.slice(-7)
  
  // If we don't have enough data, pad with estimated values
  while (lastSevenPoints.length < 7) {
    const avg = lastSevenPoints.reduce((a, b) => a + b, 0) / lastSevenPoints.length || 50
    lastSevenPoints.unshift(Math.round(avg * (0.9 + seededRandom() * 0.2)))
  }
  
  return lastSevenPoints
}

// Main generator function
export function generateMockAnalytics(
  range: number,
  customStartDate?: Date,
  customEndDate?: Date
): DashboardData {
  // Reset seed for each generation to get fresh but consistent data
  seed = Date.now() + range
  
  const endDate = customEndDate || new Date()
  const dates = generateDates(range, endDate)
  
  // Generate correlated data
  const usersTrend = generateUsersTrend(dates)
  const resumeTrend = generateResumeTrend(dates, usersTrend)
  const resumeDelivery = generateResumeDelivery(dates, resumeTrend)
  const pdfsGenerated = generatePDFsGenerated(dates, resumeTrend)
  const paymentMethods = generatePaymentMethods()
  const recentActivity = generateRecentActivity(dates)
  const users = generateUsers(dates)
  
  // Calculate metrics from data
  const metrics = calculateMetrics(usersTrend, resumeTrend, resumeDelivery, pdfsGenerated)
  
  // Payment breakdown for charts
  const payments = {
    generated: Math.round(metrics.paymentsGenerated / 100),
    pending: Math.round(metrics.paymentsPending / 100),
    completed: Math.round(metrics.paymentsCompleted / 100),
  }
  
  return {
    metrics,
    usersTrend,
    resumeTrend,
    resumeDelivery,
    payments,
    paymentMethods,
    pdfsGenerated,
    recentActivity,
    users,
  }
}

// Get sparkline data for a specific metric
export function getGeneratedSparklineData(
  metricType: string,
  data: DashboardData
): number[] {
  switch (metricType) {
    case "resumesCreated":
      return generateSparklineData(metricType, data.resumeTrend.map(d => d.resumes))
    case "resumesPaid":
      return generateSparklineData(metricType, data.resumeTrend.map(d => Math.round(d.resumes * 0.75)))
    case "pdfGenerated":
      return generateSparklineData(metricType, data.pdfsGenerated.map(d => d.pdfs))
    case "printShip":
      return generateSparklineData(metricType, data.resumeDelivery.map(d => d.printedShipped))
    case "paymentsGenerated":
      return generateSparklineData(metricType, data.resumeTrend.map(d => d.resumes * 20))
    case "paymentsPending":
      return generateSparklineData(metricType, data.resumeTrend.map(d => Math.round(d.resumes * 3)))
    case "paymentsCompleted":
      return generateSparklineData(metricType, data.resumeTrend.map(d => Math.round(d.resumes * 17)))
    default:
      return [10, 15, 12, 18, 20, 22, 25]
  }
}

// Calculate days between two dates
export function calculateDaysBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(1, diffDays + 1) // Include both start and end dates
}

// Parse range string to number of days
export function parseRangeToDays(range: string): number {
  switch (range) {
    case "7d":
      return 7
    case "14d":
      return 14
    case "30d":
      return 30
    case "90d":
      return 90
    default:
      return 30
  }
}
