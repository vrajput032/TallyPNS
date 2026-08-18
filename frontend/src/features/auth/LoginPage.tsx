import { Loader2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { AuthSplash } from "@/components/loading/AuthSplash";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { GlobalBackground } from "@/components/effects/GlobalBackground";
import { MoneyTree } from "@/components/effects/MoneyTree";
import { TiltCard } from "@/lib/useTilt.tsx";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

const loginSchema = z.object({
  username: z.string().trim().min(2, "Enter your username"),
  password: z.string().min(6),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useAuthStore.persist.hasHydrated());
    return unsub;
  }, []);

  useEffect(() => {
    if (hydrated && accessToken) {
      navigate("/", { replace: true });
    }
  }, [hydrated, accessToken, navigate]);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const loginMutation = useMutation({
    mutationFn: async (values: LoginValues) => {
      const { data } = await api.post("/auth/login", {
        username: values.username.trim().toLowerCase(),
        password: values.password,
      });
      return data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      toast.success("Logged in successfully");
      navigate("/", { replace: true });
    },
    onError: (error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (!status) {
        toast.error("Cannot reach the server. Check your connection.");
        return;
      }
      toast.error("Invalid username or password");
    },
  });

  if (!hydrated) {
    return <AuthSplash message="Loading..." />;
  }

  if (accessToken) {
    return <AuthSplash message="Signing you in..." />;
  }

  return (
    <div className="relative min-h-screen w-full bg-muted/40">
      <GlobalBackground />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <div className="relative h-[40vh] w-full max-w-3xl flex-shrink-0">
          <MoneyTree maxHeight="100%" />
        </div>
        <TiltCard maxTilt={8} scale={1.01} speed={350}>
          <Card className="relative w-full max-w-md overflow-hidden border-border/60 shadow-xl shadow-primary/5 backdrop-blur-sm">
            {loginMutation.isPending ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-card/80 backdrop-blur-sm">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Signing in...</p>
              </div>
            ) : null}
            <CardHeader>
              <CardTitle>PNS ERP</CardTitle>
              <CardDescription>Sign in to your account</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  className="grid gap-4"
                  onSubmit={form.handleSubmit((values) => loginMutation.mutate(values))}
                >
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input type="text" autoComplete="username" placeholder="admin" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" autoComplete="current-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={loginMutation.isPending}>
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TiltCard>
      </div>
    </div>
  );
}
