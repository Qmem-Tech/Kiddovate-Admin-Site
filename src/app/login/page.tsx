"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import toast from "react-hot-toast";
import { auth } from "@/lib/firebase";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, Loader2, Gamepad2, FileText, MessageSquare, Shield } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) router.replace("/dashboard");
    });
    return () => unsub();
  }, [router]);

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (e) {
      const error = e as { message?: string };
      toast.error(error?.message ?? "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding (Tactix-like) */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-20 xl:px-24 bg-gradient-to-br from-secondary-700 via-secondary-600 to-primary-700">
        <div className="text-white">
          <div className="flex items-center space-x-3 mb-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Gamepad2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Kiddovate</h1>
              <p className="text-white/80">Educational Gaming Platform</p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-4xl font-bold leading-tight">
              Welcome to your
              <br />
              <span className="text-primary-300">Admin Dashboard</span>
            </h2>

            <p className="text-xl text-white/80 leading-relaxed">
              Manage your app legal pages and user feedback with a clean, fast admin experience.
            </p>

            <div className="space-y-4 pt-8">
              <div className="flex items-center space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                  <FileText className="h-4 w-4" />
                </div>
                <span className="text-white/80">Edit About, Privacy, Terms, Contact</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <span className="text-white/80">Track & resolve feedback</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                  <Shield className="h-4 w-4" />
                </div>
                <span className="text-white/80">Secure Firebase Authentication</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex flex-1 flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 bg-white">
        <div className="mx-auto w-full max-w-sm">
          {/* Mobile branding */}
          <div className="text-center lg:hidden mb-8">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-secondary-600 to-primary-500 flex items-center justify-center">
              <Gamepad2 className="h-8 w-8 text-white" />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">Kiddovate Admin</h2>
            <p className="mt-2 text-sm text-gray-600">Educational Gaming Platform</p>
          </div>

          <div className="space-y-6">
            <div className="text-center lg:text-left">
              <h2 className="text-3xl font-bold text-gray-900">Sign in</h2>
              <p className="mt-2 text-gray-600">
                Enter your credentials to access the admin dashboard
              </p>
            </div>

            <Card className="border-0 shadow-kiddovate">
              <CardContent className="p-8">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit(onSubmit)(e);
                  }}
                  className="space-y-6"
                >
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                      Email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      {...register("email")}
                      className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-primary-300 focus:ring-2 focus:ring-primary-100 transition-all"
                      placeholder="admin@kiddovate.com"
                    />
                    {errors.email && (
                      <p className="mt-2 text-sm text-error-600">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        {...register("password")}
                        className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-primary-300 focus:ring-2 focus:ring-primary-100 transition-all pr-12"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-primary-600 transition-colors"
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-2 text-sm text-error-600">{errors.password.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl bg-[#F7AC3D] hover:bg-[#e69a2e] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                        Signing you in...
                      </>
                    ) : (
                      <>
                        <Shield className="mr-3 h-5 w-5" />
                        Sign In to Dashboard
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="text-center">
              <p className="text-sm text-gray-500">
                Secured by <span className="font-semibold text-primary-600">Firebase Authentication</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

