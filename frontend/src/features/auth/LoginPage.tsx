import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
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
  email: z.string().email(),
  password: z.string().min(6),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const loginMutation = useMutation({
    mutationFn: async (values: LoginValues) => {
      const { data } = await api.post("/auth/login", values);
      return data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      toast.success("Logged in successfully");
      navigate("/");
    },
    onError: (error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (!status) {
        toast.error("Cannot reach the server. Check your connection.");
        return;
      }
      toast.error("Invalid email or password");
    },
  });

  return (
    <div className="relative min-h-screen w-full bg-muted/40">
      <GlobalBackground />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <div className="relative h-[40vh] w-full max-w-3xl flex-shrink-0">
          <MoneyTree maxHeight="100%" />
        </div>
        <TiltCard maxTilt={8} scale={1.01} speed={350}>
          <Card className="relative w-full max-w-md border-border/60 shadow-xl shadow-primary/5 backdrop-blur-sm">
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
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="admin@pnsenterprises.com" {...field} />
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
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={loginMutation.isPending}>
                    {loginMutation.isPending ? "Signing in..." : "Sign in"}
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
