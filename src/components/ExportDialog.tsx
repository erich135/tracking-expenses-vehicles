import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ExportDialogProps {
  data: any[]
  filename: string
  children: React.ReactNode
}

export default function ExportDialog({ data, filename, children }: ExportDialogProps) {
  const [format, setFormat] = useState<'xlsx' | 'pdf'>('xlsx')
  const [isExporting, setIsExporting] = useState(false)
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const exportToCSV = () => {
    if (data.length === 0) return
    
    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header]
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value
        }).join(',')
      )
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExport = async () => {
    if (data.length === 0) {
      toast({
        title: 'No Data',
        description: 'No data available to export',
        variant: 'destructive'
      })
      return
    }

    setIsExporting(true)
    
    try {
      // For now, export as CSV since xlsx is not available
      exportToCSV()
      
      toast({
        title: 'Export Successful',
        description: `Data exported as CSV`,
      })
      
      setOpen(false)
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'An error occurred during export',
        variant: 'destructive'
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </DialogTitle>
          <DialogDescription>
            Export your data as CSV format
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? 'Exporting...' : 'Export as CSV'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}