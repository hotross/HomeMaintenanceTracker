import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Device, MaintenanceTask, insertDeviceSchema, insertTaskSchema } from "@shared/schema";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Plus, Trash2, FileText, Link as LinkIcon, Image, Edit2, Clock, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { format, formatDistanceToNow, addDays } from "date-fns";

type DeviceForm = {
  name: string;
  model?: string;
  location?: string;
  imageUrl?: string;
  manualUrl?: string;
  consumablesUrl?: string;
  purchaseDate: string | null;
  warrantyExpirationDate: string | null;
  receiptUrl?: string;
};

type TaskForm = {
  name: string;
  description?: string;
  intervalDays: number;
};

export default function DevicesPage() {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isDeviceDialogOpen, setIsDeviceDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [editingTask, setEditingTask] = useState<MaintenanceTask | null>(null);
  const { toast } = useToast();
  const [dragOver, setDragOver] = useState<"image" | "manual" | "receipt" | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const { data: devices = [], isLoading: isLoadingDevices } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
  });

  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery<MaintenanceTask[]>({
    queryKey: ["/api/devices", selectedDevice?.id, "tasks"],
    queryFn: async () => {
      if (!selectedDevice) return [];
      const res = await apiRequest("GET", `/api/devices/${selectedDevice.id}/tasks`);
      return res.json();
    },
    enabled: !!selectedDevice,
  });

  const deviceForm = useForm<DeviceForm>({
    resolver: zodResolver(insertDeviceSchema),
    defaultValues: {
      name: "",
      model: "",
      location: "",
      imageUrl: "",
      manualUrl: "",
      consumablesUrl: "",
      purchaseDate: null,
      warrantyExpirationDate: null,
      receiptUrl: "",
    },
  });

  const taskForm = useForm<TaskForm>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      name: "",
      description: "",
      intervalDays: 30,
    },
  });

  useEffect(() => {
    if (isDeviceDialogOpen) {
      if (editingDevice) {
        deviceForm.reset({
          name: editingDevice.name,
          model: editingDevice.model || "",
          location: editingDevice.location || "",
          imageUrl: editingDevice.imageUrl || "",
          manualUrl: editingDevice.manualUrl || "",
          consumablesUrl: editingDevice.consumablesUrl || "",
          purchaseDate: editingDevice.purchaseDate ? format(new Date(editingDevice.purchaseDate), 'yyyy-MM-dd') : null,
          warrantyExpirationDate: editingDevice.warrantyExpirationDate ? format(new Date(editingDevice.warrantyExpirationDate), 'yyyy-MM-dd') : null,
          receiptUrl: editingDevice.receiptUrl || "",
        });
      } else {
        deviceForm.reset({
          name: "",
          model: "",
          location: "",
          imageUrl: "",
          manualUrl: "",
          consumablesUrl: "",
          purchaseDate: null,
          warrantyExpirationDate: null,
          receiptUrl: "",
        });
      }
    }
  }, [isDeviceDialogOpen, editingDevice, deviceForm]);

  useEffect(() => {
    if (isTaskDialogOpen) {
      if (editingTask) {
        taskForm.reset({
          name: editingTask.name,
          description: editingTask.description || "",
          intervalDays: editingTask.intervalDays,
        });
      } else {
        taskForm.reset({
          name: "",
          description: "",
          intervalDays: 30,
        });
      }
    }
  }, [isTaskDialogOpen, editingTask, taskForm]);

  const createDeviceMutation = useMutation({
    mutationFn: async (data: DeviceForm) => {
      const res = await apiRequest("POST", "/api/devices", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      toast({ title: "Device added successfully" });
      setIsDeviceDialogOpen(false);
      deviceForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add device",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateDeviceMutation = useMutation({
    mutationFn: async (data: { id: number; device: DeviceForm }) => {
      const res = await apiRequest("PUT", `/api/devices/${data.id}`, data.device);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      toast({ title: "Device updated successfully" });
      setIsDeviceDialogOpen(false);
      setEditingDevice(null);
      deviceForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update device",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/devices/${id}`);
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      if (selectedDevice?.id === deletedId) {
        setSelectedDevice(null);
      }
      toast({ title: "Device deleted successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete device",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskForm) => {
      if (!selectedDevice) throw new Error("No device selected");
      const res = await apiRequest("POST", `/api/devices/${selectedDevice.id}/tasks`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices", selectedDevice?.id, "tasks"] });
      toast({ title: "Task added successfully" });
      setIsTaskDialogOpen(false);
      taskForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices", selectedDevice?.id, "tasks"] });
      toast({ title: "Task deleted successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete task",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/tasks/${id}/complete`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices", selectedDevice?.id, "tasks"] });
      toast({ title: "Task marked as completed" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to complete task",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (data: { id: number; task: TaskForm }) => {
      const res = await apiRequest("PUT", `/api/tasks/${data.id}`, data.task);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices", selectedDevice?.id, "tasks"] });
      toast({ title: "Task updated successfully" });
      setIsTaskDialogOpen(false);
      setEditingTask(null);
      taskForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update task",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      return res.json();
    },
  });

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, type: "image" | "manual" | "receipt") => {
    e.preventDefault();
    setDragOver(null);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    try {
      const result = await uploadFileMutation.mutateAsync(file);
      if (type === "image") {
        deviceForm.setValue("imageUrl", result.url);
      } else if (type === "manual") {
        deviceForm.setValue("manualUrl", result.url);
      } else {
        deviceForm.setValue("receiptUrl", result.url);
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "manual" | "receipt") => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await uploadFileMutation.mutateAsync(file);
      if (type === "image") {
        deviceForm.setValue("imageUrl", result.url);
      } else if (type === "manual") {
        deviceForm.setValue("manualUrl", result.url);
      } else {
        deviceForm.setValue("receiptUrl", result.url);
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeviceSubmit = (data: DeviceForm) => {
    if (editingDevice) {
      updateDeviceMutation.mutate({ id: editingDevice.id, device: data });
    } else {
      createDeviceMutation.mutate(data);
    }
  };

  const handleTaskSubmit = (data: TaskForm) => {
    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, task: data });
    } else {
      createTaskMutation.mutate(data);
    }
  };

  if (isLoadingDevices) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Device Management</h1>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/consumables">View Consumables</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Devices</h2>
              <Dialog open={isDeviceDialogOpen} onOpenChange={setIsDeviceDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingDevice(null)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Device
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0">
                  <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle>
                      {editingDevice ? "Edit Device" : "Add New Device"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col h-full max-h-[calc(85vh-8rem)]">
                    <ScrollArea className="flex-1 p-6">
                      <form
                        id="device-form"
                        onSubmit={deviceForm.handleSubmit(handleDeviceSubmit)}
                        className="space-y-4"
                      >
                        <div className="space-y-2">
                          <Label htmlFor="name">Name</Label>
                          <Input id="name" {...deviceForm.register("name")} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="model">Model</Label>
                          <Input id="model" {...deviceForm.register("model")} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="location">Location</Label>
                          <Input id="location" {...deviceForm.register("location")} />
                        </div>

                        {/* Image Upload */}
                        <div className="space-y-2">
                          <Label>Device Image</Label>
                          <input
                            type="file"
                            ref={imageInputRef}
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileInputChange(e, "image")}
                          />
                          <div
                            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                              dragOver === "image" ? "border-primary bg-primary/10" : "border-border"
                            }`}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setDragOver("image");
                            }}
                            onDragLeave={() => setDragOver(null)}
                            onDrop={(e) => handleDrop(e, "image")}
                            onClick={() => imageInputRef.current?.click()}
                          >
                            {deviceForm.watch("imageUrl") ? (
                              <div className="relative aspect-video">
                                <img
                                  src={deviceForm.watch("imageUrl")}
                                  alt="Device"
                                  className="object-contain w-full h-full"
                                />
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <Upload className="h-8 w-8 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">
                                  Drag and drop an image here, or click to select
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Manual Upload */}
                        <div className="space-y-2">
                          <Label>Manual</Label>
                          <input
                            type="file"
                            ref={manualInputRef}
                            accept=".pdf,.doc,.docx"
                            className="hidden"
                            onChange={(e) => handleFileInputChange(e, "manual")}
                          />
                          <div
                            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                              dragOver === "manual" ? "border-primary bg-primary/10" : "border-border"
                            }`}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setDragOver("manual");
                            }}
                            onDragLeave={() => setDragOver(null)}
                            onDrop={(e) => handleDrop(e, "manual")}
                            onClick={() => manualInputRef.current?.click()}
                          >
                            {deviceForm.watch("manualUrl") ? (
                              <div className="flex items-center justify-center gap-2 text-sm">
                                <FileText className="h-4 w-4" />
                                <span>Manual uploaded</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <Upload className="h-8 w-8 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">
                                  Drag and drop a manual here, or click to select
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="consumablesUrl">Consumables URL</Label>
                          <Input id="consumablesUrl" {...deviceForm.register("consumablesUrl")} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="purchaseDate">Purchase Date</Label>
                          <Input
                            id="purchaseDate"
                            type="date"
                            {...deviceForm.register("purchaseDate")}
                            value={deviceForm.watch("purchaseDate") || ""}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="warrantyExpirationDate">Warranty Expiration Date</Label>
                          <Input
                            id="warrantyExpirationDate"
                            type="date"
                            {...deviceForm.register("warrantyExpirationDate")}
                            value={deviceForm.watch("warrantyExpirationDate") || ""}
                          />
                        </div>

                        {/* Receipt Upload */}
                        <div className="space-y-2">
                          <Label>Receipt</Label>
                          <input
                            type="file"
                            ref={receiptInputRef}
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="hidden"
                            onChange={(e) => handleFileInputChange(e, "receipt")}
                          />
                          <div
                            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                              dragOver === "receipt" ? "border-primary bg-primary/10" : "border-border"
                            }`}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setDragOver("receipt");
                            }}
                            onDragLeave={() => setDragOver(null)}
                            onDrop={(e) => handleDrop(e, "receipt")}
                            onClick={() => receiptInputRef.current?.click()}
                          >
                            {deviceForm.watch("receiptUrl") ? (
                              <div className="flex items-center justify-center gap-2 text-sm">
                                <FileText className="h-4 w-4" />
                                <span>Receipt uploaded</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <Upload className="h-8 w-8 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">
                                  Drag and drop a receipt here, or click to select
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="border-t p-4 mt-auto">
                          <Button
                            type="submit"
                            form="device-form"
                            className="w-full"
                            disabled={createDeviceMutation.isPending || updateDeviceMutation.isPending}
                          >
                            {(createDeviceMutation.isPending || updateDeviceMutation.isPending) && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {editingDevice ? "Update Device" : "Add Device"}
                          </Button>
                        </div>
                      </form>
                    </ScrollArea>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <ScrollArea className="h-[calc(100vh-12rem)]">
              <div className="grid gap-4 pr-4">
                {devices.map((device) => (
                  <Card
                    key={device.id}
                    className={`cursor-pointer transition-colors ${
                      selectedDevice?.id === device.id
                        ? "border-primary"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedDevice(device)}
                  >
                    
                    <CardContent className="p-4">
                      <div className="flex flex-col space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                          <div className="flex gap-4 w-full sm:w-auto">
                            {device.imageUrl && (
                              <div className="shrink-0">
                                <img
                                  src={device.imageUrl}
                                  alt={device.name}
                                  className="h-14 w-14 rounded-md object-cover"
                                />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <h3 className="text-base font-medium leading-6 truncate">{device.name}</h3>
                              {(device.model || device.location) && (
                                <p className="text-sm leading-5 text-muted-foreground truncate mt-0.5">
                                  {[device.model, device.location].filter(Boolean).join(" • ")}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 sm:self-start self-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingDevice(device);
                                setIsDeviceDialogOpen(true);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm("Are you sure you want to delete this device?")) {
                                  deleteDeviceMutation.mutate(device.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm leading-5">
                          {device.imageUrl && (
                            <a
                              href={device.imageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-500 hover:text-blue-700 flex items-center"
                            >
                              <Image className="h-4 w-4 mr-1.5" />
                              View Image
                            </a>
                          )}
                          {device.manualUrl && (
                            <a
                              href={device.manualUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-500 hover:text-blue-700 flex items-center"
                            >
                              <FileText className="h-4 w-4 mr-1.5" />
                              Manual
                            </a>
                          )}
                          {device.receiptUrl && (
                            <a
                              href={device.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-500 hover:text-blue-700 flex items-center"
                            >
                              <FileText className="h-4 w-4 mr-1.5" />
                              Receipt
                            </a>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm leading-5 text-muted-foreground">
                          {device.purchaseDate && (
                            <p className="flex items-center">
                              Purchased: {format(new Date(device.purchaseDate), 'PP')}
                            </p>
                          )}
                          {device.warrantyExpirationDate && (
                            <p className="flex items-center">
                              Warranty expires: {format(new Date(device.warrantyExpirationDate), 'PP')}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {!devices.length && (
                  <p className="text-muted-foreground text-center py-8">
                    No devices added yet. Add your first device to get started.
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {selectedDevice ? `Tasks for ${selectedDevice.name}` : "Select a Device"}
              </h2>
              {selectedDevice && (
                <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setEditingTask(null)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                      <DialogTitle>
                        {editingTask ? "Edit Maintenance Task" : "Add Maintenance Task"}
                      </DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="flex-1">
                      <div className="p-6">
                        <form
                          onSubmit={taskForm.handleSubmit(handleTaskSubmit)}
                          className="space-y-4"
                        >
                          <div className="space-y-2">
                            <Label htmlFor="taskName">Task Name</Label>
                            <Input id="taskName" {...taskForm.register("name")} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Input id="description" {...taskForm.register("description")} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="intervalDays">Interval (Days)</Label>
                            <Input
                              id="intervalDays"
                              type="number"
                              min="1"
                              {...taskForm.register("intervalDays", { valueAsNumber: true })}
                            />
                          </div>
                          <Button
                            type="submit"
                            className="w-full"
                            disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                          >
                            {(createTaskMutation.isPending || updateTaskMutation.isPending) && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {editingTask ? "Update Task" : "Add Task"}
                          </Button>
                        </form>
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <ScrollArea className="h-[calc(100vh-12rem)]">
              <div className="grid gap-4 pr-4">
                {selectedDevice ? (
                  isLoadingTasks ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-border" />
                    </div>
                  ) : (
                    <>
                      {tasks.map((task) => {
                        const nextDueDate = task.lastCompleted
                          ? addDays(new Date(task.lastCompleted), task.intervalDays)
                          : new Date();
                        const isOverdue = new Date() > nextDueDate;

                        return (
                          <Card key={task.id}>
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="font-medium">{task.name}</h3>
                                  {task.description && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {task.description}
                                    </p>
                                  )}
                                  <div className="flex flex-col gap-1 mt-2 text-sm">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Clock className="h-4 w-4" />
                                      <span>Every {task.intervalDays} days</span>
                                    </div>
                                    {task.lastCompleted ? (
                                      <>
                                        <p className="text-muted-foreground">
                                          Last completed: {format(new Date(task.lastCompleted), 'PPP')}
                                          {' '}
                                          ({formatDistanceToNow(new Date(task.lastCompleted))} ago)
                                          {task.completedByUsername && (
                                            <span className="ml-1 text-primary">
                                              by {task.completedByUsername}
                                            </span>
                                          )}
                                        </p>
                                        <p className={isOverdue ? "text-red-500" : "text-muted-foreground"}>
                                          Next due: {format(nextDueDate, 'PPP')}
                                          {isOverdue && " (OVERDUE)"}
                                        </p>
                                      </>
                                    ) : (
                                      <p className="text-red-500">Never completed</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => completeTaskMutation.mutate(task.id)}
                                    disabled={completeTaskMutation.isPending}
                                  >
                                    {completeTaskMutation.isPending && (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    Complete
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setEditingTask(task);
                                      setIsTaskDialogOpen(true);
                                    }}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      if (window.confirm("Are you sure you want to delete this task?")) {
                                        deleteTaskMutation.mutate(task.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                      {!tasks.length && (
                        <p className="text-muted-foreground text-center py-8">
                          No maintenance tasks added yet. Add your first task to get started.
                        </p>
                      )}
                    </>
                  )
                ) : (
                  <Card>
                    <CardContent className="p-6">
                      <p className="text-muted-foreground text-center">
                        Select a device to view and manage its maintenance tasks.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </main>
    </div>
  );
}