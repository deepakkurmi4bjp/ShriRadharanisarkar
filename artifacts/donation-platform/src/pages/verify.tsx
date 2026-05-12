import { useRoute } from "wouter";
import { useVerifyDonation, getVerifyDonationQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRupee, formatDate } from "@/lib/format";
import { ShieldAlert, Loader2, Info, BadgeCheck } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function VerifyDonation() {
  const [, params] = useRoute("/verify/:id");
  const id = params?.id ? parseInt(params.id) : 0;

  const { data, isLoading, isError } = useVerifyDonation(id, {
    query: {
      enabled: !!id,
      queryKey: getVerifyDonationQueryKey(id),
      retry: false,
    },
  });

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #e8f4fd 0%, #f0f9ff 50%, #e0f2fe 100%)" }}>
      <div className="w-full max-w-md">

        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-3">
            <img
              src="/logo.png"
              alt="श्री मां नर्मदा भक्त परिवार"
              className="w-24 h-24 object-contain drop-shadow-xl rounded-full"
              style={{ background: "white", padding: "4px" }}
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#0369a1" }}>
            श्री मां नर्मदा भक्त परिवार
          </h1>
          <p className="text-sm mt-1" style={{ color: "#0284c7" }}>
            आधिकारिक रसीद सत्यापन पोर्टल
          </p>
        </div>

        {isLoading ? (
          <Card className="shadow-xl border-t-4" style={{ borderTopColor: "#0ea5e9" }}>
            <CardContent className="flex flex-col items-center justify-center p-12">
              <Loader2 className="h-10 w-10 animate-spin mb-4" style={{ color: "#0ea5e9" }} />
              <p className="font-medium animate-pulse" style={{ color: "#0284c7" }}>
                रसीद सत्यापित की जा रही है...
              </p>
            </CardContent>
          </Card>

        ) : isError || !data ? (
          <Card className="shadow-xl border-t-4 border-t-red-500">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto bg-red-100 p-4 rounded-full text-red-600 w-20 h-20 flex items-center justify-center mb-4 shadow-inner">
                <ShieldAlert size={40} />
              </div>
              <CardTitle className="text-2xl text-red-600 font-bold">
                ❌ अमान्य रसीद
              </CardTitle>
              <Badge className="mx-auto mt-2 bg-red-100 text-red-700 border-red-200 text-xs" variant="outline">
                INVALID / TAMPERED
              </Badge>
            </CardHeader>
            <CardContent className="text-center px-6 pb-4">
              <p className="text-gray-600 mt-2">
                यह रसीद हमारे सत्यापन system में नहीं मिली। यह दस्तावेज़ <strong>जाली या छेड़छाड़ किया हुआ</strong> हो सकता है।
              </p>
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                ⚠️ इस रसीद पर भरोसा न करें। संस्था से सीधे संपर्क करें।
              </div>
            </CardContent>
            <CardFooter className="justify-center border-t bg-muted/10 py-4">
              <Link href="/"><Button variant="outline">Home पर जाएं</Button></Link>
            </CardFooter>
          </Card>

        ) : data.valid ? (
          /* ===== VALID RECEIPT — आसमानी/Sky Blue ===== */
          <Card className="shadow-xl border-t-4" style={{ borderTopColor: "#0ea5e9" }}>
            <CardHeader className="text-center pb-2"
              style={{ background: "linear-gradient(to bottom, #e0f2fe, #f0f9ff)" }}>
              <div className="mx-auto p-4 rounded-full w-20 h-20 flex items-center justify-center mb-4 shadow-inner"
                style={{ backgroundColor: "#bae6fd", color: "#0284c7" }}>
                <BadgeCheck size={44} />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight" style={{ color: "#0369a1" }}>
                ✅ वैध रसीद
              </CardTitle>
              <Badge className="mx-auto mt-2 text-xs font-semibold" variant="outline"
                style={{ backgroundColor: "#e0f2fe", color: "#0369a1", borderColor: "#7dd3fc" }}>
                VERIFIED & AUTHENTIC
              </Badge>
              <div className="flex items-center justify-center gap-1 mt-2 text-xs" style={{ color: "#0284c7" }}>
                <Info size={13} /> क्रिप्टोग्राफिक hash से सत्यापित
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="p-4 rounded-lg border text-center"
                  style={{ backgroundColor: "#e0f2fe", borderColor: "#7dd3fc" }}>
                  <span className="text-xs uppercase tracking-wider font-semibold block mb-1"
                    style={{ color: "#0284c7" }}>रसीद ID</span>
                  <span className="font-mono text-lg font-bold" style={{ color: "#0369a1" }}>
                    {data.donation.donationId}
                  </span>
                </div>

                <div className="space-y-3 pt-1">
                  {[
                    { label: "दाता का नाम", value: data.donation.name },
                    { label: "दान राशि", value: formatRupee(data.donation.amount), bold: true, large: true },
                    { label: "दिनांक व समय", value: formatDate(data.donation.createdAt) },
                    { label: "संग्रहकर्ता", value: data.donation.collectorName },
                    ...(data.donation.purpose ? [{ label: "उद्देश्य", value: data.donation.purpose }] : []),
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between border-b pb-2"
                      style={{ borderBottomColor: "#bae6fd" }}>
                      <span className="font-medium text-sm" style={{ color: "#0369a1" }}>{item.label}</span>
                      <span
                        className={`font-${item.bold ? "bold" : "medium"} text-right max-w-[55%] ${item.large ? "text-xl" : "text-sm"}`}
                        style={{ color: item.bold ? "#0284c7" : "#1e293b" }}
                      >
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-lg border text-center"
                  style={{ backgroundColor: "#f0fdf4", borderColor: "#86efac" }}>
                  <p className="text-xs font-semibold text-green-700">
                    🙏 श्री मां नर्मदा भक्त परिवार — आधिकारिक रसीद
                  </p>
                </div>
              </div>
            </CardContent>

            <CardFooter className="justify-center border-t flex flex-col gap-2 py-4"
              style={{ backgroundColor: "#f0f9ff" }}>
              <span className="text-[10px] font-mono text-center break-all" style={{ color: "#64748b" }}>
                Hash: {data.donation.hash.substring(0, 32)}...
              </span>
              <Link href="/">
                <Button variant="ghost" size="sm" className="mt-1" style={{ color: "#0284c7" }}>
                  Home पर जाएं
                </Button>
              </Link>
            </CardFooter>
          </Card>

        ) : (
          /* ===== TAMPERED RECORD — Red ===== */
          <Card className="shadow-xl border-t-4 border-t-red-500">
            <CardHeader className="text-center pb-2 bg-gradient-to-b from-red-50 to-transparent">
              <div className="mx-auto bg-red-100 p-4 rounded-full text-red-600 w-20 h-20 flex items-center justify-center mb-4 shadow-inner">
                <ShieldAlert size={40} />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight text-red-600">
                ❌ छेड़छाड़ की गई रसीद
              </CardTitle>
              <Badge className="mx-auto mt-2 bg-red-100 text-red-700 border-red-200 text-xs" variant="outline">
                TAMPERED RECORD
              </Badge>
            </CardHeader>
            <CardContent className="text-center px-6 pb-4">
              <p className="text-gray-600">
                यह रसीद हमारे database में मिली लेकिन <strong className="text-red-600">इसके साथ छेड़छाड़ की गई है</strong>। यह दस्तावेज़ फर्जी है।
              </p>
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                ⚠️ इस रसीद को तुरंत अस्वीकार करें।
              </div>
            </CardContent>
            <CardFooter className="justify-center border-t bg-muted/10 py-4">
              <Link href="/"><Button variant="outline">Home पर जाएं</Button></Link>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
