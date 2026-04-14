import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Users, Plus, Search, ChevronRight, Calendar, Mail, Phone, Trash2, MessageSquare } from "lucide-react";
import { useLocation } from "wouter";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const addClientSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  program: z.string().optional(),
  phone: z.string().optional(),
  nextCallDate: z.string().optional(),
});

type AddClientForm = z.infer<typeof addClientSchema>;

export default function AdminClients() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();

  const form = useForm<AddClientForm>({
    resolver: zodResolver(addClientSchema),
    defaultValues: { name: "", email: "", password: "client123", program: "", phone: "" },
  });

  const { data: clients, isLoading } = useQuery<any[]>({
    queryKey: ["/api/clients"],
  });

  const deleteClient = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/clients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Client removed", description: "The client account has been deleted." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const addClient = useMutation({
    mutationFn: (data: AddClientForm) => {
      const payload: any = { ...data };
      if (payload.nextCallDate) payload.nextCallDate = new Date(payload.nextCallDate).toISOString();
      return apiRequest("POST", "/api/clients", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Client added!", description: "The client account has been created." });
      form.reset();
      setOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const eliteClients = (clients || []).filter((c: any) => c.tier === "elite");

  const filtered = eliteClients.filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Elite Members</h1>
            <p className="text-muted-foreground mt-1">{eliteClients.length} Elite tier {eliteClients.length === 1 ? "member" : "members"}</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-client" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((d) => addClient.mutate(d))} className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input data-testid="input-client-name" placeholder="Jane Smith" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input data-testid="input-client-email" placeholder="jane@example.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Password</FormLabel>
                      <FormControl>
                        <Input data-testid="input-client-password" placeholder="Set a password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="program" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Program (optional)</FormLabel>
                      <FormControl>
                        <Input data-testid="input-client-program" placeholder="6-Month Monetization Accelerator" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (optional)</FormLabel>
                      <FormControl>
                        <Input data-testid="input-client-phone" placeholder="+1 (555) 000-0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="nextCallDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next Call Date (optional)</FormLabel>
                      <FormControl>
                        <Input data-testid="input-client-call-date" type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <DialogFooter>
                    <Button type="submit" data-testid="button-save-client" disabled={addClient.isPending} className="w-full">
                      {addClient.isPending ? "Adding..." : "Add Client"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-search-clients"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-muted-foreground opacity-50" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">No Elite members found</h3>
            <p className="text-sm text-muted-foreground">
              {search ? "Try a different search" : "No members are on the Elite tier yet"}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((client: any) => {
              const initials = client.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
              return (
                <Link key={client.id} href={`/admin/clients/${client.id}`} className="block">
                    <Card
                      data-testid={`client-card-${client.id}`}
                      className="border border-card-border hover:border-primary/30 transition-all duration-200 cursor-pointer"
                    >
                      <CardContent className="p-5">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-11 h-11 flex-shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-semibold text-foreground">{client.name}</h3>
                              {client.program && (
                                <Badge variant="secondary" className="text-[10px]">{client.program.split(" ").slice(0, 3).join(" ")}</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Mail className="w-3 h-3" />
                                <span>{client.email}</span>
                              </div>
                              {client.phone && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Phone className="w-3 h-3" />
                                  <span>{client.phone}</span>
                                </div>
                              )}
                              {client.nextCallDate && (
                                <div className="flex items-center gap-1.5 text-xs text-primary">
                                  <Calendar className="w-3 h-3" />
                                  <span>{format(new Date(client.nextCallDate), "MMM d 'at' h:mm a")}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              data-testid={`button-chat-client-${client.id}`}
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8 text-zinc-500 hover:text-[#d4b461] hover:bg-[#d4b461]/10"
                              onClick={(e) => { e.preventDefault(); navigate(`/admin/chat?client=${client.id}`); }}
                              title="Open chat"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </Button>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  data-testid={`button-delete-client-${client.id}`}
                                  variant="ghost"
                                  size="icon"
                                  className="w-8 h-8 text-zinc-600 hover:text-red-400 hover:bg-red-400/10"
                                  onClick={(e) => e.preventDefault()}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove {client.name}?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete their account and all associated data. This cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    data-testid={`button-confirm-delete-${client.id}`}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                    onClick={(e) => { e.preventDefault(); deleteClient.mutate(client.id); }}
                                  >
                                    Yes, remove client
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
