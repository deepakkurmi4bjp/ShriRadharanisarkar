import { useState } from "react";
import { useListUsers, getListUsersQueryKey, useCreateUser, useUpdateUser, CreateUserBodyRole } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Shield, UserCog, UserCheck, UserX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";

const userSchema = z.object({
  name: z.string().min(2, "Name is required"),
  mobile: z.string().min(10, "Mobile must be 10 digits"),
  role: z.nativeEnum(CreateUserBodyRole),
});

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: users, isLoading } = useListUsers({
    query: { queryKey: getListUsersQueryKey() }
  });

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      mobile: "",
      role: CreateUserBodyRole.collector,
    },
  });

  const onSubmitCreate = (data: z.infer<typeof userSchema>) => {
    createUser.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "User Created", description: `${data.name} has been added.` });
        setIsCreateOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Error", description: err.error || "Failed to create user" });
      }
    });
  };

  const toggleStatus = (id: number, currentStatus: boolean) => {
    updateUser.mutate({ id, data: { isActive: !currentStatus } }, {
      onSuccess: () => {
        toast({ title: "Status Updated" });
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Error", description: err.error });
      }
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin': return <Badge variant="default" className="bg-purple-600">Super Admin</Badge>;
      case 'admin': return <Badge variant="default" className="bg-blue-600">Admin</Badge>;
      case 'collector': return <Badge variant="default" className="bg-amber-600">Collector</Badge>;
      default: return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <UserCog className="text-primary" /> User Access Management
          </h1>
          <p className="text-muted-foreground mt-1">Control who can access the system and their roles.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-sm font-bold h-10">
              <Plus size={16} /> Provision New User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Provision New System User</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitCreate)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="mobile" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number (Login ID)</FormLabel>
                    <FormControl><Input type="tel" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem>
                    <FormLabel>System Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value={CreateUserBodyRole.collector}>Collector (Can add donations)</SelectItem>
                        <SelectItem value={CreateUserBodyRole.admin}>Admin (View analytics)</SelectItem>
                        <SelectItem value={CreateUserBodyRole.super_admin}>Super Admin (Full access)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full mt-4" disabled={createUser.isPending}>
                  {createUser.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create User Record"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-md border-t-2 border-t-primary">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[250px] font-bold">User Identity</TableHead>
                <TableHead className="font-bold">Role Privilege</TableHead>
                <TableHead className="font-bold">Account Status</TableHead>
                <TableHead className="font-bold hidden md:table-cell">Created Date</TableHead>
                <TableHead className="text-right font-bold">Access Control</TableHead>
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
                  <TableCell colSpan={5} className="h-24 text-center">No users found.</TableCell>
                </TableRow>
              ) : (
                users?.map((u) => (
                  <TableRow key={u.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="font-medium text-foreground">{u.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{u.mobile}</div>
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
                        <span className="text-xs text-muted-foreground mr-2 font-medium">
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
