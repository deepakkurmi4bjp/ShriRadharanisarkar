import { useState } from "react";
import { useListAuditLogs, getListAuditLogsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ChevronLeft, ChevronRight, Activity, Server } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";

export default function AdminAudit() {
  const [page, setPage] = useState(1);
  const limit = 15;

  const { data: logsData, isLoading } = useListAuditLogs(
    { page, limit },
    { query: { queryKey: getListAuditLogsQueryKey({ page, limit }) } }
  );

  const getActionColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('LOGIN')) return 'bg-green-100 text-green-800 border-green-200';
    if (action.includes('DELETE') || action.includes('FAIL')) return 'bg-red-100 text-red-800 border-red-200';
    if (action.includes('UPDATE')) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 text-destructive">
          <ShieldAlert className="text-destructive" /> System Audit Trail
        </h1>
        <p className="text-muted-foreground mt-1">Immutable, chronological record of all system activities.</p>
      </div>

      <Card className="shadow-md border-t-2 border-t-destructive">
        <div className="bg-destructive/5 p-3 flex gap-4 text-sm border-b">
          <div className="flex items-center gap-2 font-medium text-destructive">
            <Activity size={16} /> LIVE MONITORING ACTIVE
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Server size={16} /> Data retained securely.
          </div>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[180px] font-bold">Timestamp</TableHead>
                <TableHead className="font-bold">Actor</TableHead>
                <TableHead className="font-bold">Event Type</TableHead>
                <TableHead className="font-bold hidden md:table-cell">Details / Payload</TableHead>
                <TableHead className="font-bold text-right">IP Trace</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(limit).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-28 rounded-full" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : logsData?.logs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">No audit logs available.</TableCell>
                </TableRow>
              ) : (
                logsData?.logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/30 text-sm font-mono">
                    <TableCell className="text-muted-foreground">{formatDate(log.createdAt)}</TableCell>
                    <TableCell className="font-semibold">{log.userName || 'SYSTEM'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-bold text-[10px] ${getActionColor(log.action)}`}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground truncate max-w-[300px]" title={log.details || ""}>
                      {log.details || "-"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{log.ipAddress || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          <div className="p-4 border-t flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing page {logsData?.page || 1}
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
              >
                <ChevronLeft size={16} className="mr-1" /> Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => p + 1)}
                disabled={!logsData?.logs || logsData.logs.length < limit || isLoading}
              >
                Next <ChevronRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
