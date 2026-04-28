"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Trophy, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth, registerSchema, type RegisterData } from "@/hooks/useAuth";

export default function RegisterPage() {
  const { register: registerUser, isLoading, error, checkNickAvailability } = useAuth();
  const [nickStatus, setNickStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange'
  });

  const nickValue = watch("nick");

  useEffect(() => {
    if (!nickValue || nickValue.length < 3) {
      setNickStatus('idle');
      return;
    }

    const timer = setTimeout(async () => {
      setNickStatus('checking');
      const status = await checkNickAvailability(nickValue);
      setNickStatus(status);
    }, 500);

    return () => clearTimeout(timer);
  }, [nickValue]);

  const onSubmit = (data: RegisterData) => {
    if (nickStatus === 'taken') return;
    registerUser(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2">
            <Trophy className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              ExamPT
            </span>
          </Link>
        </div>

        <Card className="border-white/10 shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Criar Conta</CardTitle>
            <CardDescription>
              Junta-te a nós e começa a arrasar nos exames
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  {...register("email")}
                  className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    id="nick"
                    type="text"
                    placeholder="Nickname público"
                    {...register("nick")}
                    className={
                      errors.nick || nickStatus === 'taken' 
                        ? "border-destructive focus-visible:ring-destructive pr-10" 
                        : "pr-10"
                    }
                  />
                  <div className="absolute right-3 top-2.5 flex items-center">
                    {nickStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    {nickStatus === 'available' && !errors.nick && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {nickStatus === 'taken' && <XCircle className="h-4 w-4 text-destructive" />}
                    {nickStatus === 'error' && <XCircle className="h-4 w-4 text-amber-500" />}
                  </div>
                </div>
                {errors.nick && (
                  <p className="text-xs text-destructive">{errors.nick.message}</p>
                )}
                {!errors.nick && nickStatus === 'taken' && (
                  <p className="text-xs text-destructive">Este nick já está em uso</p>
                )}
                {!errors.nick && nickStatus === 'error' && (
                  <p className="text-xs text-amber-500">Erro ao verificar disponibilidade. Tenta novamente.</p>
                )}
                {!errors.nick && nickStatus === 'available' && (
                  <p className="text-xs text-green-500">Nick disponível!</p>
                )}
              </div>

              <div className="space-y-2">
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  {...register("password")}
                  className={errors.password ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>
              
              {error && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20 text-center">
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 border-0" 
                disabled={isLoading || nickStatus === 'checking' || nickStatus === 'taken' || !isValid}
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Registar"}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#09090b] px-2 text-muted-foreground">Ou continuar com</span>
              </div>
            </div>

            <Button
              variant="outline"
              type="button"
              className="w-full bg-white text-black hover:bg-gray-100 hover:text-black border-0 h-11"
              onClick={() => {
                window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/auth/google`;
              }}
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 text-center">
            <div className="text-sm text-muted-foreground">
              Já tens conta?{" "}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                Entra aqui
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
