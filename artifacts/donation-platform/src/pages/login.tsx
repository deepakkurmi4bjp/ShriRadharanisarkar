import { useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLogin, LoginBodyRole } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, Eye, EyeOff, KeyRound, Info } from "lucide-react";
import { motion } from "framer-motion";

const loginSchema = z.object({
  mobile: z.string().min(10, "मोबाइल नंबर कम से कम 10 अंक का होना चाहिए").max(15),
  name: z.string().min(2, "नाम आवश्यक है"),
  role: z.nativeEnum(LoginBodyRole),
  password: z.string().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { login: setAuthData } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useLogin();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      mobile: "",
      name: "",
      role: LoginBodyRole.collector,
      password: "",
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(
      { data: { ...data, password: data.password || undefined } },
      {
        onSuccess: (response) => {
          setAuthData(response.user, response.token);
          toast({
            title: "Login सफल",
            description: `स्वागत है, ${response.user.name}`,
          });

          if (response.user.role === "admin" || response.user.role === "super_admin") {
            setLocation("/admin");
          } else if (response.user.role === "collector") {
            setLocation("/collector");
          } else {
            setLocation("/");
          }
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Login असफल",
            description: (error as any)?.error || "कृपया जानकारी जाँचें और दोबारा प्रयास करें।",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="border-t-4 border-t-primary shadow-xl">
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="flex justify-center mb-2">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <ShieldCheck size={30} />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">श्री मां नर्मदा भक्त परिवार</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              दान प्रबंधन प्रणाली — सुरक्षित प्रवेश
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>भूमिका (Role)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="भूमिका चुनें" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={LoginBodyRole.collector}>🟢 Collector (संग्रहकर्ता)</SelectItem>
                          <SelectItem value={LoginBodyRole.admin}>🔵 Admin (प्रशासक)</SelectItem>
                          <SelectItem value={LoginBodyRole.super_admin}>🔴 Super Admin</SelectItem>
                          <SelectItem value={LoginBodyRole.public}>⚪ Public Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>पूरा नाम</FormLabel>
                      <FormControl>
                        <Input placeholder="अपना पूरा नाम डालें" {...field} />
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
                      <FormLabel>मोबाइल नंबर (User ID)</FormLabel>
                      <FormControl>
                        <Input placeholder="10 अंक का मोबाइल नंबर" type="tel" {...field} />
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
                      <FormLabel className="flex items-center gap-1.5">
                        <KeyRound size={14} />
                        पासवर्ड
                        <span className="text-xs text-muted-foreground font-normal">(Super Admin द्वारा बनाए account के लिए)</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="पासवर्ड डालें (यदि दिया गया हो)"
                            type={showPassword ? "text" : "password"}
                            {...field}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  <Info size={14} className="mt-0.5 flex-shrink-0" />
                  <span>Admin/Collector accounts जो Super Admin ने बनाए हैं उनके लिए मोबाइल नंबर + पासवर्ड दोनों आवश्यक हैं।</span>
                </div>

                <Button
                  type="submit"
                  className="w-full mt-2"
                  size="lg"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      प्रमाणीकरण हो रहा है...
                    </>
                  ) : (
                    "सुरक्षित Login करें"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>

          <CardFooter className="justify-center border-t py-4 bg-muted/20">
            <p className="text-xs text-muted-foreground text-center">
              इस system में प्रवेश करने पर सभी गतिविधियाँ audit log में दर्ज होती हैं।
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
