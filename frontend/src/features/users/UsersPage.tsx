import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeletonRows } from "@/components/loading/PageSkeletons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useAuthStore } from "@/store/authStore";
import { UserFormDialog } from "./UserFormDialog";
import { useDeleteUser, useUsers } from "./useUsers";
import type { AppUser, UserRole } from "./types";

function accessLabel(role: UserRole) {
  switch (role) {
    case "ADMIN":
      return "Admin — full access";
    case "STAFF":
      return "Staff — add only";
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

function RoleBadge({ role }: { role: UserRole }) {
  switch (role) {
    case "ADMIN":
      return <Badge>Admin</Badge>;
    case "STAFF":
      return <Badge variant="secondary">Staff</Badge>;
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

function MobileUserCards({
  users,
  isLoading,
  currentUserId,
  deleting,
  onDelete,
}: {
  users: AppUser[];
  isLoading: boolean;
  currentUserId: string | undefined;
  deleting: boolean;
  onDelete: (user: AppUser) => void;
}) {
  if (isLoading) {
    return (
      <div className="grid gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">No users found.</p>;
  }

  return (
    <div className="grid gap-3">
      {users.map((user) => {
        const isYou = user.id === currentUserId;
        const initial = (user.name.trim() || user.username).charAt(0).toUpperCase() || "?";
        const accent = user.role === "ADMIN" ? "bg-primary" : "bg-muted-foreground/40";

        return (
          <div
            key={user.id}
            className="relative overflow-hidden rounded-2xl border bg-card shadow-sm"
          >
            <div className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
            <div className="flex items-center gap-3 p-4 pl-5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold leading-tight">{user.username}</p>
                  {isYou ? <Badge variant="outline">You</Badge> : null}
                </div>
                <p className="truncate text-sm text-muted-foreground">{user.name}</p>
                <div className="mt-1.5">
                  <RoleBadge role={user.role} />
                </div>
              </div>
              {isYou ? null : (
                <Button
                  variant="ghost"
                  size="icon-lg"
                  className="size-11 shrink-0"
                  onClick={() => onDelete(user)}
                  disabled={deleting}
                  aria-label={`Delete ${user.username}`}
                >
                  <Trash2 className="size-5" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function UsersPage() {
  const { data: users, isLoading } = useUsers();
  const deleteUser = useDeleteUser();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const isMobile = useIsMobile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const list = users ?? [];

  function handleDelete(user: AppUser) {
    if (user.id === currentUserId) {
      toast.error("You cannot delete your own account");
      return;
    }
    if (!confirm(`Delete user "${user.username}"? They will no longer be able to sign in.`)) {
      return;
    }
    deleteUser.mutate(user.id, {
      onSuccess: () => toast.success(`User ${user.username} deleted`),
      onError: (error: unknown) => {
        const message =
          (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          "Failed to delete user";
        toast.error(message);
      },
    });
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Users"
        backTo="/"
        backLabel="Back to Dashboard"
        actions={
          isMobile ? null : (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" />
              Add user
            </Button>
          )
        }
      />

      {isMobile ? (
        <>
          <Button className="h-12 w-full text-base" onClick={() => setDialogOpen(true)}>
            <Plus className="size-5" />
            Add user
          </Button>
          <MobileUserCards
            users={list}
            isLoading={isLoading}
            currentUserId={currentUserId}
            deleting={deleteUser.isPending}
            onDelete={handleDelete}
          />
        </>
      ) : (
        <div className="min-w-0 rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Access</TableHead>
                <TableHead className="w-16 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeletonRows columns={4} rows={5} />
              ) : list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                list.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{accessLabel(user.role)}</TableCell>
                    <TableCell className="text-right">
                      {user.id === currentUserId ? null : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(user)}
                          disabled={deleteUser.isPending}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <UserFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
