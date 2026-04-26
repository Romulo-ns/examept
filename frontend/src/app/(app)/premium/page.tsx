"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useStore } from "@/store/useStore";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Zap, Sparkles, Loader2, ArrowRight } from "lucide-react";

export default function PremiumPage() {
  const { user } = useStore();
  const [isAnnual, setIsAnnual] = useState(true);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const [profile, setProfile] = useState<any>(null);
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);
  const [isCanceling, setIsCanceling] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/users/me');
        setProfile(response.data);
      } catch (error) {
        console.error("Erro a obter perfil", error);
      } finally {
        setIsFetchingProfile(false);
      }
    };
    
    if (user) {
      fetchProfile();
    } else {
      setIsFetchingProfile(false);
    }
  }, [user]);

  const isPremium = profile ? profile.plan === 'PREMIUM' : user?.plan === 'PREMIUM';
  const subscription = profile?.subscription;

  const handleCancelSubscription = async () => {
    if (!confirm('Tens a certeza que queres cancelar a tua assinatura? Vais perder o acesso ao plano Premium no final do período que já pagaste.')) {
      return;
    }
    
    setIsCanceling(true);
    try {
      await api.post('/stripe/cancel');
      alert('Assinatura cancelada com sucesso. O teu plano Premium continuará ativo até ao final do período.');
      // Refresh profile
      const response = await api.get('/users/me');
      setProfile(response.data);
    } catch (error) {
      console.error("Erro ao cancelar", error);
      alert('Ocorreu um erro ao cancelar a assinatura. Tenta novamente.');
    } finally {
      setIsCanceling(false);
    }
  };

  const handleSubscribe = async (plan: 'monthly' | 'annual') => {
    setIsLoading(plan);
    try {
      const response = await api.post('/stripe/checkout', { plan });
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error("Erro ao redirecionar para o checkout", error);
      alert("Ocorreu um erro ao iniciar o pagamento. Tenta novamente mais tarde.");
    } finally {
      setIsLoading(null);
    }
  };

  if (isPremium) {
    const isCanceled = subscription?.status === 'canceled_at_period_end' || subscription?.status === 'canceled';
    const periodEnd = subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-PT') : 'Desconhecida';

    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-6">
        <div className="flex justify-center mb-6">
          <div className="h-24 w-24 bg-gradient-to-tr from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/20">
            <Sparkles className="h-12 w-12 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
          És um membro Premium!
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Obrigado por apoiares o ExamPT. Tens acesso ilimitado a todas as funcionalidades da plataforma.
        </p>

        {isFetchingProfile ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="mt-8 max-w-md mx-auto bg-card border border-white/10 rounded-xl p-6 text-left shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-center">Detalhes da Assinatura</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center pb-3 border-b border-white/5">
                <span className="text-muted-foreground">Plano Atual</span>
                <span className="font-medium text-yellow-500">Premium</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-white/5">
                <span className="text-muted-foreground">Estado</span>
                {isCanceled ? (
                  <span className="font-medium text-orange-400">Cancela no fim do período</span>
                ) : (
                  <span className="font-medium text-emerald-400">Ativa</span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Válida até</span>
                <span className="font-medium">{periodEnd}</span>
              </div>
            </div>

            {!isCanceled && (
              <Button 
                variant="destructive" 
                className="w-full bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 transition-colors"
                onClick={handleCancelSubscription}
                disabled={isCanceling}
              >
                {isCanceling ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> A cancelar...</>
                ) : (
                  'Cancelar Assinatura'
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-4xl font-bold">Desbloqueia o teu potencial</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Passa os teus exames com distinção através do acesso a explicações detalhadas, estatísticas avançadas e exercícios ilimitados.
        </p>

        {/* Toggle */}
        <div className="flex items-center justify-center mt-8 mb-4">
          <div className="relative inline-flex items-center">
            <div className="bg-white/5 p-1 rounded-full inline-flex relative">
              <button
                onClick={() => setIsAnnual(false)}
                className={`w-32 py-2 rounded-full text-sm font-medium transition-colors z-10 ${
                  !isAnnual ? 'text-white' : 'text-muted-foreground hover:text-white'
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`w-32 py-2 rounded-full text-sm font-medium transition-colors z-10 ${
                  isAnnual ? 'text-white' : 'text-muted-foreground hover:text-white'
                }`}
              >
                Anual
              </button>
              <div 
                className={`absolute top-1 bottom-1 w-32 bg-white/15 rounded-full transition-transform duration-300 ease-in-out ${
                  isAnnual ? 'translate-x-full' : 'translate-x-0'
                }`} 
              />
            </div>
            
            {/* Floating Badge */}
            <div className="absolute -top-5 -right-10 rotate-[10deg]">
              <span className="bg-gradient-to-r from-primary to-purple-500 text-white text-[10px] px-2 py-1 rounded-full font-bold shadow-lg shadow-primary/50 border border-white/20 whitespace-nowrap">
                POUPA 2 MESES
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Free Plan */}
        <Card className="border-white/10 bg-background/50">
          <CardHeader>
            <CardTitle className="text-2xl">Básico</CardTitle>
            <CardDescription>Para quem está a começar</CardDescription>
            <div className="mt-4">
              <span className="text-4xl font-bold">Grátis</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> 10 Exercícios por dia
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> Respostas certas/erradas
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> Ranking global
              </li>
              <li className="flex items-center gap-2 opacity-50">
                <Check className="h-4 w-4 invisible" /> Sem explicações detalhadas
              </li>
              <li className="flex items-center gap-2 opacity-50">
                <Check className="h-4 w-4 invisible" /> Sem estatísticas de radar
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full border-white/10" disabled>
              Plano Atual
            </Button>
          </CardFooter>
        </Card>

        {/* Premium Plan */}
        <Card className="border-primary/50 bg-primary/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3">
            <Zap className="h-6 w-6 text-yellow-500 fill-yellow-500/20" />
          </div>
          <CardHeader>
            <CardTitle className="text-2xl bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              Premium
            </CardTitle>
            <CardDescription>Para resultados de excelência</CardDescription>
            <div className="mt-4 flex items-end gap-1">
              <span className="text-4xl font-bold">{isAnnual ? '49,90€' : '4,99€'}</span>
              <span className="text-muted-foreground mb-1">/{isAnnual ? 'ano' : 'mês'}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> Exercícios <strong>Ilimitados</strong>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> <strong>Explicações passo-a-passo</strong>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> Gráficos de Radar & Estatísticas
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> Ranking com Destaque
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> Suporte Prioritário
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white font-bold"
              onClick={() => handleSubscribe(isAnnual ? 'annual' : 'monthly')}
              disabled={isLoading !== null}
            >
              {isLoading !== null ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>Desbloquear Premium <ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
