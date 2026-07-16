import { useState, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, 
  CreditCard, 
  FileText, 
  DollarSign, 
  TrendingUp,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Download,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Settings,
  Building,
  Wallet,
  Receipt,
  PiggyBank
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Sub-tabs for Payment & Billing
const PAYMENT_TABS = [
  { id: 'overview', label: 'Overview', icon: DollarSign },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'gateways', label: 'Payment Gateways', icon: Building },
  { id: 'reports', label: 'Financial Reports', icon: TrendingUp },
];

// Mock data
const MOCK_INVOICES = [
  { id: 'INV-001', customer: 'John Doe', email: 'john@example.com', amount: 45000, status: 'paid', dueDate: '2024-01-15', paidDate: '2024-01-14' },
  { id: 'INV-002', customer: 'Jane Smith', email: 'jane@example.com', amount: 32000, status: 'pending', dueDate: '2024-01-25', paidDate: null },
  { id: 'INV-003', customer: 'Mike Johnson', email: 'mike@example.com', amount: 28500, status: 'overdue', dueDate: '2024-01-10', paidDate: null },
  { id: 'INV-004', customer: 'Sarah Williams', email: 'sarah@example.com', amount: 55000, status: 'draft', dueDate: '2024-02-01', paidDate: null },
];

const MOCK_PAYMENTS = [
  { id: 'PAY-001', invoiceId: 'INV-001', customer: 'John Doe', amount: 45000, method: 'Credit Card', date: '2024-01-14', status: 'success' },
  { id: 'PAY-002', invoiceId: 'INV-005', customer: 'Alice Brown', amount: 38000, method: 'UPI', date: '2024-01-13', status: 'success' },
  { id: 'PAY-003', invoiceId: 'INV-006', customer: 'Bob Wilson', amount: 22000, method: 'Net Banking', date: '2024-01-12', status: 'failed' },
];

const PAYMENT_GATEWAYS = [
  { id: '1', name: 'Razorpay', status: 'connected', transactions: 1234, volume: '₹45.2L' },
  { id: '2', name: 'Paytm', status: 'connected', transactions: 567, volume: '₹18.5L' },
  { id: '3', name: 'Stripe', status: 'disconnected', transactions: 0, volume: '₹0' },
];

// Overview Component
const OverviewTab = memo(() => {
  const stats = [
    { label: 'Total Revenue', value: '₹12.5L', change: '+18%', icon: DollarSign, color: 'text-green-500' },
    { label: 'Pending Payments', value: '₹2.8L', change: '12 invoices', icon: Clock, color: 'text-yellow-500' },
    { label: 'Overdue', value: '₹45K', change: '3 invoices', icon: AlertCircle, color: 'text-red-500' },
    { label: 'This Month', value: '₹3.2L', change: '+24%', icon: TrendingUp, color: 'text-blue-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg bg-muted")}>
                    <Icon className={cn("h-5 w-5", stat.color)} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <div className="flex items-end justify-between mt-1">
                      <span className="text-2xl font-bold">{stat.value}</span>
                      <span className="text-xs text-muted-foreground">{stat.change}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {MOCK_INVOICES.slice(0, 4).map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{invoice.id}</p>
                    <p className="text-sm text-muted-foreground">{invoice.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₹{invoice.amount.toLocaleString()}</p>
                    <Badge variant={
                      invoice.status === 'paid' ? 'default' :
                      invoice.status === 'overdue' ? 'destructive' :
                      invoice.status === 'pending' ? 'secondary' : 'outline'
                    }>
                      {invoice.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Recent Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {MOCK_PAYMENTS.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-full",
                      payment.status === 'success' ? 'bg-green-500/10' : 'bg-red-500/10'
                    )}>
                      {payment.status === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{payment.customer}</p>
                      <p className="text-sm text-muted-foreground">{payment.method} • {payment.date}</p>
                    </div>
                  </div>
                  <p className="font-semibold">₹{payment.amount.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <Plus className="h-5 w-5" />
              <span className="text-sm">Create Invoice</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <Send className="h-5 w-5" />
              <span className="text-sm">Send Reminder</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <Download className="h-5 w-5" />
              <span className="text-sm">Export Report</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <Settings className="h-5 w-5" />
              <span className="text-sm">Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

OverviewTab.displayName = 'OverviewTab';

// Invoices Component
const InvoicesTab = memo(() => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Input placeholder="Search invoices..." className="w-64" />
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_INVOICES.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">{invoice.id}</TableCell>
                <TableCell>
                  <div>
                    <p>{invoice.customer}</p>
                    <p className="text-sm text-muted-foreground">{invoice.email}</p>
                  </div>
                </TableCell>
                <TableCell className="font-semibold">₹{invoice.amount.toLocaleString()}</TableCell>
                <TableCell>{invoice.dueDate}</TableCell>
                <TableCell>
                  <Badge variant={
                    invoice.status === 'paid' ? 'default' :
                    invoice.status === 'overdue' ? 'destructive' :
                    invoice.status === 'pending' ? 'secondary' : 'outline'
                  }>
                    {invoice.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem><Eye className="h-4 w-4 mr-2" /> View</DropdownMenuItem>
                      <DropdownMenuItem><Download className="h-4 w-4 mr-2" /> Download</DropdownMenuItem>
                      <DropdownMenuItem><Send className="h-4 w-4 mr-2" /> Send Reminder</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
});

InvoicesTab.displayName = 'InvoicesTab';

// Payments Component
const PaymentsTab = memo(() => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Input placeholder="Search payments..." className="w-64" />
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payment ID</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_PAYMENTS.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="font-medium">{payment.id}</TableCell>
                <TableCell>{payment.invoiceId}</TableCell>
                <TableCell>{payment.customer}</TableCell>
                <TableCell className="font-semibold">₹{payment.amount.toLocaleString()}</TableCell>
                <TableCell>{payment.method}</TableCell>
                <TableCell>{payment.date}</TableCell>
                <TableCell>
                  <Badge variant={payment.status === 'success' ? 'default' : 'destructive'}>
                    {payment.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
});

PaymentsTab.displayName = 'PaymentsTab';

// Payment Gateways Component
const GatewaysTab = memo(() => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Payment Gateways</h3>
          <p className="text-sm text-muted-foreground">Manage your payment gateway integrations</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Gateway
        </Button>
      </div>

      <div className="grid gap-4">
        {PAYMENT_GATEWAYS.map((gateway) => (
          <Card key={gateway.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Building className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{gateway.name}</h4>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span>{gateway.transactions.toLocaleString()} transactions</span>
                      <span>•</span>
                      <span>Volume: {gateway.volume}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={gateway.status === 'connected' ? 'default' : 'secondary'}>
                    {gateway.status}
                  </Badge>
                  <Button variant="outline" size="sm">
                    {gateway.status === 'connected' ? 'Configure' : 'Connect'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gateway Features */}
      <Card>
        <CardHeader>
          <CardTitle>Supported Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: CreditCard, title: 'Card Payments', description: 'Visa, Mastercard, Amex, RuPay' },
              { icon: Wallet, title: 'Digital Wallets', description: 'Paytm, PhonePe, Google Pay' },
              { icon: Building, title: 'Net Banking', description: 'All major banks supported' },
            ].map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div key={idx} className="p-4 border rounded-lg">
                  <Icon className="h-8 w-8 text-primary mb-3" />
                  <h4 className="font-medium">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

GatewaysTab.displayName = 'GatewaysTab';

// Financial Reports Component
const ReportsTab = memo(() => {
  const monthlyData = [
    { month: 'Jan', revenue: 450000, expenses: 120000 },
    { month: 'Feb', revenue: 520000, expenses: 135000 },
    { month: 'Mar', revenue: 480000, expenses: 110000 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Financial Reports</h3>
          <p className="text-sm text-muted-foreground">Track revenue, expenses, and profitability</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6 text-center">
            <DollarSign className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-3xl font-bold">₹14.5L</p>
            <p className="text-sm text-muted-foreground">Total Revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Receipt className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-3xl font-bold">₹3.65L</p>
            <p className="text-sm text-muted-foreground">Total Expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <PiggyBank className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <p className="text-3xl font-bold">₹10.85L</p>
            <p className="text-sm text-muted-foreground">Net Profit</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-8 w-8 text-purple-500 mx-auto mb-2" />
            <p className="text-3xl font-bold">74.8%</p>
            <p className="text-sm text-muted-foreground">Profit Margin</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {monthlyData.map((data, idx) => (
              <div key={idx} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold">{data.month} 2024</span>
                  <Badge variant="outline">
                    Profit: ₹{((data.revenue - data.expenses) / 1000).toFixed(0)}K
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Revenue</p>
                    <p className="font-medium text-green-500">₹{(data.revenue / 1000).toFixed(0)}K</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Expenses</p>
                    <p className="font-medium text-red-500">₹{(data.expenses / 1000).toFixed(0)}K</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

ReportsTab.displayName = 'ReportsTab';

export function PaymentBillingModule() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const getActiveTab = () => {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts.length >= 3 && parts[1] === 'payment-billing') {
      return parts[2] || 'overview';
    }
    return 'overview';
  };
  
  const [activeTab, setActiveTab] = useState(getActiveTab());

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    navigate(`/crm/payment-billing/${tab}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/crm')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CreditCard className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Payment & Billing</h1>
                <p className="text-sm text-muted-foreground">Invoicing, payments & financial tracking</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b bg-card/50">
        <div className="container mx-auto px-4">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="h-12 bg-transparent border-0">
              {PAYMENT_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'invoices' && <InvoicesTab />}
        {activeTab === 'payments' && <PaymentsTab />}
        {activeTab === 'gateways' && <GatewaysTab />}
        {activeTab === 'reports' && <ReportsTab />}
      </div>
    </div>
  );
}

export default memo(PaymentBillingModule);
