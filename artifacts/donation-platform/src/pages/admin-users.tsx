import { useState, useRef } from "react";
import { useListUsers, getListUsersQueryKey, useCreateUser, useUpdateUser, CreateUserBodyRole } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, UserCog, UserCheck, UserX, Camera, Eye, EyeOff, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";

const userSchema = z.object({
  name: z.string().min(2, "नाम कम से कम 2 अक्षर का होना चाहिए"),
  mobile: z.string().length(10, "मोबाइल नंबर 10 अंकों का होना चाहिए"),
  role: z.nativeEnum(CreateUserBodyRole),
  password: z.string().min(6, "पासवर्ड कम से कम 6 अक्षर का होना चाहिए").optional().or(z.literal("")),
  email: z.string().email("सही Email डालें").optional().or(z.literal("")),
  aadharNumber: z.string().length(12, "आधार नंबर 12 अंकों का होना चाहिए").optional().or(z.literal("")),
  fatherHusbandName: z.string().min(2, "नाम कम से कम 2 अक्षर का होना चाहिए").optional().or(z.literal("")),
  photoUrl: z.string().optional().or(z.literal("")),
});

type UserForm = z.infer<typeof userSchema>;

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: users, isLoading } = useListUsers({
    query: { queryKey: getListUsersQueryKey() }
  });

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const form = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      mobile: "",
      role: CreateUserBodyRole.collector,
      password: "",
      email: "",
      aadharNumber: "",
      fatherHusbandName: "",
      photoUrl: "",
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ variant: "destructive", title: "फोटो बड़ा है", description: "फोटो 2MB से कम होना चाहिए।" });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setPhotoPreview(base64);
      form.setValue("photoUrl", base64);
    };
    reader.readAsDataURL(file);
  };

  const onSubmitCreate = (data: UserForm) => {
    createUser.mutate({
      data: {
        name: data.name,
        mobile: data.mobile,
        role: data.role,
        password: data.password || undefined,
        email: data.email || null,
        aadharNumber: data.aadharNumber || null,
        fatherHusbandName: data.fatherHusbandName || null,
        photoUrl: data.photoUrl || null,
      } as any
    }, {
      onSuccess: () => {
        toast({ title: "✅ User बन गया", description: `${data.name} को system में add कर दिया गया।` });
        setIsCreateOpen(false);
        form.reset();
        setPhotoPreview(null);
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Error", description: (err as any).data?.error || "User नहीं बन सका" });
      }
    });
  };

  const toggleStatus = (id: number, currentStatus: boolean) => {
    updateUser.mutate({ id, data: { isActive: !currentStatus } }, {
      onSuccess: () => {
        toast({ title: "Status बदल गया" });
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Error", description: (err as any).data?.error });
      }
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin': return <Badge className="bg-purple-600 hover:bg-purple-600">Super Admin</Badge>;
      case 'admin': return <Badge className="bg-blue-600 hover:bg-blue-600">Admin</Badge>;
      case 'collector': return <Badge className="bg-amber-600 hover:bg-amber-600">Collector</Badge>;
      default: return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <UserCog className="text-primary" size={22} /> User Management
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">System में नए users जोड़ें और उनका access control करें।</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) { form.reset(); setPhotoPreview(null); }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-sm font-bold h-10">
              <Plus size={16} /> नया User जोड़ें
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">नया System User बनाएं</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitCreate)} className="space-y-4 pt-2">

                {/* Photo Upload */}
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="w-24 h-24 rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden bg-muted"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {photoPreview ? (
                      <img src={photoPreview} alt="Photo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-muted-foreground">
                        <Camera size={24} />
                        <span className="text-xs mt-1">फोटो</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                  <p className="text-xs text-muted-foreground">फोटो upload करें (max 2MB)</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>पूरा नाम *</FormLabel>
                      <FormControl><Input placeholder="जैसे: Ramesh Kumar" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Father/Husband Name */}
                  <FormField control={form.control} name="fatherHusbandName" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>पिता / पति का नाम</FormLabel>
                      <FormControl><Input placeholder="जैसे: Suresh Kumar" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Mobile */}
                  <FormField control={form.control} name="mobile" render={({ field }) => (
                    <FormItem>
                      <FormLabel>मोबाइल नंबर * (Login ID)</FormLabel>
                      <FormControl><Input type="tel" maxLength={10} placeholder="10 अंकों का नंबर" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Aadhar Number */}
                  <FormField control={form.control} name="aadharNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>आधार नंबर</FormLabel>
                      <FormControl><Input type="tel" maxLength={12} placeholder="12 अंकों का आधार" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Email */}
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Email Address (OTP के लिए जरूरी)</FormLabel>
                      <FormControl><Input type="email" placeholder="example@gmail.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Password */}
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>पासवर्ड *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Login पासवर्ड डालें"
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
                  )} />

                  {/* Role */}
                  <FormField control={form.control} name="role" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>System Role *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value={CreateUserBodyRole.collector}>Collector — दान जोड़ सकता है</SelectItem>
                          <SelectItem value={CreateUserBodyRole.admin}>Admin — analytics देख सकता है</SelectItem>
                          <SelectItem value={CreateUserBodyRole.super_admin}>Super Admin — पूरा access</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <Button type="submit" className="w-full mt-2" disabled={createUser.isPending}>
                  {createUser.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> बन रहा है...</> : "✅ User बनाएं"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-md border-t-2 border-t-primary">
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[520px]">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[260px] font-bold">User</TableHead>
                <TableHead className="font-bold">Role</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="font-bold hidden md:table-cell">जोड़ा गया</TableHead>
                <TableHead className="text-right font-bold">Access</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-24 mt-1" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-6 w-10 inline-block" /></TableCell>
                  </TableRow>
                ))
              ) : users?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">कोई user नहीं मिला।</TableCell>
                </TableRow>
              ) : (
                users?.map((u) => (
                  <TableRow key={u.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-muted border flex-shrink-0 flex items-center justify-center">
                          {(u as any).photoUrl ? (
                            <img src={(u as any).photoUrl} alt={u.name} className="w-full h-full object-cover" />
                          ) : (
                            <User size={16} className="text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{u.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{u.mobile}</div>
                          {(u as any).fatherHusbandName && (
                            <div className="text-xs text-muted-foreground">पि./पति: {(u as any).fatherHusbandName}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(u.role)}</TableCell>
                    <TableCell>
                      {u.isActive ? (
                        <div className="flex items-center text-xs font-bold text-green-600 gap-1"><UserCheck size={14}/> ACTIVE</div>
                      ) : (
                        <div className="flex items-center text-xs font-bold text-destructive gap-1"><UserX size={14}/> SUSPENDED</div>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-muted-foreground mr-1 font-medium">
                          {u.isActive ? "Suspend" : "Activate"}
                        </span>
                        <Switch
                          checked={u.isActive}
                          onCheckedChange={() => toggleStatus(u.id, u.isActive)}
                          disabled={updateUser.isPending}
                          className="data-[state=checked]:bg-green-500"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
