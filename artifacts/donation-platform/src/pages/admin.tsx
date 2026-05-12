import { useState } from "react";
import { useGetAnalyticsSummary, getGetAnalyticsSummaryQueryKey, useGetDailyAnalytics, getGetDailyAnalyticsQueryKey, useGetTopCollectors, getGetTopCollectorsQueryKey, useGetAmountDistribution, getGetAmountDistributionQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatRupee } from "@/lib/format";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { ArrowRight, Users, TrendingUp, IndianRupee, ShieldAlert, Sparkles, TrendingDown, AlertTriangle, CheckCircle2, Info, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

const COLORS = ['hsl(28, 85%, 45%)', 'hsl(40, 85%, 45%)', 'hsl(15, 85%, 45%)', 'hsl(5, 85%, 45%)', 'hsl(45, 85%, 45%)'];

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type AiInsight = {
  title: string;
  description: string;
  type: "positive" | "warning" | "info" | "achievement";
};

type AiInsightsResponse = {
  insights: AiInsight[];
  summary: string;
  generatedAt: string;
};

function insightConfig(type: AiInsight["type"]) {
  switch (type) {
    case "positive":
      return { icon: <TrendingUp size={18} />, class: "border-green-200 bg-green-50/70", badge: "bg-green-100 text-green-800 border-green-300", label: "सकारात्मक" };
    case "achievement":
      return { icon: <CheckCircle2 size={18} />, class: "border-amber-200 bg-amber-50/70", badge: "bg-amber-100 text-amber-800 border-amber-300", label: "उपलब्धि" };
    case "warning":
      return { icon: <AlertTriangle size={18} />, class: "border-red-200 bg-red-50/70", badge: "bg-red-100 text-red-800 border-red-300", label: "सावधानी" };
    default:
      return { icon: <Info size={18} />, class: "border-blue-200 bg-blue-50/70", badge: "bg-blue-100 text-blue-800 border-blue-300", label: "जानकारी" };
  }
}

function AiInsightsPanel() {
  const [data, setData] = useState<AiInsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("auth_token");
      const resp = await fetch(`${API_BASE}/api/ai/insights`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error(j.error || "AI Insights लोड नहीं हो सके।");
      }
      setData(await resp.json());
    } catch (e: any) {
      setError(e.message || "कुछ गलत हुआ।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm">
            वास्तविक दान डेटा के आधार पर AI द्वारा तैयार किए गए स्मार्ट Insights।
          </p>
        </div>
        <Button
          onClick={fetchInsights}
          disabled={loading}
          className="gap-2 min-w-[160px]"
        >
          {loading ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              विश्लेषण हो रहा है...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              {data ? "दोबारा विश्लेषण करें" : "AI Insights देखें"}
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!data && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 border-2 border-dashed border-muted rounded-xl bg-muted/20">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles size={28} className="text-primary" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-lg">AI-Powered Analysis</p>
            <p className="text-muted-foreground text-sm mt-1 max-w-xs">
              "AI Insights देखें" बटन दबाएं और अपने दान डेटा का स्मार्ट विश्लेषण पाएं।
            </p>
          </div>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      <AnimatePresence>
        {data && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {data.summary && (
              <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <Sparkles size={18} className="text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">AI सारांश</p>
                  <p className="text-sm font-medium">{data.summary}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.insights.map((insight, i) => {
                const cfg = insightConfig(insight.type);
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <Card className={`border ${cfg.class} shadow-sm`}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            <span className="text-foreground/70">{cfg.icon}</span>
                            {insight.title}
                          </div>
                          <Badge variant="outline" className={`text-xs flex-shrink-0 ${cfg.badge}`}>
                            {cfg.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{insight.description}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground text-right">
              विश्लेषण समय: {new Date(data.generatedAt).toLocaleString("en-IN")}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
      <div className="flex flex-col gap-3 border-b pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin Intelligence</h1>
          <p className="text-muted-foreground mt-1 text-sm">High-level overview and audit analytics.</p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/admin/users" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 py-2 gap-1.5">
            <Users size={15} /> यूज़र प्रबंधन
          </Link>
          <Link href="/admin/audit" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3 py-2 gap-1.5 shadow-sm">
            <ShieldAlert size={15} /> Audit Logs
          </Link>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
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
        <TabsList className="bg-muted/50 p-1 flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Trend Analytics</TabsTrigger>
          <TabsTrigger value="collectors" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Collector Performance</TabsTrigger>
          <TabsTrigger value="ai" className="data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5">
            <Sparkles size={14} className="text-amber-500" />
            AI Insights
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="col-span-1 lg:col-span-2 shadow-sm border-t-2 border-t-primary">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">30-Day Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[220px] sm:h-[300px] lg:h-[350px] w-full">
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
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">Donation Brackets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[220px] sm:h-[300px] w-full flex flex-col items-center justify-center">
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
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg">Top Collectors Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] sm:h-[400px] w-full">
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

        <TabsContent value="ai">
          <Card className="shadow-sm border-t-2 border-t-amber-400">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles size={20} className="text-amber-500" />
                AI-Powered Insights
              </CardTitle>
              <CardDescription>
                GPT द्वारा आपके दान डेटा का गहरा विश्लेषण — trends, patterns और सुझाव।
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AiInsightsPanel />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
