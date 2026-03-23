// Mock data structured to mimic future API response format
// This file can be easily replaced with actual API calls

export interface UserTrendData {
  date: string
  users: number
}

export interface ResumeTrendData {
  date: string
  resumes: number
}

export interface PaymentMethodData {
  method: string
  value: number
}

export interface PDFGeneratedData {
  date: string
  pdfs: number
}

export interface RecentActivity {
  resumeId: string
  userId: string
  paymentStatus: "completed" | "pending" | "failed"
  paymentMethod: string
  pdfGenerated: boolean
  printAndShip: boolean
  resumeType: "downloaded" | "printed_shipped" | "both"
  resumeResultPdf: string | null
  templateUsed: string
  shipmentStatus: "not_applicable" | "processing" | "shipped" | "in_transit" | "delivered" | "failed"
  trackingNumber: string | null
  createdDate: string
}

export interface ResumeDeliveryData {
  date: string
  downloaded: number
  printedShipped: number
}

export interface User {
  id: string
  name: string
  email: string
  phone: string
  hasPurchased: boolean
  signupDate: string
  lastActive: string
}

export interface DashboardMetrics {
  resumesCreated: number
  resumesPaid: number
  resumePdfsGenerated: number
  resumePrintShipQty: number
  paymentsGenerated: number
  paymentsPending: number
  paymentsCompleted: number
}

export interface DashboardData {
  metrics: DashboardMetrics
  usersTrend: UserTrendData[]
  resumeTrend: ResumeTrendData[]
  resumeDelivery: ResumeDeliveryData[]
  payments: {
    generated: number
    pending: number
    completed: number
  }
  paymentMethods: PaymentMethodData[]
  pdfsGenerated: PDFGeneratedData[]
  recentActivity: RecentActivity[]
  users: User[]
}

// Generate dates for the last 30 days
const generateDates = (days: number): string[] => {
  const dates: string[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    dates.push(date.toISOString().split("T")[0])
  }
  return dates
}

const dates = generateDates(30)

// Mock data for user trends
export const usersTrend: UserTrendData[] = dates.map((date, index) => ({
  date,
  users: Math.floor(100 + Math.random() * 100 + index * 5),
}))

// Mock data for resume trends
export const resumeTrend: ResumeTrendData[] = dates.map((date, index) => ({
  date,
  resumes: Math.floor(50 + Math.random() * 80 + index * 3),
}))

// Mock data for PDFs generated
export const pdfsGenerated: PDFGeneratedData[] = dates.slice(-14).map((date) => ({
  date,
  pdfs: Math.floor(20 + Math.random() * 60),
}))

// Mock data for resume delivery (downloaded vs printed/shipped)
export const resumeDelivery: ResumeDeliveryData[] = dates.map((date) => ({
  date,
  downloaded: Math.floor(30 + Math.random() * 50),
  printedShipped: Math.floor(10 + Math.random() * 25),
}))

// Mock data for payment methods
export const paymentMethods: PaymentMethodData[] = [
  { method: "Card", value: 65 },
  { method: "PayPal", value: 25 },
  { method: "Other", value: 10 },
]

// Mock data for recent activity
export const recentActivity: RecentActivity[] = [
  {
    resumeId: "RES-001",
    userId: "USR-1234",
    paymentStatus: "completed",
    paymentMethod: "Card",
    pdfGenerated: true,
    printAndShip: true,
    resumeType: "both",
    resumeResultPdf: "/resumes/res-001.pdf",
    templateUsed: "Professional",
    shipmentStatus: "delivered",
    trackingNumber: "1Z999AA10123456784",
    createdDate: "2026-03-10",
  },
  {
    resumeId: "RES-002",
    userId: "USR-5678",
    paymentStatus: "completed",
    paymentMethod: "PayPal",
    pdfGenerated: true,
    printAndShip: false,
    resumeType: "downloaded",
    resumeResultPdf: "/resumes/res-002.pdf",
    templateUsed: "Modern",
    shipmentStatus: "not_applicable",
    trackingNumber: null,
    createdDate: "2026-03-10",
  },
  {
    resumeId: "RES-003",
    userId: "USR-9012",
    paymentStatus: "pending",
    paymentMethod: "Card",
    pdfGenerated: false,
    printAndShip: false,
    resumeType: "downloaded",
    resumeResultPdf: null,
    templateUsed: "Classic",
    shipmentStatus: "not_applicable",
    trackingNumber: null,
    createdDate: "2026-03-09",
  },
  {
    resumeId: "RES-004",
    userId: "USR-3456",
    paymentStatus: "completed",
    paymentMethod: "Card",
    pdfGenerated: true,
    printAndShip: true,
    resumeType: "printed_shipped",
    resumeResultPdf: "/resumes/res-004.pdf",
    templateUsed: "Executive",
    shipmentStatus: "in_transit",
    trackingNumber: "1Z999AA10123456785",
    createdDate: "2026-03-09",
  },
  {
    resumeId: "RES-005",
    userId: "USR-7890",
    paymentStatus: "failed",
    paymentMethod: "Other",
    pdfGenerated: false,
    printAndShip: false,
    resumeType: "downloaded",
    resumeResultPdf: null,
    templateUsed: "Simple",
    shipmentStatus: "not_applicable",
    trackingNumber: null,
    createdDate: "2026-03-08",
  },
  {
    resumeId: "RES-006",
    userId: "USR-2345",
    paymentStatus: "completed",
    paymentMethod: "PayPal",
    pdfGenerated: true,
    printAndShip: false,
    resumeType: "downloaded",
    resumeResultPdf: "/resumes/res-006.pdf",
    templateUsed: "Creative",
    shipmentStatus: "not_applicable",
    trackingNumber: null,
    createdDate: "2026-03-08",
  },
  {
    resumeId: "RES-007",
    userId: "USR-6789",
    paymentStatus: "pending",
    paymentMethod: "Card",
    pdfGenerated: false,
    printAndShip: false,
    resumeType: "downloaded",
    resumeResultPdf: null,
    templateUsed: "Minimal",
    shipmentStatus: "not_applicable",
    trackingNumber: null,
    createdDate: "2026-03-07",
  },
  {
    resumeId: "RES-008",
    userId: "USR-0123",
    paymentStatus: "completed",
    paymentMethod: "Card",
    pdfGenerated: true,
    printAndShip: true,
    resumeType: "both",
    resumeResultPdf: "/resumes/res-008.pdf",
    templateUsed: "Professional",
    shipmentStatus: "shipped",
    trackingNumber: "1Z999AA10123456786",
    createdDate: "2026-03-07",
  },
  {
    resumeId: "RES-009",
    userId: "USR-4567",
    paymentStatus: "completed",
    paymentMethod: "Card",
    pdfGenerated: true,
    printAndShip: true,
    resumeType: "printed_shipped",
    resumeResultPdf: "/resumes/res-009.pdf",
    templateUsed: "Modern",
    shipmentStatus: "processing",
    trackingNumber: null,
    createdDate: "2026-03-06",
  },
  {
    resumeId: "RES-010",
    userId: "USR-8901",
    paymentStatus: "completed",
    paymentMethod: "PayPal",
    pdfGenerated: true,
    printAndShip: false,
    resumeType: "downloaded",
    resumeResultPdf: "/resumes/res-010.pdf",
    templateUsed: "Executive",
    shipmentStatus: "not_applicable",
    trackingNumber: null,
    createdDate: "2026-03-06",
  },
]

// Mock data for users
export const users: User[] = [
  {
    id: "USR-1234",
    name: "John Smith",
    email: "john.smith@email.com",
    phone: "+1 (555) 123-4567",
    hasPurchased: true,
    signupDate: "2026-02-15",
    lastActive: "2026-03-10",
  },
  {
    id: "USR-5678",
    name: "Sarah Johnson",
    email: "sarah.j@email.com",
    phone: "+1 (555) 234-5678",
    hasPurchased: true,
    signupDate: "2026-02-20",
    lastActive: "2026-03-10",
  },
  {
    id: "USR-9012",
    name: "Michael Brown",
    email: "m.brown@email.com",
    phone: "+1 (555) 345-6789",
    hasPurchased: false,
    signupDate: "2026-03-01",
    lastActive: "2026-03-09",
  },
  {
    id: "USR-3456",
    name: "Emily Davis",
    email: "emily.davis@email.com",
    phone: "+1 (555) 456-7890",
    hasPurchased: true,
    signupDate: "2026-02-25",
    lastActive: "2026-03-09",
  },
  {
    id: "USR-7890",
    name: "David Wilson",
    email: "d.wilson@email.com",
    phone: "+1 (555) 567-8901",
    hasPurchased: false,
    signupDate: "2026-03-05",
    lastActive: "2026-03-08",
  },
  {
    id: "USR-2345",
    name: "Jennifer Martinez",
    email: "jen.martinez@email.com",
    phone: "+1 (555) 678-9012",
    hasPurchased: true,
    signupDate: "2026-02-10",
    lastActive: "2026-03-08",
  },
  {
    id: "USR-6789",
    name: "Robert Taylor",
    email: "r.taylor@email.com",
    phone: "+1 (555) 789-0123",
    hasPurchased: false,
    signupDate: "2026-03-07",
    lastActive: "2026-03-07",
  },
  {
    id: "USR-0123",
    name: "Lisa Anderson",
    email: "lisa.a@email.com",
    phone: "+1 (555) 890-1234",
    hasPurchased: true,
    signupDate: "2026-02-18",
    lastActive: "2026-03-07",
  },
  {
    id: "USR-4567",
    name: "James Thomas",
    email: "j.thomas@email.com",
    phone: "+1 (555) 901-2345",
    hasPurchased: true,
    signupDate: "2026-02-22",
    lastActive: "2026-03-06",
  },
  {
    id: "USR-8901",
    name: "Amanda White",
    email: "a.white@email.com",
    phone: "+1 (555) 012-3456",
    hasPurchased: true,
    signupDate: "2026-02-28",
    lastActive: "2026-03-06",
  },
  {
    id: "USR-1122",
    name: "Chris Lee",
    email: "chris.lee@email.com",
    phone: "+1 (555) 111-2222",
    hasPurchased: false,
    signupDate: "2026-03-08",
    lastActive: "2026-03-10",
  },
  {
    id: "USR-3344",
    name: "Rachel Green",
    email: "r.green@email.com",
    phone: "+1 (555) 333-4444",
    hasPurchased: false,
    signupDate: "2026-03-09",
    lastActive: "2026-03-10",
  },
]

// Complete dashboard data object
export const dashboardData: DashboardData = {
  metrics: {
    resumesCreated: 1284,
    resumesPaid: 956,
    resumePdfsGenerated: 892,
    resumePrintShipQty: 234,
    paymentsGenerated: 32450,
    paymentsPending: 4520,
    paymentsCompleted: 27930,
  },
  usersTrend,
  resumeTrend,
  resumeDelivery,
  payments: {
    generated: 320,
    pending: 45,
    completed: 275,
  },
  paymentMethods,
  pdfsGenerated,
  recentActivity,
  users,
}

// Sparkline data for metric cards (last 7 data points)
export const getSparklineData = (metricType: string): number[] => {
  switch (metricType) {
    case "resumesCreated":
      return [45, 52, 49, 63, 58, 72, 68]
    case "resumesPaid":
      return [32, 38, 35, 42, 48, 52, 56]
    case "pdfGenerated":
      return [28, 32, 30, 38, 42, 45, 48]
    case "printShip":
      return [8, 10, 9, 12, 14, 15, 18]
    case "paymentsGenerated":
      return [1200, 1350, 1280, 1520, 1680, 1750, 1820]
    case "paymentsPending":
      return [180, 165, 190, 175, 160, 155, 145]
    case "paymentsCompleted":
      return [1020, 1185, 1090, 1345, 1520, 1595, 1675]
    default:
      return [10, 15, 12, 18, 20, 22, 25]
  }
}

// Function to simulate API fetch with loading state
export const fetchDashboardData = (): Promise<DashboardData> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(dashboardData)
    }, 500)
  })
}
