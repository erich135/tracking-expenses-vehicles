import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useVehicleContext } from '@/contexts/VehicleContext'
import { Upload } from 'lucide-react'
import ErrorReportDialog from './ErrorReportDialog'

type UploadType = 'vehicles' | 'expenses' | 'suppliers'

interface UploadError {
  row: number
  field?: string
  value?: string
  error: string
  data: string[]
}

const DataUpload: React.FC = () => {
  const [uploadType, setUploadType] = useState<UploadType>('vehicles')
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [showErrorReport, setShowErrorReport] = useState(false)
  const [uploadErrors, setUploadErrors] = useState<UploadError[]>([])
  const [successCount, setSuccessCount] = useState(0)
  const [totalRows, setTotalRows] = useState(0)
  const { toast } = useToast()
  const { fetchVehicles } = useVehicleContext()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile)
    } else {
      toast({
        title: 'Invalid File',
        description: 'Please select a CSV file',
        variant: 'destructive'
      })
    }
  }

  const parseCSV = (text: string): string[][] => {
    const lines = text.split('\n')
    return lines.map(line => line.split(',').map(cell => cell.trim().replace(/"/g, '')))
  }

  const uploadVehicles = async (data: string[][]) => {
    const rows = data.slice(1).filter(row => row.some(cell => cell.length > 0))
    let successCount = 0
    const errors: UploadError[] = []
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Not authenticated')
    }
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNumber = i + 2
      const [regNumber, fleetNumber, make, model, currentOdometer, nextService] = row
      
      if (!regNumber) {
        errors.push({
          row: rowNumber,
          field: 'RegNumber',
          value: regNumber,
          error: 'Registration number is required',
          data: row
        })
        continue
      }
      
      const vehicleData: any = { 
        registration_number: regNumber,
        name: regNumber,
        user_id: user.id
      }
      if (fleetNumber) vehicleData.fleet_number = fleetNumber
      if (make) vehicleData.make = make
      if (model) vehicleData.model = model
      if (currentOdometer && !isNaN(Number(currentOdometer))) {
        vehicleData.odometer = Number(currentOdometer)
      }
      if (nextService && !isNaN(Number(nextService))) {
        vehicleData.next_service_odometer = Number(nextService)
      }
      
      const { error } = await supabase.from('vehicles').insert(vehicleData)
      if (error) {
        errors.push({
          row: rowNumber,
          error: error.message || 'Database error',
          data: row
        })
      } else {
        successCount++
      }
    }
    
    await fetchVehicles()
    return { successCount, errors, totalRows: rows.length }
  }

  const uploadExpenses = async (data: string[][]) => {
    const rows = data.slice(1).filter(row => row.some(cell => cell.length > 0))
    let successCount = 0
    const errors: UploadError[] = []
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Not authenticated')
    }
    
    // Get all vehicles for this user to map registration numbers to vehicle IDs
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id, registration_number')
      .eq('user_id', user.id)
    
    const vehicleMap = new Map()
    vehicles?.forEach(vehicle => {
      vehicleMap.set(vehicle.registration_number, vehicle.id)
    })
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNumber = i + 2
      const [regNumber, category, supplier, amount, date, litres, odometer, description] = row
      
      if (!regNumber || !amount || !date) {
        errors.push({
          row: rowNumber,
          error: 'RegNumber, Amount, and Date are required',
          data: row
        })
        continue
      }
      
      const vehicleId = vehicleMap.get(regNumber)
      if (!vehicleId) {
        errors.push({
          row: rowNumber,
          error: `Vehicle with registration number '${regNumber}' not found`,
          data: row
        })
        continue
      }
      
      const expenseData: any = {
        vehicle_id: vehicleId,
        registration_number: regNumber,
        amount: parseFloat(amount),
        date: date,
        user_id: user.id
      }
      
      if (category) expenseData.category = category
      if (supplier) expenseData.supplier = supplier
      if (litres && !isNaN(Number(litres))) expenseData.litres = Number(litres)
      if (odometer && !isNaN(Number(odometer))) expenseData.odometer = Number(odometer)
      if (description) expenseData.description = description
      
      const { error } = await supabase.from('expenses').insert(expenseData)
      if (error) {
        errors.push({
          row: rowNumber,
          error: error.message || 'Database error',
          data: row
        })
      } else {
        successCount++
      }
    }
    
    return { successCount, errors, totalRows: rows.length }
  }

  const uploadSuppliers = async (data: string[][]) => {
    const rows = data.slice(1).filter(row => row.some(cell => cell.length > 0))
    let successCount = 0
    const errors: UploadError[] = []
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNumber = i + 2
      const supplierName = row[0]
      
      if (!supplierName) {
        errors.push({
          row: rowNumber,
          field: 'SupplierName',
          value: supplierName,
          error: 'Supplier name is required',
          data: row
        })
        continue
      }
      
      const { error } = await supabase.from('suppliers').insert({ name: supplierName })
      if (error) {
        errors.push({
          row: rowNumber,
          error: error.message || 'Database error',
          data: row
        })
      } else {
        successCount++
      }
    }
    
    return { successCount, errors, totalRows: rows.length }
  }

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: 'No File Selected',
        description: 'Please select a CSV file to upload',
        variant: 'destructive'
      })
      return
    }

    setIsUploading(true)
    
    try {
      const text = await file.text()
      const data = parseCSV(text)
      
      if (data.length < 2) {
        toast({
          title: 'Invalid Data',
          description: 'CSV file must contain header and data rows',
          variant: 'destructive'
        })
        return
      }
      
      let result
      switch (uploadType) {
        case 'vehicles':
          result = await uploadVehicles(data)
          break
        case 'expenses':
          result = await uploadExpenses(data)
          break
        case 'suppliers':
          result = await uploadSuppliers(data)
          break
        default:
          return
      }
      
      setSuccessCount(result.successCount)
      setUploadErrors(result.errors)
      setTotalRows(result.totalRows)
      setShowErrorReport(true)
      
      setFile(null)
      const input = document.getElementById('file-upload') as HTMLInputElement
      if (input) input.value = ''
      
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: 'Upload Failed',
        description: 'An error occurred during upload',
        variant: 'destructive'
      })
    } finally {
      setIsUploading(false)
    }
  }

  const getFormatInfo = () => {
    switch (uploadType) {
      case 'vehicles':
        return 'Format: RegNumber, FleetNumber, Make, Model, CurrentOdometer, NextServiceOdometer (empty fields ignored)'
      case 'expenses':
        return 'Format: RegNumber, Category, Supplier, Amount, Date, Litres, Odometer, Description (RegNumber must match existing vehicle)'
      case 'suppliers':
        return 'Format: SupplierName (empty fields ignored)'
      default:
        return ''
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Data Upload
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="uploadType">Upload Type</Label>
            <Select value={uploadType} onValueChange={(value: UploadType) => setUploadType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vehicles">Vehicles</SelectItem>
                <SelectItem value="expenses">Expenses</SelectItem>
                <SelectItem value="suppliers">Suppliers</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
            {getFormatInfo()}
          </div>
          
          <div>
            <Label htmlFor="file-upload">CSV File</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
            />
          </div>
          
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? 'Uploading...' : 'Upload Data'}
          </Button>
        </CardContent>
      </Card>
      
      <ErrorReportDialog
        open={showErrorReport}
        onOpenChange={setShowErrorReport}
        errors={uploadErrors}
        successCount={successCount}
        totalRows={totalRows}
      />
    </>
  )
}

export default DataUpload