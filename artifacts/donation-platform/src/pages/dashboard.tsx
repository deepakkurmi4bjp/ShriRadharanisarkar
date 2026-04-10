import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetAnalyticsSummary, getGetAnalyticsSummaryQueryKey, useListDonations, getListDonationsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRupee, formatDate } from "@/lib/format";
import { IndianRupee, Users, ArrowUpRight, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const queryClient = useQueryClient();
  
  const { data: summary, isLoading: isLoadingSummary } = useGetAnalyticsSummary({
    query: { queryKey: getGetAnalyticsSummaryQueryKey() }
  });

  const { data: donationsData, isLoading: isLoadingDonations } = useListDonations({ limit: 10 }, {
    query: { queryKey: getListDonationsQueryKey({ limit: 10 }) }
  });

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: getGetAnalyticsSummaryQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListDonationsQueryKey({ limit: 10 }) });
    }, 30000);
    return () => clearInterval(interval);
  }, [queryClient]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Public Dashboard</h1>
        <p className="text-muted-foreground flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          Live updating every 30 seconds
        </p>
      </div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <motion.div variants={item}>
          <Card className="border-t-4 border-t-primary shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Raised</CardTitle>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <IndianRupee size={16} />
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? (
                <Skeleton className="h-8 w-[120px]" />
              ) : (
                <div className="text-3xl font-bold text-primary">{formatRupee(summary?.totalAmount)}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1 text-green-600 font-medium flex items-center">
                <ArrowUpRight size={14} className="mr-1" />
                {formatRupee(summary?.todayAmount)} today
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Donors</CardTitle>
              <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Users size={16} />
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? (
                <Skeleton className="h-8 w-[80px]" />
              ) : (
                <div className="text-3xl font-bold">{summary?.totalDonors?.toLocaleString('en-IN') || 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {summary?.todayDonations?.toLocaleString('en-IN') || 0} donations today
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Donation</CardTitle>
              <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Activity size={16} />
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? (
                <Skeleton className="h-8 w-[100px]" />
              ) : (
                <div className="text-3xl font-bold">{formatRupee(summary?.avgDonation)}</div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Collectors</CardTitle>
              <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Users size={16} />
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? (
                <Skeleton className="h-8 w-[60px]" />
              ) : (
                <div className="text-3xl font-bold">{summary?.totalCollectors?.toLocaleString('en-IN') || 0}</div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4 tracking-tight">Recent Donations</h2>
        <Card className="shadow-md overflow-hidden border-border/50">
          <div className="divide-y">
            {isLoadingDonations ? (
              Array(5).fill(0).map((_, i) => (
                <div key={i} className="p-4 flex justify-between items-center">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-[150px]" />
                    <Skeleton className="h-4 w-[100px]" />
                  </div>
                  <Skeleton className="h-8 w-[100px]" />
                </div>
              ))
            ) : donationsData?.donations?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No donations recorded yet.
              </div>
            ) : (
              donationsData?.donations.map((donation, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={donation.id} 
                  className="p-4 flex justify-between items-center hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      {donation.name}
                      {donation.isVerified && (
                        <span className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">VERIFIED</span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground flex gap-3 mt-1">
                      <span>{formatDate(donation.createdAt)}</span>
                      {donation.purpose && <span className="hidden sm:inline">&bull; {donation.purpose}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg text-primary">{formatRupee(donation.amount)}</div>
                    <div className="text-xs text-muted-foreground">ID: {donation.donationId}</div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
