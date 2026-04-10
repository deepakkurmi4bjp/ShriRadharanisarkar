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
import { Loader2, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

const loginSchema = z.object({
  mobile: z.string().min(10, "Mobile number must be at least 10 digits").max(15, "Mobile number is too long"),
  name: z.string().min(2, "Name is required"),
  role: z.nativeEnum(LoginBodyRole),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { login: setAuthData } = useAuth();
  const { toast } = useToast();
  
  const loginMutation = useLogin();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      mobile: "",
      name: "",
      role: LoginBodyRole.collector,
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate({ data }, {
      onSuccess: (response) => {
        setAuthData(response.user, response.token);
        toast({
          title: "Login Successful",
          description: `Welcome back, ${response.user.name}`,
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
          title: "Login Failed",
          description: error.error || "An unexpected error occurred",
        });
      }
    });
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
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <ShieldCheck size={28} />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">System Access</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Enter your credentials to access the donation management platform
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
                      <FormLabel>Access Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={LoginBodyRole.collector}>Collector</SelectItem>
                          <SelectItem value={LoginBodyRole.admin}>Administrator</SelectItem>
                          <SelectItem value={LoginBodyRole.super_admin}>Super Admin</SelectItem>
                          <SelectItem value={LoginBodyRole.public}>Public Viewer</SelectItem>
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
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your full name" {...field} />
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
                      <FormLabel>Mobile Number</FormLabel>
                      <FormControl>
                        <Input placeholder="10-digit mobile number" type="tel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full mt-6" 
                  size="lg"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    "Secure Login"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="justify-center border-t py-4 bg-muted/20">
            <p className="text-xs text-muted-foreground">
              By accessing this system, you agree to the audit policies. Every action is logged.
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
