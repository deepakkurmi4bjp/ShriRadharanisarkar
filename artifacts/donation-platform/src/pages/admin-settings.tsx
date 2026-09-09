import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useListUsers, getListUsersQueryKey,
  useUpdateUser, useCreateUser, useDeleteUser,
  useDeleteDonation, useListDonations, getListDonationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Settings, ShieldCheck, Users, Database, Trash2,
  ToggleLeft, ToggleRight, AlertTriangle, CheckCircle2,
  Lock, Globe, Palette, Info, UserPlus, Eye, EyeOff,
  PauseCircle, PlayCircle, UserX, KeyRound,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatRupee } from "@/lib/format";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const SITE_CONFIG = {
  name: "श्री मां नर्मदा भक्त परिवार",
  subtitle: "दान प्रबंधन प्रणाली",
  tagline: "Official Platform",
  purposes: [
    "श्री मां नर्मदा जन्मोत्सव चुनरी यात्रा",
    "श्री राम जन्मोत्सव शोभायात्रा",
    "श्री हनुमान जन्मोत्सव शोभायात्रा",
    "धर्म रक्षा निधि संग्रहण",
    "अन्य",
  ],
};

const createUserSchema = z.object({
  name: z.string().min(2, "नाम कम से कम 2 अक्षर का होना चाहिए"),
  mobile: z.string().min(10, "मोबाइल नंबर 10 अंक का होना चाहिए").max(15),
  role: z.enum(["admin", "collector"]),
  password: z.string().min(4, "पासवर्ड कम से कम 4 अक्षर का होना चाहिए"),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

export default function AdminSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [resetTarget, setResetTarget] = useState<{ id: number; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPwd, setShowNewPwd] = useState(false);

  const { data: users, isLoading: usersLoading } = useListUsers({
    query: { queryKey: getListUsersQueryKey() },
  });
  const { data: donationsData, isLoading: donationsLoading } = useListDonations(
    { limit: 50 },
    { query: { queryKey: getListDonationsQueryKey({ limit: 50 }) } }
  );

  const updateUser = useUpdateUser();
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();
  const deleteDonation = useDeleteDonation();

  const isSuperAdmin = user?.role === "super_admin";

  const form = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: "", mobile: "", role: "collector", password: "" },
  });

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Lock size={48} className="text-muted-foreground" />
        <p className="text-muted-foreground text-lg">केवल Super Admin ही यह पृष्ठ देख सकते हैं।</p>
      </div>
    );
  }

  const handleCreateUser = (data: CreateUserForm) => {
    createUser.mutate(
      { data: { name: data.name, mobile: data.mobile, role: data.role, password: data.password } },
      {
        onSuccess: (newUser) => {
          toast({
            title: "✅ User बनाया गया",
            description: `${newUser.name} (${newUser.role}) — Mobile: ${newUser.mobile}`,
          });
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          form.reset();
        },
        onError: (err: any) => {
          toast({
            variant: "destructive",
            title: "User बनाने में समस्या",
            description: err?.error || "कृपया जानकारी जाँचें।",
          });
        },
      }
    );
  };

  const handleSuspend = (userId: number, isSuspended: boolean, userName: string) => {
    updateUser.mutate(
      { id: userId, data: { isSuspended: !isSuspended } },
      {
        onSuccess: () => {
          toast({
            title: isSuspended ? `✅ ${userName} को Unsuspend किया` : `⏸️ ${userName} को Suspend किया`,
          });
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        },
        onError: () => {
          toast({ variant: "destructive", title: "कार्य असफल रहा" });
        },
      }
    );
  };

  const handleToggleActive = (userId: number, isActive: boolean, userName: string) => {
    updateUser.mutate(
      { id: userId, data: { isActive: !isActive } },
      {
        onSuccess: () => {
          toast({
            title: isActive ? `🔴 ${userName} निष्क्रिय किया` : `🟢 ${userName} सक्रिय किया`,
          });
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        },
        onError: () => {
          toast({ variant: "destructive", title: "कार्य असफल रहा" });
        },
      }
    );
  };

  const handleDeleteUser = (userId: number, userName: string) => {
    deleteUser.mutate(
      { id: userId },
      {
        onSuccess: () => {
          toast({ title: `🗑️ ${userName} को स्थायी रूप से हटाया गया` });
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        },
        onError: (err: any) => {
          const msg =
            err?.data?.error ||
            err?.message ||
            "User हटाने में समस्या आई। कृपया दोबारा प्रयास करें।";
          toast({
            variant: "destructive",
            title: "User हटाने में समस्या",
            description: msg,
          });
        },
      }
    );
  };

  const handleResetPassword = () => {
    if (!resetTarget || newPassword.length < 4) {
      toast({ variant: "destructive", title: "पासवर्ड कम से कम 4 अक्षर का होना चाहिए" });
      return;
    }
    updateUser.mutate(
      { id: resetTarget.id, data: { password: newPassword } },
      {
        onSuccess: () => {
          toast({ title: `🔑 ${resetTarget.name} का पासवर्ड बदल दिया गया` });
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          setResetTarget(null);
          setNewPassword("");
          setShowNewPwd(false);
        },
        onError: () => {
          toast({ variant: "destructive", title: "पासवर्ड बदलने में समस्या" });
        },
      }
    );
  };

  const handleDeleteDonation = (id: number) => {
    deleteDonation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "दान रिकॉर्ड हटाया गया" });
          queryClient.invalidateQueries({ queryKey: getListDonationsQueryKey() });
        },
        onError: () => {
          toast({ variant: "destructive", title: "दान हटाने में समस्या" });
        },
      }
    );
  };

  const roleColors: Record<string, string> = {
    super_admin: "bg-red-100 text-red-800 border-red-200",
    admin: "bg-blue-100 text-blue-800 border-blue-200",
    collector: "bg-green-100 text-green-800 border-green-200",
    public: "bg-gray-100 text-gray-800 border-gray-200",
  };

  const roleLabels: Record<string, string> = {
    super_admin: "Super Admin",
    admin: "Admin",
    collector: "Collector",
    public: "Public",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="text-primary" /> Super Admin Settings
        </h1>
        <p className="text-muted-foreground mt-1">पूर्ण नियंत्रण — केवल Super Admin के लिए।</p>
      </div>

      <Tabs defaultValue="create-user">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="create-user" className="gap-1.5"><UserPlus size={14} /> User बनाएं</TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5"><Users size={14} /> Users प्रबंधन</TabsTrigger>
          <TabsTrigger value="site-info" className="gap-1.5"><Globe size={14} /> Site Info</TabsTrigger>
          <TabsTrigger value="purposes" className="gap-1.5"><Palette size={14} /> Purposes</TabsTrigger>
          <TabsTrigger value="donations" className="gap-1.5"><Database size={14} /> Donations</TabsTrigger>
        </TabsList>

        {/* ===== CREATE USER TAB ===== */}
        <TabsContent value="create-user" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-t-4 border-t-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus size={18} className="text-primary" /> नया User बनाएं
                </CardTitle>
                <CardDescription>
                  Admin या Collector का account बनाएं। वे मोबाइल नंबर और पासवर्ड से login करेंगे।
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleCreateUser)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>पूरा नाम</FormLabel>
                          <FormControl>
                            <Input placeholder="जैसे: राहुल शर्मा" {...field} />
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
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>भूमिका (Role)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="भूमिका चुनें" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="admin">🔵 Admin (प्रशासक)</SelectItem>
                              <SelectItem value="collector">🟢 Collector (संग्रहकर्ता)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>पासवर्ड</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="कम से कम 4 अक्षर"
                                type={showPassword ? "text" : "password"}
                                {...field}
                              />
                              <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={createUser.isPending}
                    >
                      {createUser.isPending ? "बनाया जा रहा है..." : "✅ User बनाएं"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card className="border border-amber-200 bg-amber-50/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-800">
                  <Info size={18} /> Login जानकारी
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-amber-900">
                <div className="p-3 bg-white/70 border border-amber-200 rounded-lg space-y-1">
                  <p className="font-semibold">User को यह जानकारी दें:</p>
                  <p>• <strong>User ID:</strong> उनका मोबाइल नंबर</p>
                  <p>• <strong>Password:</strong> आपके द्वारा सेट किया गया</p>
                  <p>• <strong>URL:</strong> इस platform का login page</p>
                </div>
                <div className="p-3 bg-white/70 border border-amber-200 rounded-lg space-y-1">
                  <p className="font-semibold">Login प्रक्रिया:</p>
                  <p>1. Login page खोलें</p>
                  <p>2. अपनी भूमिका चुनें (Admin/Collector)</p>
                  <p>3. मोबाइल नंबर डालें</p>
                  <p>4. पासवर्ड डालें</p>
                  <p>5. "सुरक्षित Login करें" दबाएं</p>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="font-semibold text-green-800">✅ Security Note:</p>
                  <p className="text-green-700">बिना पासवर्ड के login नहीं हो सकता। पासवर्ड सुरक्षित रखें।</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== USERS MANAGEMENT TAB ===== */}
        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users size={18} className="text-primary" /> सभी Users का प्रबंधन
              </CardTitle>
              <CardDescription>
                किसी भी Admin/Collector को Suspend (अस्थायी) या Delete (स्थायी) करें।
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>नाम</TableHead>
                    <TableHead>मोबाइल</TableHead>
                    <TableHead>भूमिका</TableHead>
                    <TableHead>स्थिति</TableHead>
                    <TableHead>जोड़ा</TableHead>
                    <TableHead className="text-right min-w-[200px]">कार्य</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersLoading
                    ? Array(5).fill(0).map((_, i) => (
                      <TableRow key={i}>
                        {Array(7).fill(0).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                    : (users || []).map((u) => {
                      const isSelf = u.id === user?.id;
                      const isSuperAdminUser = u.role === "super_admin";
                      const suspended = (u as any).isSuspended === true;
                      const canModify = !isSelf && !isSuperAdminUser;

                      return (
                        <TableRow key={u.id} className={suspended ? "opacity-60 bg-orange-50" : !u.isActive ? "opacity-50 bg-red-50" : ""}>
                          <TableCell className="font-mono text-xs">{u.id}</TableCell>
                          <TableCell className="font-semibold">{u.name} {isSelf && <span className="text-xs text-muted-foreground">(आप)</span>}</TableCell>
                          <TableCell className="font-mono text-sm">{u.mobile}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${roleColors[u.role] || ""}`}>
                              {roleLabels[u.role] || u.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge
                                variant="outline"
                                className={u.isActive
                                  ? "bg-green-100 text-green-800 border-green-200 text-xs"
                                  : "bg-red-100 text-red-800 border-red-200 text-xs"}
                              >
                                {u.isActive ? "✅ Active" : "🔴 Inactive"}
                              </Badge>
                              {suspended && (
                                <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
                                  ⏸️ Suspended
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">{formatDate(u.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            {isSuperAdminUser ? (
                              <span className="text-xs text-muted-foreground italic">Protected</span>
                            ) : (
                              <div className="flex items-center justify-end gap-1 flex-wrap">
                                {/* SUSPEND/UNSUSPEND BUTTON */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={`gap-1 text-xs h-7 ${suspended
                                    ? "border-green-500 text-green-700 hover:bg-green-50"
                                    : "border-orange-500 text-orange-700 hover:bg-orange-50"
                                    }`}
                                  disabled={!canModify || updateUser.isPending}
                                  onClick={() => handleSuspend(u.id, suspended, u.name)}
                                  title={suspended ? "Unsuspend करें" : "Suspend करें"}
                                >
                                  {suspended
                                    ? <><PlayCircle size={13} /> Unsuspend</>
                                    : <><PauseCircle size={13} /> Suspend</>
                                  }
                                </Button>

                                {/* ACTIVATE/DEACTIVATE BUTTON */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1 text-xs h-7"
                                  disabled={!canModify || updateUser.isPending}
                                  onClick={() => handleToggleActive(u.id, u.isActive, u.name)}
                                  title={u.isActive ? "Deactivate करें" : "Activate करें"}
                                >
                                  {u.isActive
                                    ? <><ToggleRight size={14} className="text-green-600" /> Deactivate</>
                                    : <><ToggleLeft size={14} /> Activate</>
                                  }
                                </Button>

                                {/* RESET PASSWORD BUTTON */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1 text-xs h-7 border-blue-400 text-blue-700 hover:bg-blue-50"
                                  disabled={!canModify || updateUser.isPending}
                                  onClick={() => { setResetTarget({ id: u.id, name: u.name }); setNewPassword(""); }}
                                  title="पासवर्ड बदलें"
                                >
                                  <KeyRound size={13} /> Password
                                </Button>

                                {/* DELETE BUTTON - with confirmation */}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="gap-1 text-xs h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      disabled={!canModify || deleteUser.isPending}
                                      title="स्थायी रूप से हटाएं"
                                    >
                                      <UserX size={13} /> Delete
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                                        <AlertTriangle size={20} /> User को स्थायी रूप से हटाएं?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        क्या आप <strong>{u.name}</strong> ({u.mobile}) को <strong>स्थायी रूप से हटाना</strong> चाहते हैं?
                                        <br /><br />
                                        यह कार्य <strong>वापस नहीं किया जा सकता</strong>। User का सारा डेटा हट जाएगा और यह audit log में दर्ज होगा।
                                        <br /><br />
                                        <span className="text-amber-700">💡 सुझाव: स्थायी हटाने की बजाय <strong>Suspend</strong> का उपयोग करें — इससे account अस्थायी रूप से बंद होता है।</span>
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>रद्द करें</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-destructive hover:bg-destructive/90"
                                        onClick={() => handleDeleteUser(u.id, u.name)}
                                      >
                                        हाँ, स्थायी रूप से हटाएं
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg text-orange-800">
              <PauseCircle size={16} className="mt-0.5 flex-shrink-0" />
              <div><strong>Suspend:</strong> अस्थायी। Login नहीं कर सकते। बाद में वापस कर सकते हैं।</div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
              <ToggleLeft size={16} className="mt-0.5 flex-shrink-0" />
              <div><strong>Deactivate:</strong> account बंद। Suspend से मिलता-जुलता।</div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <Trash2 size={16} className="mt-0.5 flex-shrink-0" />
              <div><strong>Delete:</strong> स्थायी। User हमेशा के लिए हट जाएगा।</div>
            </div>
          </div>
        </TabsContent>

        {/* ===== SITE INFO TAB ===== */}
        <TabsContent value="site-info" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-t-4 border-t-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Globe size={18} className="text-primary" /> Website Identity</CardTitle>
                <CardDescription>Current branding configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[
                    { label: "Organization Name", value: SITE_CONFIG.name },
                    { label: "Platform Subtitle", value: SITE_CONFIG.subtitle },
                    { label: "Official Tagline", value: SITE_CONFIG.tagline },
                  ].map((item) => (
                    <div key={item.label} className="flex flex-col gap-1 p-3 bg-muted/40 rounded-lg">
                      <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">{item.label}</span>
                      <span className="font-bold text-primary">{item.value}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                  <CheckCircle2 size={16} />
                  <span>Branding is active on all pages</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-t-4 border-t-amber-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldCheck size={18} className="text-amber-600" /> Security Status</CardTitle>
                <CardDescription>System security configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "SHA-256 HMAC Hash", ok: true },
                  { label: "QR Tamper Detection", ok: true },
                  { label: "Role-Based Access Control", ok: true },
                  { label: "Audit Log Tracking", ok: true },
                  { label: "Password Protection", ok: true },
                  { label: "Suspend/Delete Controls", ok: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                    <span className="text-sm font-medium">{item.label}</span>
                    <Badge className="bg-green-100 text-green-800 border-green-200" variant="outline">
                      <CheckCircle2 size={12} className="mr-1" /> Active
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== PURPOSES TAB ===== */}
        <TabsContent value="purposes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Palette size={18} className="text-primary" /> Donation Purposes</CardTitle>
              <CardDescription>Preset चंदे के कारण जो Collector Panel में दिखते हैं</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {SITE_CONFIG.purposes.map((purpose, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-muted/40 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-sm">
                        {i + 1}
                      </div>
                      <span className="font-medium">{purpose}</span>
                    </div>
                    {purpose === "अन्य" && (
                      <Badge variant="outline" className="text-xs">Custom Input Required</Badge>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <Info size={14} className="inline mr-2" />
                "अन्य" चुनने पर Collector को कारण लिखना अनिवार्य है।
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== DONATIONS TAB ===== */}
        <TabsContent value="donations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Database size={18} className="text-primary" /> All Donations</CardTitle>
              <CardDescription>Super Admin किसी भी दान record को स्थायी रूप से हटा सकते हैं। यह audit log में दर्ज होगा।</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Receipt ID</TableHead>
                    <TableHead>दाता</TableHead>
                    <TableHead>मोबाइल</TableHead>
                    <TableHead>राशि</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>उद्देश्य</TableHead>
                    <TableHead>Collector</TableHead>
                    <TableHead>दिनांक</TableHead>
                    <TableHead className="text-right">हटाएं</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {donationsLoading
                    ? Array(5).fill(0).map((_, i) => (
                      <TableRow key={i}>
                         {Array(10).fill(0).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                    : (donationsData?.donations || []).map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono text-xs">{d.donationId}</TableCell>
                        <TableCell className="font-semibold">{d.name}</TableCell>
                        <TableCell className="font-mono text-sm">{d.mobile}</TableCell>
                        <TableCell className="font-bold text-primary">{formatRupee(d.amount)}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className={d.paymentMethod === "upi" ? "border-violet-300 text-violet-700" : ""}>
                            {d.paymentMethod === "upi" ? "UPI" : "Cash"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{d.transactionId || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{d.purpose || "—"}</TableCell>
                        <TableCell className="text-xs">{d.collectorName || "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{formatDate(d.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 size={15} />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                                  <AlertTriangle size={20} /> दान record हटाएं?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  क्या आप <strong>{d.donationId}</strong> — <strong>{formatRupee(d.amount)}</strong> ({d.name}) को स्थायी रूप से हटाना चाहते हैं? यह कार्य वापस नहीं होगा।
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>रद्द करें</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive hover:bg-destructive/90"
                                  onClick={() => handleDeleteDonation(d.id)}
                                >
                                  हाँ, हटाएं
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* PASSWORD RESET DIALOG */}
      <Dialog open={!!resetTarget} onOpenChange={(open) => { if (!open) { setResetTarget(null); setNewPassword(""); setShowNewPwd(false); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-700">
              <KeyRound size={18} /> पासवर्ड बदलें
            </DialogTitle>
            <DialogDescription>
              <strong>{resetTarget?.name}</strong> के लिए नया पासवर्ड सेट करें। यह user को बताना न भूलें।
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="relative">
              <Input
                placeholder="नया पासवर्ड (कम से कम 4 अक्षर)"
                type={showNewPwd ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-10 h-11"
                autoFocus
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowNewPwd(!showNewPwd)}
              >
                {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {newPassword.length > 0 && newPassword.length < 4 && (
              <p className="text-xs text-red-600">पासवर्ड कम से कम 4 अक्षर का होना चाहिए।</p>
            )}
            {newPassword.length >= 4 && (
              <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 size={12} /> पासवर्ड सही है।</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetTarget(null); setNewPassword(""); }}>रद्द करें</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              disabled={newPassword.length < 4 || updateUser.isPending}
              onClick={handleResetPassword}
            >
              {updateUser.isPending ? "बदला जा रहा है..." : "🔑 पासवर्ड बदलें"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
