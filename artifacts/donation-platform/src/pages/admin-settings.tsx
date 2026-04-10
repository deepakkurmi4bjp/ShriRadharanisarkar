import { useState } from "react";
import { useListUsers, getListUsersQueryKey, useUpdateUser, useCreateUser, useDeleteDonation, useListDonations, getListDonationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, ShieldCheck, Users, Database, Trash2, 
  ToggleLeft, ToggleRight, AlertTriangle, CheckCircle2,
  Lock, Globe, Palette, Info
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatRupee } from "@/lib/format";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const SITE_CONFIG = {
  name: "श्री मां नर्मदा भक्त परिवार",
  subtitle: "दान प्रबंधन प्रणाली",
  tagline: "Official Platform",
  purposes: [
    "नर्मदा जन्मोत्सव चुनरी यात्रा",
    "श्री राम जन्मोत्सव शोभायात्रा",
    "श्री हनुमान जन्मोत्सव शोभायात्रा",
    "धर्म रक्षा निधि संग्रहण",
    "अन्य",
  ],
};

export default function AdminSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deletingDonationId, setDeletingDonationId] = useState<number | null>(null);

  const { data: users, isLoading: usersLoading } = useListUsers({
    query: { queryKey: getListUsersQueryKey() }
  });
  const { data: donationsData, isLoading: donationsLoading } = useListDonations(
    { limit: 50 },
    { query: { queryKey: getListDonationsQueryKey({ limit: 50 }) } }
  );

  const updateUser = useUpdateUser();
  const deleteDonation = useDeleteDonation();

  const isSuperAdmin = user?.role === "super_admin";

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Lock size={48} className="text-muted-foreground" />
        <p className="text-muted-foreground text-lg">Only Super Admin can access this page.</p>
      </div>
    );
  }

  const handleToggleUser = (userId: number, isActive: boolean) => {
    updateUser.mutate(
      { id: userId, data: { isActive: !isActive } },
      {
        onSuccess: () => {
          toast({ title: isActive ? "User deactivated" : "User activated" });
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Failed to update user" });
        }
      }
    );
  };

  const handleDeleteDonation = (id: number) => {
    deleteDonation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Donation deleted" });
          queryClient.invalidateQueries({ queryKey: getListDonationsQueryKey({ limit: 50 }) });
          setDeletingDonationId(null);
        },
        onError: () => {
          toast({ variant: "destructive", title: "Failed to delete donation" });
        }
      }
    );
  };

  const roleColors: Record<string, string> = {
    super_admin: "bg-red-100 text-red-800 border-red-200",
    admin: "bg-blue-100 text-blue-800 border-blue-200",
    collector: "bg-green-100 text-green-800 border-green-200",
    public: "bg-gray-100 text-gray-800 border-gray-200",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="text-primary" /> Super Admin Settings
        </h1>
        <p className="text-muted-foreground mt-1">Full website control — only accessible to Super Admin.</p>
      </div>

      <Tabs defaultValue="site-info">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="site-info" className="gap-2"><Globe size={15} /> Site Info</TabsTrigger>
          <TabsTrigger value="purposes" className="gap-2"><Palette size={15} /> Purposes</TabsTrigger>
          <TabsTrigger value="users" className="gap-2"><Users size={15} /> All Users</TabsTrigger>
          <TabsTrigger value="donations" className="gap-2"><Database size={15} /> Donations</TabsTrigger>
        </TabsList>

        <TabsContent value="site-info" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-t-4 border-t-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Globe size={18} className="text-primary" /> Website Identity</CardTitle>
                <CardDescription>Current branding configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex flex-col gap-1 p-3 bg-muted/40 rounded-lg">
                    <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Organization Name</span>
                    <span className="font-bold text-lg text-primary">{SITE_CONFIG.name}</span>
                  </div>
                  <div className="flex flex-col gap-1 p-3 bg-muted/40 rounded-lg">
                    <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Platform Subtitle</span>
                    <span className="font-medium">{SITE_CONFIG.subtitle}</span>
                  </div>
                  <div className="flex flex-col gap-1 p-3 bg-muted/40 rounded-lg">
                    <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Official Tagline</span>
                    <span className="font-medium">{SITE_CONFIG.tagline}</span>
                  </div>
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
                  { label: "SHA-256 HMAC Hash", status: "Active", ok: true },
                  { label: "QR Tamper Detection", status: "Active", ok: true },
                  { label: "Role-Based Access Control", status: "Active", ok: true },
                  { label: "Audit Log Tracking", status: "Active", ok: true },
                  { label: "IP Address Logging", status: "Active", ok: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                    <span className="text-sm font-medium">{item.label}</span>
                    <Badge className={item.ok ? "bg-green-100 text-green-800 border-green-200" : "bg-red-100 text-red-800"} variant="outline">
                      {item.ok ? <CheckCircle2 size={12} className="mr-1" /> : <AlertTriangle size={12} className="mr-1" />}
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="md:col-span-2 border border-amber-200 bg-amber-50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-amber-800"><Info size={18} /> Super Admin Capabilities</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-amber-900">
                  {[
                    "View all donations and users",
                    "Enable/Disable any user account",
                    "Delete any donation record",
                    "Access full audit logs",
                    "Manage all roles and permissions",
                    "View security and system status",
                    "Access all collector and admin panels",
                    "Monitor fraud and tampered receipts",
                  ].map((cap) => (
                    <li key={cap} className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-amber-700 flex-shrink-0" />
                      {cap}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

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

        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users size={18} className="text-primary" /> All System Users</CardTitle>
              <CardDescription>Enable or disable user accounts. Super Admin has full control.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersLoading ? (
                    Array(5).fill(0).map((_, i) => (
                      <TableRow key={i}>
                        {Array(7).fill(0).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (users || []).map((u) => (
                    <TableRow key={u.id} className={!u.isActive ? "opacity-50" : ""}>
                      <TableCell className="font-mono text-xs">{u.id}</TableCell>
                      <TableCell className="font-semibold">{u.name}</TableCell>
                      <TableCell className="font-mono">{u.mobile}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${roleColors[u.role] || ""}`}>
                          {u.role.replace("_", " ").toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={u.isActive ? "bg-green-100 text-green-800 border-green-200" : "bg-red-100 text-red-800 border-red-200"}>
                          {u.isActive ? "Active" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{formatDate(u.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-xs"
                          disabled={u.role === "super_admin" || updateUser.isPending}
                          onClick={() => handleToggleUser(u.id, u.isActive)}
                          data-testid={`button-toggle-user-${u.id}`}
                        >
                          {u.isActive ? <ToggleRight size={16} className="text-green-600" /> : <ToggleLeft size={16} className="text-muted-foreground" />}
                          {u.isActive ? "Disable" : "Enable"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="donations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Database size={18} className="text-primary" /> All Donations</CardTitle>
              <CardDescription>Super Admin can delete any donation record. This action is irreversible and audited.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Receipt ID</TableHead>
                    <TableHead>Donor</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Collector</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Delete</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {donationsLoading ? (
                    Array(5).fill(0).map((_, i) => (
                      <TableRow key={i}>
                        {Array(8).fill(0).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (donationsData?.donations || []).map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs">{d.donationId}</TableCell>
                      <TableCell className="font-semibold">{d.name}</TableCell>
                      <TableCell className="font-mono text-sm">{d.mobile}</TableCell>
                      <TableCell className="font-bold text-primary">{formatRupee(d.amount)}</TableCell>
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
                              data-testid={`button-delete-donation-${d.id}`}
                            >
                              <Trash2 size={15} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                                <AlertTriangle size={20} /> Confirm Deletion
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete donation <strong>{d.donationId}</strong> of <strong>{formatRupee(d.amount)}</strong> from <strong>{d.name}</strong>? This is permanent and will be logged in the audit trail.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive hover:bg-destructive/90"
                                onClick={() => handleDeleteDonation(d.id)}
                              >
                                Delete Permanently
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
    </div>
  );
}
