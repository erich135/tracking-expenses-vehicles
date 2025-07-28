import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle, X } from 'lucide-react'

interface UploadError {
  row: number
  field?: string
  value?: string
  error: string
  data: string[]
}

interface ErrorReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  errors: UploadError[]
  successCount: number
  totalRows: number
}

const ErrorReportDialog: React.FC<ErrorReportDialogProps> = ({
  open,
  onOpenChange,
  errors,
  successCount,
  totalRows
}) => {
  const downloadErrorReport = () => {
    const csvContent = [
      ['Row', 'Field', 'Value', 'Error', 'Full Row Data'].join(','),
      ...errors.map(error => [
        error.row,
        error.field || '',
        error.value || '',
        `"${error.error}"`,
        `"${error.data.join(', ')}"`
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `upload-errors-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Upload Report
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">
                <Badge variant="outline" className="text-green-600">
                  {successCount} Successful
                </Badge>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <X className="h-4 w-4 text-red-500" />
              <span className="text-sm">
                <Badge variant="destructive">
                  {errors.length} Errors
                </Badge>
              </span>
            </div>
            <div className="text-sm text-gray-600">
              Total Rows: {totalRows}
            </div>
          </div>
          
          {errors.length > 0 && (
            <>
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Error Details</h3>
                <Button variant="outline" size="sm" onClick={downloadErrorReport}>
                  Download Error Report
                </Button>
              </div>
              
              <ScrollArea className="h-96 border rounded">
                <div className="p-4 space-y-3">
                  {errors.map((error, index) => (
                    <div key={index} className="border-l-4 border-red-400 bg-red-50 p-3 rounded">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-red-800">
                          Row {error.row}
                        </span>
                        {error.field && (
                          <Badge variant="outline" className="text-xs">
                            {error.field}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-red-700 mb-2">{error.error}</p>
                      {error.value && (
                        <p className="text-xs text-gray-600 mb-1">
                          <strong>Value:</strong> {error.value}
                        </p>
                      )}
                      <p className="text-xs text-gray-600">
                        <strong>Row Data:</strong> {error.data.join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ErrorReportDialog