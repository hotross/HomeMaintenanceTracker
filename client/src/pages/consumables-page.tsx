import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Device, Consumable, insertConsumableSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { ChevronLeft, Edit2, Trash2, Plus, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ConsumableForm = {
  name: string;
  description?: string;
  storage_location?: string;
  url?: string;
  cost?: number;
};

export default function ConsumablesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConsumable, setEditingConsumable] = useState<(Consumable & { deviceName: string }) | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: consumables = [], isLoading } = useQuery({
    queryKey: ["/api/consumables"],
  });

  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
  });

  const form = useForm<ConsumableForm>({
    resolver: zodResolver(insertConsumableSchema),
    defaultValues: {
      name: "",
      description: "",
      storage_location: "",
      url: "",
      cost: undefined,
    },
  });

  const createConsumableMutation = useMutation({
    mutationFn: async (data: ConsumableForm) => {
      if (!selectedDeviceId) throw new Error("No device selected");
      const res = await apiRequest("POST", `/api/devices/${selectedDeviceId}/consumables`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/consumables"] });
      toast({ title: "Consumable added successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add consumable",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateConsumableMutation = useMutation({
    mutationFn: async (data: { id: number; consumable: ConsumableForm }) => {
      const res = await apiRequest("PUT", `/api/consumables/${data.id}`, data.consumable);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/consumables"] });
      toast({ title: "Consumable updated successfully" });
      setIsDialogOpen(false);
      setEditingConsumable(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update consumable",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteConsumableMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/consumables/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/consumables"] });
      toast({ title: "Consumable deleted successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete consumable",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: ConsumableForm) => {
    if (editingConsumable) {
      updateConsumableMutation.mutate({ id: editingConsumable.id, consumable: data });
    } else {
      createConsumableMutation.mutate(data);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <h1 className="text-xl font-bold">Device Consumables</h1>
          <Button asChild variant="outline" size="sm">
            <Link to="/devices">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Devices
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
            <CardTitle className="text-lg">All Consumables</CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingConsumable(null);
                    form.reset();
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Consumable
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingConsumable ? "Edit Consumable" : "Add New Consumable"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-2">
                  {!editingConsumable && (
                    <div className="space-y-2">
                      <Label htmlFor="device">Device</Label>
                      <Select
                        onValueChange={(value) => setSelectedDeviceId(Number(value))}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a device" />
                        </SelectTrigger>
                        <SelectContent>
                          {devices.map((device) => (
                            <SelectItem key={device.id} value={device.id.toString()}>
                              {device.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" {...form.register("name")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input id="description" {...form.register("description")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storage_location">Storage Location</Label>
                    <Input id="storage_location" {...form.register("storage_location")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="url">URL</Label>
                    <Input id="url" {...form.register("url")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost">Cost</Label>
                    <Input
                      id="cost"
                      type="number"
                      step="0.01"
                      {...form.register("cost", { valueAsNumber: true })}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createConsumableMutation.isPending || updateConsumableMutation.isPending}
                  >
                    {(createConsumableMutation.isPending || updateConsumableMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingConsumable ? "Update Consumable" : "Add Consumable"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-12rem)]">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden md:table-cell">Description</TableHead>
                      <TableHead className="hidden md:table-cell">Storage Location</TableHead>
                      <TableHead className="hidden md:table-cell">Cost</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24">
                          <div className="flex justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : consumables.length > 0 ? (
                      consumables.map((consumable) => (
                        <TableRow key={consumable.id}>
                          <TableCell className="font-medium">{consumable.deviceName}</TableCell>
                          <TableCell>
                            <div>
                              <span>{consumable.name}</span>
                              <div className="md:hidden space-y-1 mt-1 text-sm text-muted-foreground">
                                {consumable.description && <div>{consumable.description}</div>}
                                {consumable.storage_location && <div>Location: {consumable.storage_location}</div>}
                                {consumable.cost && <div>Cost: ${Number(consumable.cost).toFixed(2)}</div>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{consumable.description}</TableCell>
                          <TableCell className="hidden md:table-cell">{consumable.storage_location}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {consumable.cost ? `$${Number(consumable.cost).toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {consumable.url && (
                                <a
                                  href={consumable.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:text-blue-700"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setEditingConsumable(consumable);
                                  form.reset({
                                    name: consumable.name,
                                    description: consumable.description || "",
                                    storage_location: consumable.storage_location || "",
                                    url: consumable.url || "",
                                    cost: consumable.cost ? Number(consumable.cost) : undefined,
                                  });
                                  setIsDialogOpen(true);
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  if (window.confirm("Are you sure you want to delete this consumable?")) {
                                    deleteConsumableMutation.mutate(consumable.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-24">
                          <p className="text-sm text-muted-foreground">
                            No consumables found. Add consumables to your devices to see them here.
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}