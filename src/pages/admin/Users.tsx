import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  CheckCircle,
  Mail,
  MoreHorizontal,
  Phone,
  Search,
  Shield,
  UserCog,
  Users,
  XCircle,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/context/AuthContext";
import {
  useAssignedLeadCountsQuery,
  useCreateUserMutation,
  useReassignLeadsForUserMutation,
  useUpdateUserActiveStatusMutation,
  useUpdateUserRoleMutation,
} from "@/hooks/use-admin-users";
import { useUsersQuery } from "@/hooks/use-users";
import type { CreateUserFormValues, UserRole, UserSummary } from "@/types/crm";

const roleLabels: Record<UserRole, string> = {
  admin: "Administrator",
  sales: "Sales Representative",
  store_manager: "Store Manager",
  furniture_specialist: "Furniture Specialist",
};

const roleColors: Record<UserRole, string> = {
  admin: "bg-destructive/10 text-destructive",
  sales: "bg-info/10 text-info",
  store_manager: "bg-warning/10 text-warning",
  furniture_specialist: "bg-success/10 text-success",
};

const createUserSchema = z
  .object({
    fullName: z.string().trim().min(2, "Full name is required."),
    email: z.string().trim(),
    phone: z.string().trim(),
    password: z.string().min(8, "Password must be at least 8 characters."),
    role: z.enum(["admin", "sales", "store_manager", "furniture_specialist"]),
  })
  .superRefine((values, context) => {
    const hasEmail = values.email.length > 0;
    const hasPhone = values.phone.length > 0;

    if (!hasEmail && !hasPhone) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide at least an email or phone number.",
        path: ["email"],
      });
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide at least an email or phone number.",
        path: ["phone"],
      });
    }

    if (hasEmail && !z.string().email().safeParse(values.email).success) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid email address.",
        path: ["email"],
      });
    }

    if (hasPhone && !/^\+?[0-9]{8,15}$/.test(values.phone.replace(/[\s()-]/g, ""))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid phone number with country code when possible.",
        path: ["phone"],
      });
    }
  });

const createUserDefaults: CreateUserFormValues = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  role: "sales",
};

export default function AdminUsersPage() {
  const { authUser } = useAuth();
  const usersQuery = useUsersQuery();
  const countsQuery = useAssignedLeadCountsQuery();
  const createUserMutation = useCreateUserMutation();
  const updateRoleMutation = useUpdateUserRoleMutation();
  const updateActiveMutation = useUpdateUserActiveStatusMutation();
  const reassignMutation = useReassignLeadsForUserMutation();

  const [searchQuery, setSearchQuery] = useState("");
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [reassignmentUser, setReassignmentUser] = useState<UserSummary | null>(null);
  const [targetUserId, setTargetUserId] = useState<string>("unassigned");

  const createUserForm = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: createUserDefaults,
  });

  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const assignedLeadCounts = countsQuery.data ?? {};

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const query = searchQuery.toLowerCase();
        return (
          user.fullName.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          (user.phone ?? "").includes(searchQuery)
        );
      }),
    [searchQuery, users],
  );

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await updateRoleMutation.mutateAsync({
        userId,
        role: role as UserRole,
      });
      toast("Role updated", {
        description: "User permissions were updated successfully.",
      });
    } catch (error) {
      toast("Unable to update role", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const handleActiveToggle = async (userId: string, isActive: boolean) => {
    try {
      await updateActiveMutation.mutateAsync({
        userId,
        isActive,
      });
      toast(isActive ? "User activated" : "User deactivated", {
        description: isActive
          ? "The user can access the CRM again."
          : "The user will be blocked from protected routes.",
      });
    } catch (error) {
      toast("Unable to update status", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const openReassignmentDialog = (user: UserSummary) => {
    setReassignmentUser(user);
    setTargetUserId("unassigned");
  };

  const handleReassignment = async () => {
    if (!reassignmentUser) {
      return;
    }

    try {
      const movedCount = await reassignMutation.mutateAsync({
        fromUserId: reassignmentUser.id,
        toUserId: targetUserId === "unassigned" ? null : targetUserId,
        actorId: authUser?.id ?? null,
      });

      toast("Lead reassignment complete", {
        description:
          movedCount > 0
            ? `${movedCount} lead${movedCount === 1 ? "" : "s"} reassigned successfully.`
            : "No assigned leads were found for this user.",
      });

      setReassignmentUser(null);
      setTargetUserId("unassigned");
    } catch (error) {
      toast("Unable to reassign leads", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const handleCreateUser = createUserForm.handleSubmit(async (values) => {
    try {
      await createUserMutation.mutateAsync({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        phone: values.phone.replace(/[\s()-]/g, "").trim(),
        password: values.password,
        role: values.role,
      });

      toast("User created", {
        description: "The account was created successfully and can now sign in.",
      });
      createUserForm.reset(createUserDefaults);
      setCreateUserOpen(false);
    } catch (error) {
      toast("Unable to create user", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage Supabase profile metadata, active access, and lead ownership.
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => setCreateUserOpen(true)}>
          <Users className="h-4 w-4" />
          Create User
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          className="pl-10"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Assigned Leads</th>
              <th>Active</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {usersQuery.isLoading ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-muted-foreground">
                  Loading users...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-muted-foreground">
                  No users found.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => {
                const assignedLeadCount = assignedLeadCounts[user.id] ?? 0;

                return (
                  <tr key={user.id} className="group">
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {user.fullName
                              .split(" ")
                              .map((segment) => segment[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.fullName}</p>
                          <p className="text-xs text-muted-foreground">
                            {user.email || user.phone || "No email or phone"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Select
                        value={user.role}
                        onValueChange={(value) => void handleRoleChange(user.id, value)}
                        disabled={updateRoleMutation.isPending}
                      >
                        <SelectTrigger className="w-[210px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(roleLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="mt-2">
                        <Badge className={roleColors[user.role]}>{roleLabels[user.role]}</Badge>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {user.isActive ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-success" />
                            <span className="text-sm text-success">Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Inactive</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        className="h-auto px-0 text-sm font-medium text-primary"
                        onClick={() => openReassignmentDialog(user)}
                      >
                        {assignedLeadCount} assigned
                      </Button>
                    </td>
                    <td>
                      <Switch
                        checked={user.isActive}
                        onCheckedChange={(checked) => void handleActiveToggle(user.id, checked)}
                        disabled={updateActiveMutation.isPending}
                      />
                    </td>
                    <td>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openReassignmentDialog(user)}>
                            <UserCog className="mr-2 h-4 w-4" />
                            Reassign Leads
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Mail className="mr-2 h-4 w-4" />
                            Email User
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Shield className="mr-2 h-4 w-4" />
                            Review Permissions
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => void handleActiveToggle(user.id, !user.isActive)}
                          >
                            {user.isActive ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={Boolean(reassignmentUser)} onOpenChange={(open) => !open && setReassignmentUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Leads</DialogTitle>
            <DialogDescription>
              Move all currently assigned leads for {reassignmentUser?.fullName ?? "this user"} to
              another active team member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border p-3 text-sm">
              <p className="font-medium">
                Currently assigned: {reassignmentUser ? assignedLeadCounts[reassignmentUser.id] ?? 0 : 0}
              </p>
              <p className="mt-1 text-muted-foreground">
                Reassignment also creates assignment history and activity log entries.
              </p>
            </div>
            <div className="space-y-2">
              <Label>New owner</Label>
              <Select value={targetUserId} onValueChange={setTargetUserId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Leave unassigned</SelectItem>
                  {users
                    .filter(
                      (user) =>
                        user.isActive &&
                        user.id !== reassignmentUser?.id,
                    )
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.fullName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignmentUser(null)}>
              Cancel
            </Button>
            <Button onClick={() => void handleReassignment()} disabled={reassignMutation.isPending}>
              {reassignMutation.isPending ? "Reassigning..." : "Confirm Reassignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={createUserOpen}
        onOpenChange={(open) => {
          setCreateUserOpen(open);
          if (!open) {
            createUserForm.reset(createUserDefaults);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>
              Create an internal CRM user with email, phone, or both. They can log in using whichever
              identifier you create for them.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="create-user-full-name">Full name</Label>
                <Input id="create-user-full-name" {...createUserForm.register("fullName")} />
                <p className="text-xs text-destructive">
                  {createUserForm.formState.errors.fullName?.message}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-user-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="create-user-email"
                    type="email"
                    className="pl-10"
                    placeholder="name@mcubespaces.com"
                    {...createUserForm.register("email")}
                  />
                </div>
                <p className="text-xs text-destructive">
                  {createUserForm.formState.errors.email?.message}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-user-phone">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="create-user-phone"
                    className="pl-10"
                    placeholder="+919876543210"
                    {...createUserForm.register("phone")}
                  />
                </div>
                <p className="text-xs text-destructive">
                  {createUserForm.formState.errors.phone?.message}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-user-password">Password</Label>
                <Input
                  id="create-user-password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  {...createUserForm.register("password")}
                />
                <p className="text-xs text-destructive">
                  {createUserForm.formState.errors.password?.message}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={createUserForm.watch("role")}
                  onValueChange={(value) =>
                    createUserForm.setValue("role", value as UserRole, { shouldDirty: true })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border p-3 text-sm text-muted-foreground">
              If you provide only a phone and password, the user will log in with phone. If you provide
              only an email and password, they will log in with email. Providing both lets either one work.
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateUserOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createUserMutation.isPending}>
                {createUserMutation.isPending ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
