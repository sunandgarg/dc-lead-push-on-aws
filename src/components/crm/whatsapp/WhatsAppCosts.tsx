 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { Progress } from '@/components/ui/progress';
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from '@/components/ui/table';
 import {
   DollarSign,
   TrendingUp,
   TrendingDown,
   Calendar,
   AlertTriangle
 } from 'lucide-react';
 
 const monthlySpend = [
   { month: 'October', marketing: 12500, utility: 3200, auth: 800, total: 16500 },
   { month: 'November', marketing: 15800, utility: 4100, auth: 950, total: 20850 },
   { month: 'December', marketing: 18200, utility: 5200, auth: 1100, total: 24500 },
   { month: 'January', marketing: 22100, utility: 6800, auth: 1350, total: 30250 },
 ];
 
 const campaignCosts = [
   { name: 'MBA Admission 2025', category: 'Marketing', messages: 5000, cost: 2500, cpm: 0.50 },
   { name: 'Course Inquiry Follow-up', category: 'Marketing', messages: 2500, cost: 1250, cpm: 0.50 },
   { name: 'Application Status Updates', category: 'Utility', messages: 8500, cost: 1700, cpm: 0.20 },
   { name: 'OTP Verification', category: 'Authentication', messages: 6750, cost: 675, cpm: 0.10 },
 ];
 
 export function WhatsAppCosts() {
   const currentMonth = monthlySpend[monthlySpend.length - 1];
   const previousMonth = monthlySpend[monthlySpend.length - 2];
   const changePercent = ((currentMonth.total - previousMonth.total) / previousMonth.total) * 100;
   
   const budget = 50000;
   const budgetUsed = (currentMonth.total / budget) * 100;
 
   return (
     <div className="space-y-6">
       {/* Budget Overview */}
       <div className="grid gap-4 sm:grid-cols-3">
         <Card className="card-elevated sm:col-span-2">
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <DollarSign className="h-5 w-5" />
               Monthly Budget
             </CardTitle>
           </CardHeader>
           <CardContent>
             <div className="space-y-4">
               <div className="flex items-center justify-between">
                 <span className="text-2xl font-bold">₹{currentMonth.total.toLocaleString()}</span>
                 <span className="text-muted-foreground">of ₹{budget.toLocaleString()}</span>
               </div>
               <Progress value={budgetUsed} className="h-3" />
               <div className="flex items-center justify-between text-sm">
                 <span className="text-muted-foreground">{budgetUsed.toFixed(1)}% used</span>
                 <span className="text-muted-foreground">₹{(budget - currentMonth.total).toLocaleString()} remaining</span>
               </div>
               {budgetUsed > 80 && (
                 <div className="flex items-center gap-2 p-3 bg-yellow-500/10 text-yellow-600 rounded-lg">
                   <AlertTriangle className="h-4 w-4" />
                   <span className="text-sm">Budget usage is high. Consider reviewing campaign frequency.</span>
                 </div>
               )}
             </div>
           </CardContent>
         </Card>
 
         <Card className="card-elevated">
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               {changePercent > 0 ? (
                 <TrendingUp className="h-5 w-5 text-red-500" />
               ) : (
                 <TrendingDown className="h-5 w-5 text-green-500" />
               )}
               vs Last Month
             </CardTitle>
           </CardHeader>
           <CardContent>
             <p className={`text-3xl font-bold ${changePercent > 0 ? 'text-red-500' : 'text-green-500'}`}>
               {changePercent > 0 ? '+' : ''}{changePercent.toFixed(1)}%
             </p>
             <p className="text-sm text-muted-foreground mt-2">
               ₹{Math.abs(currentMonth.total - previousMonth.total).toLocaleString()} {changePercent > 0 ? 'more' : 'less'}
             </p>
           </CardContent>
         </Card>
       </div>
 
       {/* Category Breakdown */}
       <Card className="card-elevated">
         <CardHeader>
           <CardTitle>Spend by Category</CardTitle>
           <CardDescription>WhatsApp pricing varies by message category</CardDescription>
         </CardHeader>
         <CardContent>
           <div className="grid gap-4 sm:grid-cols-3">
             <div className="p-4 border border-border rounded-lg">
               <div className="flex items-center justify-between mb-2">
                 <span className="text-sm text-muted-foreground">Marketing</span>
                 <Badge className="bg-blue-500">~₹0.50/msg</Badge>
               </div>
               <p className="text-2xl font-bold text-blue-500">₹{currentMonth.marketing.toLocaleString()}</p>
               <p className="text-sm text-muted-foreground mt-1">
                 {((currentMonth.marketing / currentMonth.total) * 100).toFixed(1)}% of total
               </p>
             </div>
             <div className="p-4 border border-border rounded-lg">
               <div className="flex items-center justify-between mb-2">
                 <span className="text-sm text-muted-foreground">Utility</span>
                 <Badge className="bg-green-500">~₹0.20/msg</Badge>
               </div>
               <p className="text-2xl font-bold text-green-500">₹{currentMonth.utility.toLocaleString()}</p>
               <p className="text-sm text-muted-foreground mt-1">
                 {((currentMonth.utility / currentMonth.total) * 100).toFixed(1)}% of total
               </p>
             </div>
             <div className="p-4 border border-border rounded-lg">
               <div className="flex items-center justify-between mb-2">
                 <span className="text-sm text-muted-foreground">Authentication</span>
                 <Badge className="bg-purple-500">~₹0.10/msg</Badge>
               </div>
               <p className="text-2xl font-bold text-purple-500">₹{currentMonth.auth.toLocaleString()}</p>
               <p className="text-sm text-muted-foreground mt-1">
                 {((currentMonth.auth / currentMonth.total) * 100).toFixed(1)}% of total
               </p>
             </div>
           </div>
         </CardContent>
       </Card>
 
       {/* Monthly Trend */}
       <Card className="card-elevated">
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <Calendar className="h-5 w-5" />
             Monthly Spend History
           </CardTitle>
         </CardHeader>
         <CardContent>
           <Table>
             <TableHeader>
               <TableRow>
                 <TableHead>Month</TableHead>
                 <TableHead className="text-right">Marketing</TableHead>
                 <TableHead className="text-right">Utility</TableHead>
                 <TableHead className="text-right">Auth</TableHead>
                 <TableHead className="text-right">Total</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {monthlySpend.map((month) => (
                 <TableRow key={month.month}>
                   <TableCell className="font-medium">{month.month}</TableCell>
                   <TableCell className="text-right">₹{month.marketing.toLocaleString()}</TableCell>
                   <TableCell className="text-right">₹{month.utility.toLocaleString()}</TableCell>
                   <TableCell className="text-right">₹{month.auth.toLocaleString()}</TableCell>
                   <TableCell className="text-right font-bold">₹{month.total.toLocaleString()}</TableCell>
                 </TableRow>
               ))}
             </TableBody>
           </Table>
         </CardContent>
       </Card>
 
       {/* Campaign Cost Breakdown */}
       <Card className="card-elevated">
         <CardHeader>
           <CardTitle>Campaign Cost Breakdown</CardTitle>
         </CardHeader>
         <CardContent>
           <Table>
             <TableHeader>
               <TableRow>
                 <TableHead>Campaign</TableHead>
                 <TableHead>Category</TableHead>
                 <TableHead className="text-right">Messages</TableHead>
                 <TableHead className="text-right">Cost/Msg</TableHead>
                 <TableHead className="text-right">Total Cost</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {campaignCosts.map((campaign, i) => (
                 <TableRow key={i}>
                   <TableCell className="font-medium">{campaign.name}</TableCell>
                   <TableCell>
                     <Badge variant="outline">{campaign.category}</Badge>
                   </TableCell>
                   <TableCell className="text-right">{campaign.messages.toLocaleString()}</TableCell>
                   <TableCell className="text-right">₹{campaign.cpm.toFixed(2)}</TableCell>
                   <TableCell className="text-right font-bold">₹{campaign.cost.toLocaleString()}</TableCell>
                 </TableRow>
               ))}
             </TableBody>
           </Table>
         </CardContent>
       </Card>
     </div>
   );
 }