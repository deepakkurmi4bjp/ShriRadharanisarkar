import { useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, Eye, EyeOff, Phone, Lock, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

const loginSchema = z.object({
  mobile: z.string().min(10, "मोबाइल नंबर 10 अंक का होना चाहिए").max(15),
  password: z.string().min(1, "पासवर्ड आवश्यक है"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login: setAuthData } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [failedMsg, setFailedMsg] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { mobile: "", password: "" },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setFailedMsg(null);
    try {
      const resp = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: data.mobile, password: data.password }),
      });

      const json = await resp.json();

      if (!resp.ok) {
        setFailedMsg(json.error || "Login असफल रहा। कृपया दोबारा प्रयास करें।");
        return;
      }

      setAuthData(json.user, json.token);
      toast({ title: `✅ स्वागत है, ${json.user.name}!`, description: `Role: ${json.user.role}` });

      if (json.user.role === "super_admin" || json.user.role === "admin") {
        setLocation("/admin");
      } else if (json.user.role === "collector") {
        setLocation("/collector");
      } else {
        setLocation("/");
      }
    } catch {
      setFailedMsg("Server से connection नहीं हो पाया। कृपया दोबारा प्रयास करें।");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <Card className="border-t-4 border-t-primary shadow-2xl">
          <CardHeader className="space-y-3 text-center pb-4">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary shadow-inner">
                <ShieldCheck size={34} />
              </div>
            </div>
            <div>
              <CardTitle className="text-xl font-bold tracking-tight text-primary">
                श्री मां नर्मदा भक्त परिवार
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                दान प्रबंधन प्रणाली — सुरक्षित प्रवेश
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {failedMsg && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800"
              >
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-red-600" />
                <span>{failedMsg}</span>
              </motion.div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-sm font-semibold">
                        <Phone size={14} /> मोबाइल नंबर
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="10 अंक का मोबाइल नंबर"
                          type="tel"
                          inputMode="numeric"
                          className="h-11 text-base"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-sm font-semibold">
                        <Lock size={14} /> पासवर्ड
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="पासवर्ड डालें"
                            type={showPassword ? "text" : "password"}
                            className="h-11 text-base pr-10"
                            {...field}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      जाँच हो रही है...
                    </>
                  ) : (
                    "🔐 Login करें"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>

          <CardFooter className="flex-col gap-2 border-t py-4 bg-muted/20">
            <div className="text-xs text-muted-foreground text-center space-y-1">
              <p>⚠️ 5 बार गलत password डालने पर 15 मिनट के लिए block होगा।</p>
              <p>सभी login प्रयास audit log में दर्ज होते हैं।</p>
            </div>
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Account नहीं है? Super Admin से संपर्क करें।
        </p>
      </motion.div>
    </div>
  );
}
