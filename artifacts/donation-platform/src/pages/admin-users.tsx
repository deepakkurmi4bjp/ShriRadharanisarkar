import { useState, useRef } from "react";
import {
  useListUsers, getListUsersQueryKey,
  useCreateUser, useUpdateUser, useDeleteUser,
  CreateUserBodyRole
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger, DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField,
  FormItem, FormLabel, FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Plus, UserCog, UserCheck, UserX,
  Camera, Eye, EyeOff, User, Pencil, Trash2,
  Mail, AlertTriangle, ImageOff
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(2, "नाम कम से कम 2 अक्षर का होना चाहिए"),
  mobile: z.string().length(10, "मोबाइल नंबर 10 अंकों का होना चाहिए"),
  role: z.nativeEnum(CreateUserBodyRole),
  password: z.string().min(6, "पासवर्ड कम से कम 6 अक्षर का होना चाहिए").or(z.literal("")),
  email: z.string().email("सही Email डालें").or(z.literal("")),
  aadharNumber: z.string().length(12, "आधार नंबर 12 अंकों का होना चाहिए").or(z.literal("")),
  fatherHusbandName: z.string().min(2, "नाम कम से कम 2 अक्षर का होना चाहिए").or(z.literal("")),
  photoUrl: z.string().optional().or(z.literal("")),
});

const editSchema = z.object({
  name: z.string().min(2, "नाम कम से कम 2 अक्षर का होना चाहिए"),
  role: z.nativeEnum(CreateUserBodyRole),
  password: z.string().min(6, "पासवर्ड कम से कम 6 अक्षर का होना चाहिए").or(z.literal("")),
  email: z.string().email("सही Email डालें").or(z.literal("")),
  aadharNumber: z.string().length(12, "आधार नंबर 12 अंकों का होना चाहिए").or(z.literal("")),
  fatherHusbandName: z.string().min(2, "नाम कम से कम 2 अक्षर का होना चाहिए").or(z.literal("")),
  photoUrl: z.string().optional().or(z.literal("")),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;

// ─── Types ────────────────────────────────────────────────────────────────────

type AnyUser = {
  id: number;
  name: string;
  mobile: string;
  role: string;
  isActive: boolean;
  isSuspended?: boolean;
  photoUrl?: string | null;
  email?: string | null;
  aadharNumber?: string | null;
  fatherHusbandName?: string | null;
  createdAt: string;
};

// ─── Photo Upload Helper ───────────────────────────────────────────────────────

function PhotoUpload({
  preview, onFile, onDelete, showDelete = false,
}: {
  preview: string | null;
  onFile: (base64: string) => void;
  onDelete?: () => void;
  showDelete?: boolean;
}) {
  const { toast } = useToast();
  const ref = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      toast({ variant: "destructive", title: "फोटो बड़ा है", description: "फोटो 100MB से कम होनी चाहिए।" });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => onFile(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="w-24 h-24 rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden bg-muted"
        onClick={() => ref.current?.click()}
      >
        {preview ? (
          <img src={preview} alt="Photo" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center text-muted-foreground">
            <Camera size={24} />
            <span className="text-xs mt-1">फोटो</span>
          </div>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      <div className="flex gap-2">
        <p className="text-xs text-muted-foreground">फोटो upload करें (max 100MB)</p>
        {showDelete && preview && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="text-xs text-destructive hover:underline flex items-center gap-1"
          >
            <ImageOff size={12} /> हटाएं
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Password Field ────────────────────────────────────────────────────────────

function PasswordInput({ field, placeholder }: { field: any; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        placeholder={placeholder || "पासवर्ड डालें"}
        {...field}
      />
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        onClick={() => setShow(!show)}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === "super_admin";

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AnyUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<AnyUser | null>(null);

  // Photo states
  const [createPhoto, setCreatePhoto] = useState<string | null>(null);
  const [editPhoto, setEditPhoto] = useState<string | null>(null);

  const { data: users, isLoading } = useListUsers({
    query: { queryKey: getListUsersQueryKey() }
  });

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  // ── Create form ──
  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", mobile: "", role: CreateUserBodyRole.collector, password: "", email: "", aadharNumber: "", fatherHusbandName: "", photoUrl: "" },
  });

  // ── Edit form ──
  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: "", role: CreateUserBodyRole.collector, password: "", email: "", aadharNumber: "", fatherHusbandName: "", photoUrl: "" },
  });

  // Open edit dialog and pre-fill form
  const openEdit = (u: AnyUser) => {
    setEditingUser(u);
    const photo = u.photoUrl || null;
    setEditPhoto(photo);
    editForm.reset({
      name: u.name,
      role: (u.role as any) || CreateUserBodyRole.collector,
      password: "",
      email: u.email || "",
      aadharNumber: (u as any).aadharNumber || "",
      fatherHusbandName: (u as any).fatherHusbandName || "",
      photoUrl: photo || "",
    });
  };

  // ── Handlers ──

  const onSubmitCreate = (data: CreateForm) => {
    createUser.mutate({
      data: {
        name: data.name,
        mobile: data.mobile,
        role: data.role,
        password: data.password || undefined,
        email: data.email || null,
        aadharNumber: data.aadharNumber || null,
        fatherHusbandName: data.fatherHusbandName || null,
        photoUrl: createPhoto || null,
      } as any
    }, {
      onSuccess: () => {
        toast({ title: "✅ User बन गया", description: `${data.name} को system में add कर दिया गया।` });
        setIsCreateOpen(false);
        createForm.reset();
        setCreatePhoto(null);
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err?.data?.error || "User नहीं बन सका" });
      }
    });
  };

  const onSubmitEdit = (data: EditForm) => {
    if (!editingUser) return;
    const payload: Record<string, any> = {
      name: data.name,
      role: data.role,
      email: data.email || null,
      aadharNumber: data.aadharNumber || null,
      fatherHusbandName: data.fatherHusbandName || null,
      photoUrl: editPhoto ?? null,
    };
    if (data.password) payload.password = data.password;

    updateUser.mutate({ id: editingUser.id, data: payload as any }, {
      onSuccess: () => {
        toast({ title: "✅ User update हो गया", description: `${data.name} की जानकारी save हो गई।` });
        setEditingUser(null);
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err?.data?.error || "Update नहीं हो सका" });
      }
    });
  };

  const toggleStatus = (id: number, currentStatus: boolean) => {
    updateUser.mutate({ id, data: { isActive: !currentStatus } }, {
      onSuccess: () => {
        toast({ title: "Status बदल गया" });
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err?.data?.error });
      }
    });
  };

  const confirmDelete = () => {
    if (!deletingUser) return;
    deleteUser.mutate({ id: deletingUser.id }, {
      onSuccess: () => {
        toast({ title: "User हटा दिया गया", description: `${deletingUser.name} को system से remove कर दिया।` });
        setDeletingUser(null);
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err?.data?.error || "Delete नहीं हो सका" });
      }
    });
  };

  // ── Role badge ──
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin': return <Badge className="bg-purple-600 hover:bg-purple-600">Super Admin</Badge>;
      case 'admin': return <Badge className="bg-blue-600 hover:bg-blue-600">Admin</Badge>;
      case 'collector': return <Badge className="bg-amber-600 hover:bg-amber-600">Collector</Badge>;
      default: return <Badge variant="outline">{role}</Badge>;
    }
  };

  // ── Shared form fields (used in both create & edit) ──
  const renderCommonFields = (form: any, isEdit = false) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Name */}
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

      {/* Mobile (only in create) */}
      {!isEdit && (
        <FormField control={form.control} name="mobile" render={({ field }) => (
          <FormItem>
            <FormLabel>मोबाइल नंबर * (Login ID)</FormLabel>
            <FormControl><Input type="tel" maxLength={10} placeholder="10 अंकों का नंबर" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      )}

      {/* Aadhar */}
      <FormField control={form.control} name="aadharNumber" render={({ field }) => (
        <FormItem className={isEdit ? "sm:col-span-2" : ""}>
          <FormLabel>आधार नंबर</FormLabel>
          <FormControl><Input type="tel" maxLength={12} placeholder="12 अंकों का आधार" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />

      {/* Email */}
      <FormField control={form.control} name="email" render={({ field }) => (
        <FormItem className="sm:col-span-2">
          <FormLabel className="flex items-center gap-1">
            <Mail size={13} /> Email Address
            <span className="text-destructive font-bold">*</span>
            <span className="text-xs text-muted-foreground font-normal ml-1">(OTP इसी पर जाएगा — अलग-अलग Email जरूरी)</span>
          </FormLabel>
          <FormControl><Input type="email" placeholder="example@gmail.com" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />

      {/* Password */}
      <FormField control={form.control} name="password" render={({ field }) => (
        <FormItem className="sm:col-span-2">
          <FormLabel>पासवर्ड {isEdit ? <span className="text-xs text-muted-foreground font-normal">(खाली छोड़ें = नहीं बदलेगा)</span> : "*"}</FormLabel>
          <FormControl><PasswordInput field={field} placeholder={isEdit ? "नया पासवर्ड (optional)" : "Login पासवर्ड डालें"} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />

      {/* Role */}
      <FormField control={form.control} name="role" render={({ field }) => (
        <FormItem className="sm:col-span-2">
          <FormLabel>System Role *</FormLabel>
          <Select onValueChange={field.onChange} value={field.value}>
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
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <UserCog className="text-primary" size={22} /> User Management
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Users जोड़ें, edit करें और उनका access control करें।</p>
        </div>

        {/* Create Dialog */}
        {isSuperAdmin && (
          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) { createForm.reset(); setCreatePhoto(null); }
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
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onSubmitCreate)} className="space-y-4 pt-2">
                  <PhotoUpload
                    preview={createPhoto}
                    onFile={(b64) => { setCreatePhoto(b64); createForm.setValue("photoUrl", b64); }}
                  />
                  {renderCommonFields(createForm, false)}
                  <Button type="submit" className="w-full mt-2" disabled={createUser.isPending}>
                    {createUser.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> बन रहा है...</> : "✅ User बनाएं"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Users Table */}
      <Card className="shadow-md border-t-2 border-t-primary">
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[240px] font-bold">User</TableHead>
                <TableHead className="font-bold">Email</TableHead>
                <TableHead className="font-bold">Role</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="font-bold hidden md:table-cell">जोड़ा गया</TableHead>
                <TableHead className="text-right font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-24 mt-1" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 inline-block" /></TableCell>
                  </TableRow>
                ))
              ) : users?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">कोई user नहीं मिला।</TableCell>
                </TableRow>
              ) : (
                (users as AnyUser[] | undefined)?.map((u) => (
                  <TableRow key={u.id} className="hover:bg-muted/30">
                    {/* Identity */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-muted border flex-shrink-0 flex items-center justify-center">
                          {u.photoUrl ? (
                            <img src={u.photoUrl} alt={u.name} className="w-full h-full object-cover" />
                          ) : (
                            <User size={16} className="text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{u.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{u.mobile}</div>
                          {u.fatherHusbandName && (
                            <div className="text-xs text-muted-foreground">पि./पति: {u.fatherHusbandName}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Email */}
                    <TableCell>
                      {u.email ? (
                        <span className="text-xs text-muted-foreground">{u.email}</span>
                      ) : (
                        <span className="text-xs text-destructive flex items-center gap-1">
                          <AlertTriangle size={12} /> Email नहीं है
                        </span>
                      )}
                    </TableCell>

                    {/* Role */}
                    <TableCell>{getRoleBadge(u.role)}</TableCell>

                    {/* Status */}
                    <TableCell>
                      {u.isActive ? (
                        <div className="flex items-center text-xs font-bold text-green-600 gap-1"><UserCheck size={14} /> ACTIVE</div>
                      ) : (
                        <div className="flex items-center text-xs font-bold text-destructive gap-1"><UserX size={14} /> SUSPENDED</div>
                      )}
                    </TableCell>

                    {/* Created */}
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatDate(u.createdAt)}</TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Active toggle */}
                        <Switch
                          checked={u.isActive}
                          onCheckedChange={() => toggleStatus(u.id, u.isActive)}
                          disabled={updateUser.isPending}
                          className="data-[state=checked]:bg-green-500"
                          title={u.isActive ? "Suspend करें" : "Activate करें"}
                        />
                        {/* Edit */}
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(u)}
                          title="Edit करें"
                        >
                          <Pencil size={14} />
                        </Button>
                        {/* Delete (super_admin only, can't delete super_admin) */}
                        {isSuperAdmin && u.role !== "super_admin" && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeletingUser(u)}
                            title="Delete करें"
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Edit Dialog ─────────────────────────────────────────── */}
      <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">User Edit करें</DialogTitle>
            {editingUser && (
              <DialogDescription className="text-sm">
                मोबाइल: <span className="font-mono font-bold">{editingUser.mobile}</span> — मोबाइल नंबर नहीं बदल सकते।
              </DialogDescription>
            )}
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-4 pt-2">
              <PhotoUpload
                preview={editPhoto}
                onFile={(b64) => { setEditPhoto(b64); editForm.setValue("photoUrl", b64); }}
                showDelete
                onDelete={() => { setEditPhoto(null); editForm.setValue("photoUrl", ""); }}
              />
              {renderCommonFields(editForm, true)}
              <Button type="submit" className="w-full mt-2" disabled={updateUser.isPending}>
                {updateUser.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Save हो रहा है...</> : "💾 Changes Save करें"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ────────────────────────────────── */}
      <Dialog open={!!deletingUser} onOpenChange={(open) => { if (!open) setDeletingUser(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 size={18} /> User Delete करें?
            </DialogTitle>
            <DialogDescription>
              <strong>{deletingUser?.name}</strong> ({deletingUser?.mobile}) को permanently delete करना चाहते हैं?
              यह action undo नहीं हो सकती।
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletingUser(null)}>रद्द करें</Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 size={14} className="mr-2" />}
              हाँ, Delete करें
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
