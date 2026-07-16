 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/select';
 import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
 import {
   Send,
   CheckCircle,
   Eye,
   MousePointer,
   TrendingUp,
   Calendar
 } from 'lucide-react';
 
 const timeSeriesData = [
   { date: 'Jan 20', sent: 5000, delivered: 4850, read: 3200 },
   { date: 'Jan 25', sent: 3500, delivered: 3400, read: 2100 },
   { date: 'Jan 30', sent: 4200, delivered: 4100, read: 2800 },
   { date: 'Feb 1', sent: 2500, delivered: 2400, read: 1800 },
   { date: 'Feb 3', sent: 1200, delivered: 1150, read: 800 },
 ];
 
 const statusDistribution = [
   { name: 'Delivered', value: 15900, color: '#10B981' },
   { name: 'Read', value: 10700, color: '#3B82F6' },
   { name: 'Failed', value: 600, color: '#EF4444' },
 ];
 
 const campaignPerformance = [
   { name: 'MBA Admission', sent: 5000, delivered: 4850, read: 3200, ctr: 12 },
   { name: 'Course Inquiry', sent: 2500, delivered: 2400, read: 1800, ctr: 8 },
   { name: 'Scholarship', sent: 4200, delivered: 4100, read: 2800, ctr: 15 },
 ];
 
 export function WhatsAppAnalytics() {
   const stats = {
     totalSent: 16400,
     delivered: 15900,
     deliveryRate: 96.9,
     read: 10700,
     readRate: 67.3,
     clicked: 1850,
     ctr: 11.6,
   };
 
   return (
     <div className="space-y-6">
       {/* Date Range Selector */}
       <div className="flex items-center justify-between">
         <div>
           <h2 className="text-xl font-bold">Campaign Analytics</h2>
           <p className="text-sm text-muted-foreground">Track your WhatsApp marketing performance</p>
         </div>
         <Select defaultValue="30d">
           <SelectTrigger className="w-[180px]">
             <Calendar className="h-4 w-4 mr-2" />
             <SelectValue />
           </SelectTrigger>
           <SelectContent>
             <SelectItem value="7d">Last 7 days</SelectItem>
             <SelectItem value="30d">Last 30 days</SelectItem>
             <SelectItem value="90d">Last 90 days</SelectItem>
             <SelectItem value="all">All time</SelectItem>
           </SelectContent>
         </Select>
       </div>
 
       {/* Key Metrics */}
       <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
         <Card className="card-elevated">
           <CardContent className="pt-6">
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-sm text-muted-foreground">Messages Sent</p>
                 <p className="text-3xl font-bold">{stats.totalSent.toLocaleString()}</p>
               </div>
               <Send className="h-8 w-8 text-muted-foreground" />
             </div>
           </CardContent>
         </Card>
         
         <Card className="card-elevated border-green-500/30">
           <CardContent className="pt-6">
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-sm text-muted-foreground">Delivered</p>
                 <p className="text-3xl font-bold text-green-500">{stats.delivered.toLocaleString()}</p>
                 <p className="text-sm text-muted-foreground">{stats.deliveryRate}% rate</p>
               </div>
               <CheckCircle className="h-8 w-8 text-green-500" />
             </div>
           </CardContent>
         </Card>
 
         <Card className="card-elevated border-blue-500/30">
           <CardContent className="pt-6">
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-sm text-muted-foreground">Read</p>
                 <p className="text-3xl font-bold text-blue-500">{stats.read.toLocaleString()}</p>
                 <p className="text-sm text-muted-foreground">{stats.readRate}% rate</p>
               </div>
               <Eye className="h-8 w-8 text-blue-500" />
             </div>
           </CardContent>
         </Card>
 
         <Card className="card-elevated border-purple-500/30">
           <CardContent className="pt-6">
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-sm text-muted-foreground">Link Clicks</p>
                 <p className="text-3xl font-bold text-purple-500">{stats.clicked.toLocaleString()}</p>
                 <p className="text-sm text-muted-foreground">{stats.ctr}% CTR</p>
               </div>
               <MousePointer className="h-8 w-8 text-purple-500" />
             </div>
           </CardContent>
         </Card>
       </div>
 
       {/* Charts Row */}
       <div className="grid gap-6 lg:grid-cols-3">
         {/* Time Series Chart */}
         <Card className="card-elevated lg:col-span-2">
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <TrendingUp className="h-5 w-5" />
               Message Trends
             </CardTitle>
           </CardHeader>
           <CardContent>
             <div className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={timeSeriesData}>
                   <defs>
                     <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                       <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                     </linearGradient>
                     <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                       <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                     </linearGradient>
                     <linearGradient id="colorRead" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                       <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                   <XAxis dataKey="date" className="text-xs" />
                   <YAxis className="text-xs" />
                   <Tooltip 
                     contentStyle={{ 
                       backgroundColor: 'hsl(var(--card))', 
                       border: '1px solid hsl(var(--border))',
                       borderRadius: '8px'
                     }}
                   />
                   <Area type="monotone" dataKey="sent" stroke="#8B5CF6" fillOpacity={1} fill="url(#colorSent)" />
                   <Area type="monotone" dataKey="delivered" stroke="#10B981" fillOpacity={1} fill="url(#colorDelivered)" />
                   <Area type="monotone" dataKey="read" stroke="#3B82F6" fillOpacity={1} fill="url(#colorRead)" />
                 </AreaChart>
               </ResponsiveContainer>
             </div>
             <div className="flex justify-center gap-6 mt-4">
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-purple-500" />
                 <span className="text-sm">Sent</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-green-500" />
                 <span className="text-sm">Delivered</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-blue-500" />
                 <span className="text-sm">Read</span>
               </div>
             </div>
           </CardContent>
         </Card>
 
         {/* Pie Chart */}
         <Card className="card-elevated">
           <CardHeader>
             <CardTitle>Status Distribution</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="h-[250px]">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={statusDistribution}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={80}
                     paddingAngle={5}
                     dataKey="value"
                   >
                     {statusDistribution.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                   <Tooltip />
                 </PieChart>
               </ResponsiveContainer>
             </div>
             <div className="space-y-2">
               {statusDistribution.map((item) => (
                 <div key={item.name} className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                     <span className="text-sm">{item.name}</span>
                   </div>
                   <span className="text-sm font-medium">{item.value.toLocaleString()}</span>
                 </div>
               ))}
             </div>
           </CardContent>
         </Card>
       </div>
 
       {/* Campaign Performance */}
       <Card className="card-elevated">
         <CardHeader>
           <CardTitle>Campaign Performance</CardTitle>
           <CardDescription>Compare performance across campaigns</CardDescription>
         </CardHeader>
         <CardContent>
           <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={campaignPerformance}>
                 <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                 <XAxis dataKey="name" className="text-xs" />
                 <YAxis className="text-xs" />
                 <Tooltip 
                   contentStyle={{ 
                     backgroundColor: 'hsl(var(--card))', 
                     border: '1px solid hsl(var(--border))',
                     borderRadius: '8px'
                   }}
                 />
                 <Legend />
                 <Bar dataKey="sent" fill="#8B5CF6" name="Sent" radius={[4, 4, 0, 0]} />
                 <Bar dataKey="delivered" fill="#10B981" name="Delivered" radius={[4, 4, 0, 0]} />
                 <Bar dataKey="read" fill="#3B82F6" name="Read" radius={[4, 4, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
           </div>
         </CardContent>
       </Card>
     </div>
   );
 }