import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateDonation, useGetAnalyticsSummary, getGetAnalyticsSummaryQueryKey, useListDonations, getListDonationsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { formatRupee, formatDate } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, IndianRupee, QrCode, Receipt } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const donationSchema = z.object({
  name: z.string().min(2, "Name is required"),
  mobile: z.string().min(10, "Mobile number must be at least 10 digits").max(15, "Mobile number is too long"),
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  purpose: z.string().optional(),
});

type DonationFormValues = z.infer<typeof donationSchema>;

export default function CollectorPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [successData, setSuccessData] = useState<any | null>(null);
  
  const createDonation = useCreateDonation();
  
  const { data: summary, isLoading: isLoadingSummary } = useGetAnalyticsSummary({
    query: { queryKey: getGetAnalyticsSummaryQueryKey() }
  });

  const { data: recentDonations, isLoading: isLoadingRecent } = useListDonations(
    { limit: 5, collector_id: user?.id },
    { query: { queryKey: getListDonationsQueryKey({ limit: 5, collector_id: user?.id }) } }
  );

  const form = useForm<DonationFormValues>({
    resolver: zodResolver(donationSchema),
    defaultValues: {
      name: "",
      mobile: "",
      amount: undefined,
      purpose: "",
    },
  });

  const onSubmit = (data: DonationFormValues) => {
    createDonation.mutate(
      { 
        data: { 
          ...data, 
          collectorId: user?.id 
        } 
      },
      {
        onSuccess: (response) => {
          toast({
            title: "Donation Recorded",
            description: `Successfully recorded ${formatRupee(response.amount)} from ${response.name}`,
          });
          setSuccessData(response);
          form.reset({ name: "", mobile: "", amount: undefined as any, purpose: "" });
          
          queryClient.invalidateQueries({ queryKey: getGetAnalyticsSummaryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListDonationsQueryKey({ limit: 5, collector_id: user?.id }) });
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Failed to record donation",
            description: error.error || "An unexpected error occurred",
          });
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Collector Workspace</h1>
          <p className="text-muted-foreground mt-1">Record new donations and track your daily collections.</p>
        </div>
        
        <Card className="bg-primary text-primary-foreground border-none shadow-lg">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-full">
              <IndianRupee size={24} />
            </div>
            <div>
              <p className="text-primary-foreground/80 text-sm font-medium uppercase tracking-wider">Your Collections Today</p>
              {isLoadingSummary ? (
                <Skeleton className="h-8 w-[100px] bg-primary-foreground/20 mt-1" />
              ) : (
                <p className="text-2xl font-bold">{formatRupee(summary?.todayAmount || 0)}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-t-4 border-t-primary shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="text-primary" />
                New Donation Entry
              </CardTitle>
              <CardDescription>
                Enter donor details carefully. All entries are audited and final.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-foreground">Donor Name <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder="Full Name" className="h-12 text-base bg-muted/30" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="mobile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-foreground">Mobile Number <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder="10-digit mobile" type="tel" className="h-12 text-base bg-muted/30" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-foreground">Donation Amount (₹) <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-3.5 text-muted-foreground font-bold">₹</span>
                              <Input 
                                type="number" 
                                placeholder="0" 
                                className="h-12 pl-8 text-lg font-bold bg-muted/30 border-primary/20 focus-visible:border-primary" 
                                {...field} 
                                value={field.value || ''}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="purpose"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-foreground">Purpose / Remarks</FormLabel>
                          <FormControl>
                            <Input placeholder="General Fund, Building, etc." className="h-12 text-base bg-muted/30" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-14 text-lg font-bold shadow-md" 
                    disabled={createDonation.isPending}
                  >
                    {createDonation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Processing Securely...
                      </>
                    ) : (
                      "Record Donation & Generate Receipt"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="h-full shadow-md">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg">Your Recent Entries</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {isLoadingRecent ? (
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="p-4 space-y-2">
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  ))
                ) : recentDonations?.donations?.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    No donations recorded by you yet.
                  </div>
                ) : (
                  recentDonations?.donations.map((donation) => (
                    <div key={donation.id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex justify-between font-semibold">
                        <span>{donation.name}</span>
                        <span className="text-primary">{formatRupee(donation.amount)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                        <span>ID: {donation.donationId}</span>
                        <span>{formatDate(donation.createdAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!successData} onOpenChange={(open) => !open && setSuccessData(null)}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center text-green-600 flex flex-col items-center gap-2">
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
                <Receipt className="h-8 w-8 text-green-600" />
              </div>
              Success!
            </DialogTitle>
            <DialogDescription className="text-center text-base">
              Donation recorded successfully and securely hashed.
            </DialogDescription>
          </DialogHeader>
          
          {successData && (
            <div className="bg-muted/50 p-4 rounded-lg mt-4 text-left border space-y-3">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Receipt ID</span>
                <span className="font-mono font-bold text-foreground">{successData.donationId}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-bold text-primary text-xl">{formatRupee(successData.amount)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Donor Name</span>
                <span className="font-medium text-foreground">{successData.name}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Mobile</span>
                <span className="font-medium text-foreground">{successData.mobile}</span>
              </div>
              <div className="pt-2">
                <span className="text-xs text-muted-foreground block mb-1">Verification URL</span>
                <div className="bg-background border p-2 rounded flex items-center justify-between">
                  <span className="font-mono text-xs truncate max-w-[200px]">
                    {window.location.origin}/verify/{successData.id}
                  </span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/verify/${successData.id}`);
                    toast({ title: "Copied to clipboard" });
                  }}>
                    <QrCode size={12} />
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <Button className="w-full mt-4" size="lg" onClick={() => setSuccessData(null)}>
            New Entry
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
