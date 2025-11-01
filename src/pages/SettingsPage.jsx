import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  FileUp, Users, Database, Palette, Bell, Settings, Shield, 
  Clock, DollarSign, Truck, Wrench, Mail, Globe, Save
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SettingsPage = () => {
  // Module Settings
  const [slaAccess, setSlaAccess] = useState(false);
  const [rentalModule, setRentalModule] = useState(true);
  const [workshopModule, setWorkshopModule] = useState(true);
  const [costingModule, setCostingModule] = useState(true);
  const [maintenanceModule, setMaintenanceModule] = useState(true);
  
  // User Interface Settings
  const [darkMode, setDarkMode] = useState(false);
  const [compactView, setCompactView] = useState(false);
  const [showTooltips, setShowTooltips] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [defaultPageSize, setDefaultPageSize] = useState('25');
  
  // Business Settings
  const [companyName, setCompanyName] = useState('FleetFlow Company');
  const [currency, setCurrency] = useState('USD');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [timezone, setTimezone] = useState('UTC');
  const [fiscalYearStart, setFiscalYearStart] = useState('January');
  
  // Notification Settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [maintenanceAlerts, setMaintenanceAlerts] = useState(true);
  const [expenseAlerts, setExpenseAlerts] = useState(true);
  const [slaAlerts, setSlaAlerts] = useState(true);
  const [alertThreshold, setAlertThreshold] = useState('1000');
  const [notificationEmail, setNotificationEmail] = useState('admin@company.com');
  
  // System Settings
  const [autoBackup, setAutoBackup] = useState(true);
  const [backupFrequency, setBackupFrequency] = useState('daily');
  const [dataRetention, setDataRetention] = useState('365');
  const [sessionTimeout, setSessionTimeout] = useState('60');
  const [maxFileSize, setMaxFileSize] = useState('10');
  const [allowedFileTypes, setAllowedFileTypes] = useState('pdf,jpg,png,xlsx,csv');
  
  // Reporting Settings
  const [defaultReportFormat, setDefaultReportFormat] = useState('pdf');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [autoGenerateReports, setAutoGenerateReports] = useState(false);
  const [reportSchedule, setReportSchedule] = useState('monthly');
  
  // Security Settings
  const [requireMFA, setRequireMFA] = useState(false);
  const [passwordExpiry, setPasswordExpiry] = useState('90');
  const [loginAttempts, setLoginAttempts] = useState('5');
  const [auditLevel, setAuditLevel] = useState('standard');
  
  // Integration Settings
  const [apiEnabled, setApiEnabled] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [externalSync, setExternalSync] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();

  // Load settings from localStorage or database
  useEffect(() => {
    const loadedSettings = JSON.parse(localStorage.getItem('fleetflow_settings') || '{}');
    
    // Apply loaded settings
    if (loadedSettings.companyName) setCompanyName(loadedSettings.companyName);
    if (loadedSettings.currency) setCurrency(loadedSettings.currency);
    if (loadedSettings.dateFormat) setDateFormat(loadedSettings.dateFormat);
    // ... load other settings
  }, []);

  const handleSettingChange = (setting, value, description) => {
    toast({ 
      title: 'Settings Updated', 
      description: `${description} ${typeof value === 'boolean' ? (value ? 'enabled' : 'disabled') : 'updated'}` 
    });
  };

  const saveAllSettings = () => {
    const settings = {
      // Module Settings
      slaAccess, rentalModule, workshopModule, costingModule, maintenanceModule,
      
      // UI Settings
      darkMode, compactView, showTooltips, autoSave, defaultPageSize,
      
      // Business Settings
      companyName, currency, dateFormat, timezone, fiscalYearStart,
      
      // Notification Settings
      emailNotifications, maintenanceAlerts, expenseAlerts, slaAlerts,
      alertThreshold, notificationEmail,
      
      // System Settings
      autoBackup, backupFrequency, dataRetention, sessionTimeout,
      maxFileSize, allowedFileTypes,
      
      // Reporting Settings
      defaultReportFormat, includeCharts, autoGenerateReports, reportSchedule,
      
      // Security Settings
      requireMFA, passwordExpiry, loginAttempts, auditLevel,
      
      // Integration Settings
      apiEnabled, webhookUrl, externalSync
    };
    
    localStorage.setItem('fleetflow_settings', JSON.stringify(settings));
    
    toast({
      title: 'Settings Saved',
      description: 'All settings have been saved successfully.'
    });
  };

  return (
    <>
      <Helmet>
        <title>Settings - FleetFlow</title>
        <meta name="description" content="Manage application settings and preferences." />
      </Helmet>

      <div className="max-w-6xl mx-auto py-8 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Settings</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Configure your application preferences and system settings.
            </p>
          </div>
          <Button onClick={saveAllSettings} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Save All Settings
          </Button>
        </div>

        <Tabs defaultValue="admin" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="admin">Admin</TabsTrigger>
            <TabsTrigger value="modules">Modules</TabsTrigger>
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="interface">Interface</TabsTrigger>
            <TabsTrigger value="notifications">Alerts</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* Admin Tools Tab */}
          <TabsContent value="admin" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Admin Tools
                </CardTitle>
                <CardDescription>
                  Access administrative functions and management tools.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2 h-20" 
                    onClick={() => navigate('/admin')}
                  >
                    <Users className="h-6 w-6" />
                    <div className="text-left">
                      <div className="font-medium">User Management</div>
                      <div className="text-sm text-gray-500">Manage users & permissions</div>
                    </div>
                  </Button>

                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2 h-20" 
                    onClick={() => navigate('/settings/audit')}
                  >
                    <FileUp className="h-6 w-6" />
                    <div className="text-left">
                      <div className="font-medium">Audit Trail</div>
                      <div className="text-sm text-gray-500">View system activity</div>
                    </div>
                  </Button>

                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2 h-20" 
                    onClick={() => navigate('/settings/import')}
                  >
                    <Database className="h-6 w-6" />
                    <div className="text-left">
                      <div className="font-medium">Data Import</div>
                      <div className="text-sm text-gray-500">Bulk import data</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Modules Tab */}
          <TabsContent value="modules" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Module Configuration
                </CardTitle>
                <CardDescription>
                  Enable or disable specific modules for your organization.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <DollarSign className="h-5 w-5 text-blue-500" />
                        <div>
                          <div className="font-medium">Costing Module</div>
                          <div className="text-sm text-gray-500">Cost tracking and analysis</div>
                        </div>
                      </div>
                      <Switch
                        checked={costingModule}
                        onCheckedChange={(checked) => {
                          setCostingModule(checked);
                          handleSettingChange('costing', checked, 'Costing Module');
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Truck className="h-5 w-5 text-green-500" />
                        <div>
                          <div className="font-medium">Vehicle Expenses</div>
                          <div className="text-sm text-gray-500">Fleet expense management</div>
                        </div>
                      </div>
                      <Switch checked={true} disabled />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Wrench className="h-5 w-5 text-orange-500" />
                        <div>
                          <div className="font-medium">Workshop Module</div>
                          <div className="text-sm text-gray-500">Job and repair tracking</div>
                        </div>
                      </div>
                      <Switch
                        checked={workshopModule}
                        onCheckedChange={(checked) => {
                          setWorkshopModule(checked);
                          handleSettingChange('workshop', checked, 'Workshop Module');
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Database className="h-5 w-5 text-purple-500" />
                        <div>
                          <div className="font-medium">Rental Module</div>
                          <div className="text-sm text-gray-500">Equipment rental tracking</div>
                        </div>
                      </div>
                      <Switch
                        checked={rentalModule}
                        onCheckedChange={(checked) => {
                          setRentalModule(checked);
                          handleSettingChange('rental', checked, 'Rental Module');
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-red-500" />
                        <div>
                          <div className="font-medium">SLA Module</div>
                          <div className="text-sm text-gray-500">Service Level Agreement tracking</div>
                        </div>
                      </div>
                      <Switch
                        checked={slaAccess}
                        onCheckedChange={(checked) => {
                          setSlaAccess(checked);
                          handleSettingChange('sla', checked, 'SLA Module');
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-indigo-500" />
                        <div>
                          <div className="font-medium">Maintenance Module</div>
                          <div className="text-sm text-gray-500">Preventive maintenance scheduling</div>
                        </div>
                      </div>
                      <Switch
                        checked={maintenanceModule}
                        onCheckedChange={(checked) => {
                          setMaintenanceModule(checked);
                          handleSettingChange('maintenance', checked, 'Maintenance Module');
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Business Settings Tab */}
          <TabsContent value="business" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Business Configuration
                </CardTitle>
                <CardDescription>
                  Configure your business-specific settings and preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Enter company name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="currency">Default Currency</Label>
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                          <SelectItem value="ZAR">ZAR (R)</SelectItem>
                          <SelectItem value="AUD">AUD (A$)</SelectItem>
                          <SelectItem value="CAD">CAD (C$)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="dateFormat">Date Format</Label>
                      <Select value={dateFormat} onValueChange={setDateFormat}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                          <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                          <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                          <SelectItem value="DD-MM-YYYY">DD-MM-YYYY</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select value={timezone} onValueChange={setTimezone}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UTC">UTC</SelectItem>
                          <SelectItem value="America/New_York">Eastern Time</SelectItem>
                          <SelectItem value="America/Chicago">Central Time</SelectItem>
                          <SelectItem value="America/Denver">Mountain Time</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                          <SelectItem value="Europe/London">London</SelectItem>
                          <SelectItem value="Europe/Paris">Paris</SelectItem>
                          <SelectItem value="Africa/Johannesburg">Johannesburg</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="fiscalYear">Fiscal Year Start</Label>
                      <Select value={fiscalYearStart} onValueChange={setFiscalYearStart}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="January">January</SelectItem>
                          <SelectItem value="February">February</SelectItem>
                          <SelectItem value="March">March</SelectItem>
                          <SelectItem value="April">April</SelectItem>
                          <SelectItem value="May">May</SelectItem>
                          <SelectItem value="June">June</SelectItem>
                          <SelectItem value="July">July</SelectItem>
                          <SelectItem value="August">August</SelectItem>
                          <SelectItem value="September">September</SelectItem>
                          <SelectItem value="October">October</SelectItem>
                          <SelectItem value="November">November</SelectItem>
                          <SelectItem value="December">December</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="defaultPageSize">Default Page Size</Label>
                      <Select value={defaultPageSize} onValueChange={setDefaultPageSize}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 records</SelectItem>
                          <SelectItem value="25">25 records</SelectItem>
                          <SelectItem value="50">50 records</SelectItem>
                          <SelectItem value="100">100 records</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Interface Settings Tab */}
          <TabsContent value="interface" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  User Interface
                </CardTitle>
                <CardDescription>
                  Customize the look and feel of your application.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Dark Mode</div>
                        <div className="text-sm text-gray-500">Switch to dark theme</div>
                      </div>
                      <Switch
                        checked={darkMode}
                        onCheckedChange={(checked) => {
                          setDarkMode(checked);
                          handleSettingChange('darkMode', checked, 'Dark Mode');
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Compact View</div>
                        <div className="text-sm text-gray-500">Reduce spacing in tables and forms</div>
                      </div>
                      <Switch
                        checked={compactView}
                        onCheckedChange={(checked) => {
                          setCompactView(checked);
                          handleSettingChange('compactView', checked, 'Compact View');
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Show Tooltips</div>
                        <div className="text-sm text-gray-500">Display helpful tooltips on hover</div>
                      </div>
                      <Switch
                        checked={showTooltips}
                        onCheckedChange={(checked) => {
                          setShowTooltips(checked);
                          handleSettingChange('tooltips', checked, 'Tooltips');
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Auto-Save</div>
                        <div className="text-sm text-gray-500">Automatically save form changes</div>
                      </div>
                      <Switch
                        checked={autoSave}
                        onCheckedChange={(checked) => {
                          setAutoSave(checked);
                          handleSettingChange('autoSave', checked, 'Auto-Save');
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Alerts & Notifications
                </CardTitle>
                <CardDescription>
                  Configure how and when you receive notifications.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="notificationEmail">Notification Email</Label>
                      <Input
                        id="notificationEmail"
                        type="email"
                        value={notificationEmail}
                        onChange={(e) => setNotificationEmail(e.target.value)}
                        placeholder="admin@company.com"
                      />
                    </div>

                    <div>
                      <Label htmlFor="alertThreshold">Alert Threshold (Currency)</Label>
                      <Input
                        id="alertThreshold"
                        type="number"
                        value={alertThreshold}
                        onChange={(e) => setAlertThreshold(e.target.value)}
                        placeholder="1000"
                      />
                      <div className="text-sm text-gray-500 mt-1">
                        Get alerts for expenses above this amount
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Email Notifications</div>
                        <div className="text-sm text-gray-500">General email notifications</div>
                      </div>
                      <Switch
                        checked={emailNotifications}
                        onCheckedChange={(checked) => {
                          setEmailNotifications(checked);
                          handleSettingChange('emailNotifications', checked, 'Email Notifications');
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Maintenance Alerts</div>
                        <div className="text-sm text-gray-500">Maintenance due notifications</div>
                      </div>
                      <Switch
                        checked={maintenanceAlerts}
                        onCheckedChange={(checked) => {
                          setMaintenanceAlerts(checked);
                          handleSettingChange('maintenanceAlerts', checked, 'Maintenance Alerts');
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Expense Alerts</div>
                        <div className="text-sm text-gray-500">High expense notifications</div>
                      </div>
                      <Switch
                        checked={expenseAlerts}
                        onCheckedChange={(checked) => {
                          setExpenseAlerts(checked);
                          handleSettingChange('expenseAlerts', checked, 'Expense Alerts');
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">SLA Alerts</div>
                        <div className="text-sm text-gray-500">SLA breach notifications</div>
                      </div>
                      <Switch
                        checked={slaAlerts}
                        onCheckedChange={(checked) => {
                          setSlaAlerts(checked);
                          handleSettingChange('slaAlerts', checked, 'SLA Alerts');
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Settings Tab */}
          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  System Configuration
                </CardTitle>
                <CardDescription>
                  Configure system-level settings and performance options.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Automatic Backup</div>
                        <div className="text-sm text-gray-500">Daily automated data backup</div>
                      </div>
                      <Switch
                        checked={autoBackup}
                        onCheckedChange={(checked) => {
                          setAutoBackup(checked);
                          handleSettingChange('autoBackup', checked, 'Automatic Backup');
                        }}
                      />
                    </div>

                    <div>
                      <Label htmlFor="backupFrequency">Backup Frequency</Label>
                      <Select value={backupFrequency} onValueChange={setBackupFrequency}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="dataRetention">Data Retention (Days)</Label>
                      <Input
                        id="dataRetention"
                        type="number"
                        value={dataRetention}
                        onChange={(e) => setDataRetention(e.target.value)}
                        placeholder="365"
                      />
                      <div className="text-sm text-gray-500 mt-1">
                        How long to keep audit logs and old data
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="sessionTimeout">Session Timeout (Minutes)</Label>
                      <Input
                        id="sessionTimeout"
                        type="number"
                        value={sessionTimeout}
                        onChange={(e) => setSessionTimeout(e.target.value)}
                        placeholder="60"
                      />
                    </div>

                    <div>
                      <Label htmlFor="maxFileSize">Max File Size (MB)</Label>
                      <Input
                        id="maxFileSize"
                        type="number"
                        value={maxFileSize}
                        onChange={(e) => setMaxFileSize(e.target.value)}
                        placeholder="10"
                      />
                    </div>

                    <div>
                      <Label htmlFor="allowedFileTypes">Allowed File Types</Label>
                      <Input
                        id="allowedFileTypes"
                        value={allowedFileTypes}
                        onChange={(e) => setAllowedFileTypes(e.target.value)}
                        placeholder="pdf,jpg,png,xlsx,csv"
                      />
                      <div className="text-sm text-gray-500 mt-1">
                        Comma-separated list of allowed extensions
                      </div>
                    </div>
                  </div>
                </div>

                {/* System Information */}
                <div className="border-t pt-6">
                  <h3 className="font-medium mb-4">System Information</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-gray-600">Version</div>
                      <Badge variant="secondary">v1.0.0</Badge>
                    </div>
                    <div>
                      <div className="font-medium text-gray-600">Environment</div>
                      <Badge variant="outline">Development</Badge>
                    </div>
                    <div>
                      <div className="font-medium text-gray-600">Database</div>
                      <Badge variant="outline">Supabase</Badge>
                    </div>
                    <div>
                      <div className="font-medium text-gray-600">Last Updated</div>
                      <div>Nov 1, 2025</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security & Access Control
                </CardTitle>
                <CardDescription>
                  Configure security policies and access controls.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Require Multi-Factor Authentication</div>
                        <div className="text-sm text-gray-500">Require MFA for all users</div>
                      </div>
                      <Switch
                        checked={requireMFA}
                        onCheckedChange={(checked) => {
                          setRequireMFA(checked);
                          handleSettingChange('requireMFA', checked, 'Multi-Factor Authentication');
                        }}
                      />
                    </div>

                    <div>
                      <Label htmlFor="passwordExpiry">Password Expiry (Days)</Label>
                      <Input
                        id="passwordExpiry"
                        type="number"
                        value={passwordExpiry}
                        onChange={(e) => setPasswordExpiry(e.target.value)}
                        placeholder="90"
                      />
                      <div className="text-sm text-gray-500 mt-1">
                        Set to 0 for no expiry
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="loginAttempts">Max Login Attempts</Label>
                      <Input
                        id="loginAttempts"
                        type="number"
                        value={loginAttempts}
                        onChange={(e) => setLoginAttempts(e.target.value)}
                        placeholder="5"
                      />
                      <div className="text-sm text-gray-500 mt-1">
                        Account lockout after failed attempts
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="auditLevel">Audit Level</Label>
                      <Select value={auditLevel} onValueChange={setAuditLevel}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minimal">Minimal</SelectItem>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="detailed">Detailed</SelectItem>
                          <SelectItem value="verbose">Verbose</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="text-sm text-gray-500 mt-1">
                        Level of detail in audit logs
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">API Access</div>
                        <div className="text-sm text-gray-500">Enable REST API endpoints</div>
                      </div>
                      <Switch
                        checked={apiEnabled}
                        onCheckedChange={(checked) => {
                          setApiEnabled(checked);
                          handleSettingChange('apiEnabled', checked, 'API Access');
                        }}
                      />
                    </div>

                    <div>
                      <Label htmlFor="webhookUrl">Webhook URL</Label>
                      <Input
                        id="webhookUrl"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        placeholder="https://your-webhook-url.com"
                      />
                      <div className="text-sm text-gray-500 mt-1">
                        Receive notifications via webhook
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default SettingsPage;