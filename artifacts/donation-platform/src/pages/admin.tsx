import { useGetAnalyticsSummary, getGetAnalyticsSummaryQueryKey, useGetDailyAnalytics, getGetDailyAnalyticsQueryKey, useGetTopCollectors, getGetTopCollectorsQueryKey, useGetAmountDistribution, getGetAmountDistributionQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRupee } from "@/lib/format";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { ArrowRight, Users, TrendingUp, IndianRupee, ShieldAlert } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ['hsl(28, 85%, 45%)', 'hsl(40, 85%, 45%)', 'hsl(15, 85%, 45%)', 'hsl(5, 85%, 45%)', 'hsl(45, 85%, 45%)'];

export default function AdminPanel() {
  const { data: summary, isLoading: isLoadingSummary } = useGetAnalyticsSummary({
    query: { queryKey: getGetAnalyticsSummaryQueryKey() }
  });

  const { data: dailyData, isLoading: isLoadingDaily } = useGetDailyAnalytics({
    query: { queryKey: getGetDailyAnalyticsQueryKey() }
  });

  const { data: topCollectors, isLoading: isLoadingTop } = useGetTopCollectors({
    query: { queryKey: getGetTopCollectorsQueryKey() }
  });

  const { data: distribution, isLoading: isLoadingDist } = useGetAmountDistribution({
    query: { queryKey: getGetAmountDistributionQueryKey() }
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border p-3 rounded-md shadow-lg">
          <p className="font-semibold">{label}</p>
          <p className="text-primary font-bold">{formatRupee(payload[0].value)}</p>
          {payload[1] && <p className="text-muted-foreground text-sm">{payload[1].value} donations</p>}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Intelligence</h1>
          <p className="text-muted-foreground mt-1">High-level overview and audit analytics.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Link href="/admin/users" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 gap-2">
            <Users size={16} /> User Management
          </Link>
          <Link href="/admin/audit" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 gap-2 shadow-sm">
            <ShieldAlert size={16} /> Audit Logs
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-8 w-full" /> : (
              <div className="text-2xl font-bold text-primary">{formatRupee(summary?.totalAmount)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              +{formatRupee(summary?.todayAmount)} today
            </p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Donations</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-8 w-full" /> : (
              <div className="text-2xl font-bold">{summary?.totalDonations.toLocaleString('en-IN')}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              +{summary?.todayDonations} today
            </p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Collectors</CardTitle>
            <Users className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-8 w-full" /> : (
              <div className="text-2xl font-bold">{summary?.totalCollectors}</div>
            )}
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Ticket</CardTitle>
            <IndianRupee className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-8 w-full" /> : (
              <div className="text-2xl font-bold">{formatRupee(summary?.avgDonation)}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Trend Analytics</TabsTrigger>
          <TabsTrigger value="collectors" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Collector Performance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="col-span-1 lg:col-span-2 shadow-sm border-t-2 border-t-primary">
              <CardHeader>
                <CardTitle>30-Day Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px] w-full">
                  {isLoadingDaily ? (
                    <Skeleton className="h-full w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tickFormatter={(val) => new Date(val).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis tickFormatter={(val) => `₹${val/1000}k`} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Donation Brackets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full flex flex-col items-center justify-center">
                  {isLoadingDist ? (
                    <Skeleton className="h-[250px] w-[250px] rounded-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={distribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="amount"
                          nameKey="range"
                        >
                          {distribution?.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatRupee(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {distribution?.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="truncate">{entry.range}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="collectors">
          <Card className="shadow-sm border-t-2 border-t-primary">
            <CardHeader>
              <CardTitle>Top Collectors Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                {isLoadingTop ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topCollectors} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" tickFormatter={(val) => `₹${val/1000}k`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis dataKey="collectorName" type="category" width={100} stroke="hsl(var(--foreground))" fontSize={13} fontWeight="bold" />
                      <Tooltip formatter={(value: number) => [formatRupee(value), 'Total Collected']} />
                      <Bar dataKey="totalAmount" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
