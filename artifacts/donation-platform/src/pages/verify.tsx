import { useRoute } from "wouter";
import { useVerifyDonation, getVerifyDonationQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRupee, formatDate } from "@/lib/format";
import { ShieldCheck, ShieldAlert, Loader2, Info } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function VerifyDonation() {
  const [, params] = useRoute("/verify/:id");
  const id = params?.id ? parseInt(params.id) : 0;

  const { data, isLoading, isError } = useVerifyDonation(id, {
    query: { 
      enabled: !!id, 
      queryKey: getVerifyDonationQueryKey(id),
      retry: false
    }
  });

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/20 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-primary rounded-xl text-primary-foreground mb-4 shadow-lg">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Trust Verification Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">Official digital receipt verification system</p>
        </div>

        {isLoading ? (
          <Card className="shadow-xl border-t-4 border-t-muted">
            <CardContent className="flex flex-col items-center justify-center p-12">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground font-medium animate-pulse">Verifying cryptographic hash...</p>
            </CardContent>
          </Card>
        ) : isError || !data ? (
          <Card className="shadow-xl border-t-4 border-t-destructive">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto bg-destructive/10 p-4 rounded-full text-destructive w-20 h-20 flex items-center justify-center mb-4">
                <ShieldAlert size={40} />
              </div>
              <CardTitle className="text-2xl text-destructive font-bold">TAMPERED OR INVALID</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground">
                This receipt could not be verified against our cryptographic ledger. Do not trust this document.
              </p>
            </CardContent>
            <CardFooter className="justify-center border-t bg-muted/10 py-4">
              <Link href="/">
                <Button variant="outline">Return to Home</Button>
              </Link>
            </CardFooter>
          </Card>
        ) : (
          <Card className={`shadow-xl border-t-4 ${data.valid ? 'border-t-green-500' : 'border-t-destructive'}`}>
            <CardHeader className="text-center pb-2 bg-gradient-to-b from-transparent to-muted/10">
              <div className={`mx-auto p-4 rounded-full w-20 h-20 flex items-center justify-center mb-4 shadow-inner ${data.valid ? 'bg-green-100 text-green-600' : 'bg-destructive/10 text-destructive'}`}>
                {data.valid ? <ShieldCheck size={40} /> : <ShieldAlert size={40} />}
              </div>
              <CardTitle className={`text-2xl font-bold tracking-tight ${data.valid ? 'text-green-600' : 'text-destructive'}`}>
                {data.valid ? 'OFFICIAL & VALID' : 'TAMPERED RECORD'}
              </CardTitle>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
                <Info size={14} /> Cryptographic ledger verified
              </div>
            </CardHeader>
            
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="bg-muted/30 p-4 rounded-lg border text-center">
                  <span className="text-muted-foreground text-sm uppercase tracking-wider font-semibold block mb-1">Receipt ID</span>
                  <span className="font-mono text-lg font-bold text-foreground">{data.donation.donationId}</span>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground font-medium">Donor Name</span>
                    <span className="font-bold text-foreground">{data.donation.name}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground font-medium">Donation Amount</span>
                    <span className="font-bold text-primary text-xl">{formatRupee(data.donation.amount)}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground font-medium">Date & Time</span>
                    <span className="font-medium text-foreground text-right">{formatDate(data.donation.createdAt)}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground font-medium">Collected By</span>
                    <span className="font-medium text-foreground">{data.donation.collectorName}</span>
                  </div>
                  {data.donation.purpose && (
                    <div className="flex justify-between border-b border-border/50 pb-2">
                      <span className="text-muted-foreground font-medium">Purpose</span>
                      <span className="font-medium text-foreground text-right max-w-[180px] truncate">{data.donation.purpose}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="justify-center border-t bg-muted/20 py-4 flex flex-col gap-2">
              <span className="text-[10px] text-muted-foreground font-mono truncate w-full text-center">
                Hash: {data.donation.hash.substring(0, 32)}...
              </span>
              <Link href="/">
                <Button variant="ghost" size="sm" className="mt-2">Go to Public Dashboard</Button>
              </Link>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
