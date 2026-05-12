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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, IndianRupee, Receipt, MessageCircle, Share2, CheckCircle2, Copy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { Textarea } from "@/components/ui/textarea";

const PRESET_PURPOSES = [
  "श्री मां नर्मदा जन्मोत्सव चुनरी यात्रा",
  "श्री राम जन्मोत्सव शोभायात्रा",
  "श्री हनुमान जन्मोत्सव शोभायात्रा",
  "धर्म रक्षा निधि संग्रहण",
  "अन्य",
] as const;

const donationSchema = z.object({
  name: z.string().min(2, "नाम आवश्यक है"),
  mobile: z.string().min(10, "मोबाइल नंबर 10 अंक का होना चाहिए").max(15, "मोबाइल नंबर बहुत लंबा है"),
  amount: z.coerce.number().min(1, "राशि 0 से अधिक होनी चाहिए"),
  purposeSelect: z.string().min(1, "चंदे का कारण चुनें"),
  purposeOther: z.string().optional(),
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
      purposeSelect: "",
      purposeOther: "",
    },
  });

  const purposeSelectValue = form.watch("purposeSelect");

  const onSubmit = (data: DonationFormValues) => {
    if (data.purposeSelect === "अन्य" && (!data.purposeOther || data.purposeOther.trim() === "")) {
      form.setError("purposeOther", { message: "कृपया कारण लिखें" });
      return;
    }

    const purpose = data.purposeSelect === "अन्य" ? data.purposeOther : data.purposeSelect;

    createDonation.mutate(
      { 
        data: { 
          name: data.name,
          mobile: data.mobile,
          amount: data.amount,
          purpose: purpose ?? undefined,
          collectorId: user?.id 
        } 
      },
      {
        onSuccess: (response) => {
          toast({
            title: "दान दर्ज हो गया",
            description: `${response.name} से ${formatRupee(response.amount)} सफलतापूर्वक दर्ज।`,
          });
          setSuccessData({ ...response, donorMobile: data.mobile });
          form.reset({ name: "", mobile: "", amount: undefined as any, purposeSelect: "", purposeOther: "" });
          
          queryClient.invalidateQueries({ queryKey: getGetAnalyticsSummaryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListDonationsQueryKey({ limit: 5, collector_id: user?.id }) });
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: "दान दर्ज करने में विफल",
            description: error?.error || "अप्रत्याशित त्रुटि हुई",
          });
        }
      }
    );
  };

  const verifyUrl = successData ? `${window.location.origin}/verify/${successData.id}` : "";

  const handleWhatsAppShare = () => {
    if (!successData) return;
    const mobile = successData.donorMobile?.replace(/\D/g, "");
    const message = encodeURIComponent(
      `🙏 श्री मां नर्मदा भक्त परिवार को \n\nआपका दान प्राप्त हो गया है\n\nदानकर्ता: ${successData.name}\nराशि: ₹${successData.amount.toLocaleString("en-IN")}\nकारण: ${successData.purpose || "सामान्य दान"}\nरसीद ID: ${successData.donationId}\n\nरसीद सत्यापन लिंक:\n${verifyUrl}\n\nधन्यवाद 🙏`
    );
    window.open(`https://wa.me/91${mobile}?text=${message}`, "_blank");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verifyUrl);
    toast({ title: "लिंक कॉपी हो गया" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Collector Workspace</h1>
          <p className="text-muted-foreground mt-1 text-sm">नए दान दर्ज करें और अपने दैनिक संग्रह ट्रैक करें।</p>
        </div>
        
        <Card className="bg-primary text-primary-foreground border-none shadow-lg sm:min-w-[200px]">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="bg-white/20 p-2 sm:p-3 rounded-full">
              <IndianRupee size={20} />
            </div>
            <div>
              <p className="text-primary-foreground/80 text-xs font-medium uppercase tracking-wider">आज का संग्रह</p>
              {isLoadingSummary ? (
                <Skeleton className="h-7 w-[80px] bg-primary-foreground/20 mt-1" />
              ) : (
                <p className="text-xl sm:text-2xl font-bold">{formatRupee(summary?.todayAmount || 0)}</p>
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
                नया दान दर्ज करें
              </CardTitle>
              <CardDescription>
                दानकर्ता की जानकारी सावधानी से भरें। सभी प्रविष्टियां ऑडिट की जाती हैं।
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
                          <FormLabel className="font-semibold text-foreground">दानकर्ता का नाम <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder="पूरा नाम" className="h-12 text-base bg-muted/30" data-testid="input-donor-name" {...field} />
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
                          <FormLabel className="font-semibold text-foreground">मोबाइल नंबर <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder="10 अंक का मोबाइल" type="tel" className="h-12 text-base bg-muted/30" data-testid="input-donor-mobile" {...field} />
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
                          <FormLabel className="font-semibold text-foreground">दान राशि (₹) <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-3.5 text-muted-foreground font-bold">₹</span>
                              <Input 
                                type="number" 
                                placeholder="0" 
                                className="h-12 pl-8 text-lg font-bold bg-muted/30 border-primary/20 focus-visible:border-primary" 
                                data-testid="input-amount"
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
                      name="purposeSelect"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-foreground">चंदे का कारण <span className="text-destructive">*</span></FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 text-base bg-muted/30" data-testid="select-purpose">
                                <SelectValue placeholder="कारण चुनें..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {PRESET_PURPOSES.map((p) => (
                                <SelectItem key={p} value={p} data-testid={`option-purpose-${p}`}>
                                  {p}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {purposeSelectValue === "अन्य" && (
                    <FormField
                      control={form.control}
                      name="purposeOther"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-foreground">अन्य कारण विवरण <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="कृपया चंदे का कारण यहाँ लिखें..." 
                              className="text-base bg-muted/30 min-h-[80px]" 
                              data-testid="input-purpose-other"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <Button 
                    type="submit" 
                    className="w-full h-14 text-lg font-bold shadow-md" 
                    disabled={createDonation.isPending}
                    data-testid="button-submit-donation"
                  >
                    {createDonation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        दर्ज हो रहा है...
                      </>
                    ) : (
                      "दान दर्ज करें और रसीद बनाएं"
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
              <CardTitle className="text-lg">आपकी हाल की प्रविष्टियां</CardTitle>
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
                    अभी तक कोई दान दर्ज नहीं।
                  </div>
                ) : (
                  recentDonations?.donations.map((donation) => (
                    <div key={donation.id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex justify-between font-semibold">
                        <span>{donation.name}</span>
                        <span className="text-primary">{formatRupee(donation.amount)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                        <span>{donation.purpose || "—"}</span>
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
        <DialogContent className="w-[95vw] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center text-green-600 flex flex-col items-center gap-2">
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
                <CheckCircle2 className="h-9 w-9 text-green-600" />
              </div>
              दान दर्ज हो गया!
            </DialogTitle>
            <DialogDescription className="text-center text-base">
              रसीद सुरक्षित रूप से तैयार की गई है।
            </DialogDescription>
          </DialogHeader>
          
          {successData && (
            <div className="space-y-4 mt-2">
              <div className="bg-muted/50 p-4 rounded-lg border space-y-2.5 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">रसीद ID</span>
                  <span className="font-mono font-bold text-foreground">{successData.donationId}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">राशि</span>
                  <span className="font-bold text-primary text-xl">{formatRupee(successData.amount)}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">दानकर्ता</span>
                  <span className="font-medium text-foreground">{successData.name}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">मोबाइल</span>
                  <span className="font-medium text-foreground">{successData.donorMobile}</span>
                </div>
                {successData.purpose && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">कारण</span>
                    <span className="font-medium text-foreground text-right max-w-[55%]">{successData.purpose}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center gap-2 p-4 bg-white border rounded-lg">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">QR Code — सत्यापन</p>
                <QRCodeSVG
                  value={verifyUrl}
                  size={140}
                  level="H"
                  includeMargin
                  imageSettings={{
                    src: "",
                    height: 0,
                    width: 0,
                    excavate: false,
                  }}
                />
                <p className="text-[10px] text-muted-foreground font-mono text-center mt-1 break-all">{verifyUrl}</p>
              </div>

              <div className="flex gap-2">
                <Button 
                  className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white font-bold"
                  onClick={handleWhatsAppShare}
                  data-testid="button-whatsapp-share"
                >
                  <MessageCircle size={18} />
                  WhatsApp पर भेजें
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleCopyLink}
                  data-testid="button-copy-link"
                >
                  <Copy size={16} />
                  लिंक कॉपी करें
                </Button>
              </div>

              <div className="text-xs text-center text-muted-foreground bg-amber-50 border border-amber-200 rounded p-2">
                <Share2 size={12} className="inline mr-1" />
                WhatsApp बटन दबाने पर आपके WhatsApp से दानकर्ता के नंबर पर रसीद भेजी जाएगी।
              </div>

              <Button className="w-full" size="lg" onClick={() => setSuccessData(null)} data-testid="button-new-entry">
                नई प्रविष्टि
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
