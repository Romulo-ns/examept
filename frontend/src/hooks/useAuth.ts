import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import api from '@/lib/api';
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A password deve ter no mínimo 6 caracteres'),
});

export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  nick: z
    .string()
    .min(3, 'O nick deve ter no mínimo 3 caracteres')
    .max(20, 'O nick deve ter no máximo 20 caracteres')
    .regex(/^[a-zA-Z0-9_]+$/, 'O nick só pode conter letras, números e underscore'),
  password: z.string().min(6, 'A password deve ter no mínimo 6 caracteres'),
});

export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const setUser = useStore((state) => state.setUser);

  const login = async (data: LoginData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/login', data);
      const { user, accessToken, refreshToken } = response.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      setUser(user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ocorreu um erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/register', data);
      const { user, accessToken, refreshToken } = response.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      setUser(user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ocorreu um erro ao fazer registo');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout API error', err);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      router.push('/');
    }
  };

  const checkNickAvailability = async (nick: string): Promise<'available' | 'taken' | 'error'> => {
    try {
      const response = await api.get(`/users/check-nick?nick=${encodeURIComponent(nick)}`);
      return response.data.available ? 'available' : 'taken';
    } catch (err) {
      console.error('Erro ao verificar nick:', err);
      return 'error';
    }
  };

  return {
    login,
    register,
    logout,
    checkNickAvailability,
    isLoading,
    error,
    setError,
  };
}
