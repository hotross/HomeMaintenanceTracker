import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Device, MaintenanceTask } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Calendar } from "lucide-react";
import { differenceInDays, addDays, isBefore, isAfter, format, formatDistanceToNow } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function HomePage() {
  const { toast } = useToast();
  const { user, logoutMutation } = useAuth();

  const { data: devices = [], isLoading: isLoadingDevices } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
  });

  const { data: allTasks = [], isLoading: isLoadingTasks } = useQuery<MaintenanceTask[]>({
    queryKey: ["/api/tasks"],
  });

  const dueTasks = allTasks.filter((task) => {
    if (!task.lastCompleted) return true;
    const nextDueDate = addDays(new Date(task.lastCompleted), task.intervalDays);
    return isBefore(nextDueDate, new Date());
  });

  const upcomingTasks = allTasks.filter((task) => {
    if (!task.lastCompleted) return false;
    const nextDueDate = addDays(new Date(task.lastCompleted), task.intervalDays);
    const oneWeekFromNow = addDays(new Date(), 7);
    return isAfter(nextDueDate, new Date()) && isBefore(nextDueDate, oneWeekFromNow);
  });

  const completeMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await apiRequest("POST", `/api/tasks/${taskId}/complete`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task completed successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to complete task",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  if (isLoadingDevices || isLoadingTasks) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  const renderTaskList = (tasks: MaintenanceTask[]) => {
    if (!devices?.length) {
      return (
        <p className="text-sm text-muted-foreground">
          No devices added yet. Add some devices to start tracking
          maintenance.
        </p>
      );
    }

    if (!tasks?.length) {
      return <p className="text-sm text-muted-foreground">No maintenance tasks in this category.</p>;
    }

    return (
      <ul className="space-y-4">
        {tasks.map((task) => {
          const device = devices.find((d) => d.id === task.deviceId);
          const nextDueDate = task.lastCompleted 
            ? addDays(new Date(task.lastCompleted), task.intervalDays)
            : new Date();

          return (
            <li key={task.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div className="space-y-1 min-w-0">
                <p className="font-medium text-sm leading-5">{task.name}</p>
                {task.description && (
                  <p className="text-sm text-muted-foreground leading-5 line-clamp-2">
                    {task.description}
                  </p>
                )}
                <p className="text-sm text-muted-foreground leading-5">
                  Device: {device?.name} {device?.location && `(${device.location})`}
                </p>
                <div className="text-sm leading-5">
                  {task.lastCompleted ? (
                    <>
                      <p className="text-muted-foreground">
                        Last completed: {format(new Date(task.lastCompleted), 'PP')}
                        {' '}
                        ({formatDistanceToNow(new Date(task.lastCompleted))} ago)
                        {task.completedByUsername && (
                          <span className="ml-1 text-primary">
                            by {task.completedByUsername}
                          </span>
                        )}
                      </p>
                      <p className={isBefore(nextDueDate, new Date()) ? "text-red-500" : "text-muted-foreground"}>
                        Next due: {format(nextDueDate, 'PP')}
                        {isBefore(nextDueDate, new Date()) && " (OVERDUE)"}
                      </p>
                    </>
                  ) : (
                    <p className="text-red-500">Never completed</p>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                className="self-start sm:self-center"
                onClick={() => completeMutation.mutate(task.id)}
                disabled={completeMutation.isPending}
              >
                {completeMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Complete
              </Button>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <h1 className="text-xl font-bold">Home Maintenance</h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">Welcome, {user?.username}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-lg font-semibold">Dashboard</h2>
            <Button asChild size="sm">
              <Link to="/devices">Manage Devices</Link>
            </Button>
          </div>

          <div className="grid gap-4">
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="flex items-center text-base">
                  <Calendar className="mr-2 h-4 w-4" />
                  Maintenance Due Now
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {!devices?.length ? (
                  <p className="text-sm text-muted-foreground">
                    No devices added yet. Add some devices to start tracking maintenance.
                  </p>
                ) : !dueTasks?.length ? (
                  <p className="text-sm text-muted-foreground">No maintenance tasks due now.</p>
                ) : (
                  <ul className="space-y-4">
                    {dueTasks.map((task) => {
                      const device = devices.find((d) => d.id === task.deviceId);
                      const nextDueDate = task.lastCompleted 
                        ? addDays(new Date(task.lastCompleted), task.intervalDays)
                        : new Date();

                      return (
                        <li key={task.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                          <div className="space-y-1 min-w-0">
                            <p className="font-medium text-sm leading-5">{task.name}</p>
                            {task.description && (
                              <p className="text-sm text-muted-foreground leading-5 line-clamp-2">
                                {task.description}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground leading-5">
                              Device: {device?.name} {device?.location && `(${device.location})`}
                            </p>
                            <div className="text-sm leading-5">
                              {task.lastCompleted ? (
                                <>
                                  <p className="text-muted-foreground">
                                    Last completed: {format(new Date(task.lastCompleted), 'PP')}
                                    {' '}
                                    ({formatDistanceToNow(new Date(task.lastCompleted))} ago)
                                    {task.completedByUsername && (
                                      <span className="ml-1 text-primary">
                                        by {task.completedByUsername}
                                      </span>
                                    )}
                                  </p>
                                  <p className={isBefore(nextDueDate, new Date()) ? "text-red-500" : "text-muted-foreground"}>
                                    Next due: {format(nextDueDate, 'PP')}
                                    {isBefore(nextDueDate, new Date()) && " (OVERDUE)"}
                                  </p>
                                </>
                              ) : (
                                <p className="text-red-500">Never completed</p>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="self-start sm:self-center"
                            onClick={() => completeMutation.mutate(task.id)}
                            disabled={completeMutation.isPending}
                          >
                            {completeMutation.isPending && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Complete
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-4">
                <CardTitle className="flex items-center text-base">
                  <Calendar className="mr-2 h-4 w-4" />
                  Upcoming Maintenance (Next 7 Days)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {!devices?.length ? (
                  <p className="text-sm text-muted-foreground">
                    No devices added yet. Add some devices to start tracking maintenance.
                  </p>
                ) : !upcomingTasks?.length ? (
                  <p className="text-sm text-muted-foreground">No upcoming maintenance tasks.</p>
                ) : (
                  <ul className="space-y-4">
                    {upcomingTasks.map((task) => {
                      const device = devices.find((d) => d.id === task.deviceId);
                      const nextDueDate = task.lastCompleted 
                        ? addDays(new Date(task.lastCompleted), task.intervalDays)
                        : new Date();

                      return (
                        <li key={task.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                          <div className="space-y-1 min-w-0">
                            <p className="font-medium text-sm leading-5">{task.name}</p>
                            {task.description && (
                              <p className="text-sm text-muted-foreground leading-5 line-clamp-2">
                                {task.description}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground leading-5">
                              Device: {device?.name} {device?.location && `(${device.location})`}
                            </p>
                            <div className="text-sm leading-5">
                              {task.lastCompleted && (
                                <>
                                  <p className="text-muted-foreground">
                                    Last completed: {format(new Date(task.lastCompleted), 'PP')}
                                    {' '}
                                    ({formatDistanceToNow(new Date(task.lastCompleted))} ago)
                                    {task.completedByUsername && (
                                      <span className="ml-1 text-primary">
                                        by {task.completedByUsername}
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-muted-foreground">
                                    Due: {format(nextDueDate, 'PP')}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="self-start sm:self-center"
                            onClick={() => completeMutation.mutate(task.id)}
                            disabled={completeMutation.isPending}
                          >
                            {completeMutation.isPending && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Complete
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}