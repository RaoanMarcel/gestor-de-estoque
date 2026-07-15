import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '../../services/api.js';
import Button from '../home/components/ui/Button.js';
import Input from '../home/components/ui/Input.js';
import toast from 'react-hot-toast';

type Face = 'login' | 'trocar';

export default function Login() {
  const navigate = useNavigate();

  const [face, setFace] = useState<Face>('login');

  // ---- LOGIN ----
  const [username, setUsername] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  // ---- TROCA DE SENHA ----
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  const [erroTroca, setErroTroca] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErro(''); 
    setCarregando(true);
    try {
      const { data } = await api.post('/auth/login', { username, senha });
      
      // INTERCEPTAÇÃO DE PRIMEIRO ACESSO:
      // Se o backend retornar que precisa mudar a senha, joga para a face traseira do card
      if (data.precisaMudarSenha) {
        setSenhaAtual(senha); // Já preenche a atual com a que ele acabou de digitar
        setFace('trocar');
        return;
      }

      // Se não precisar, segue o fluxo normal salvando os tokens
      localStorage.setItem('wms_token', data.token);
      localStorage.setItem('wms_user', data.username || username);
      
      navigate('/');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setErro(err.response?.data?.error ?? 'Credenciais inválidas');
      } else {
        setErro('Erro inesperado ao autenticar');
      }
    } finally { 
      setCarregando(false); 
    }
  }

  async function handleTrocarSenha(e: React.FormEvent) {
    e.preventDefault();
    setErroTroca('');
    if (novaSenha !== confirmarNovaSenha) return setErroTroca('As senhas não coincidem.');
    setSalvando(true);
    try {
      await api.post('/auth/alterar-senha', { username, novaSenha });
      toast.success('Senha atualizada com sucesso! Agora faça o login com as novas credenciais.');
      
      // Reseta os estados e volta para a face de login
      setFace('login');
      setSenha(''); setSenhaAtual(''); setNovaSenha(''); setConfirmarNovaSenha('');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setErroTroca(err.response?.data?.error ?? 'Não foi possível trocar a senha.');
      } else {
        setErroTroca('Erro inesperado ao alterar senha');
      }
    } finally { 
      setSalvando(false); 
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center px-4 py-10">
      {/* ============ FUNDO LIMPO (Sem as linhas de grade) ============ */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0" style={{
          background:
            'radial-gradient(120% 80% at 15% 0%, #eef2f8 0%, transparent 55%),' +
            'radial-gradient(90% 70% at 100% 20%, #e4ecf6 0%, transparent 60%),' +
            'radial-gradient(80% 60% at 50% 100%, #dbe5f2 0%, transparent 65%),' +
            'linear-gradient(180deg, #f7f9fc 0%, #eef2f7 100%)',
        }}/>
        <div className="absolute -top-32 -left-32 h-[520px] w-[520px] rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, #3b6fa0, transparent 70%)', animation: 'float 18s ease-in-out infinite' }}/>
        <div className="absolute -bottom-40 -right-24 h-[560px] w-[560px] rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, #1e3a5f, transparent 70%)', animation: 'float 22s ease-in-out infinite reverse' }}/>
      </div>

      <div className="relative w-full max-w-md" style={{ perspective: '1800px' }}>
        <div
          className="relative w-full transition-transform duration-[900ms]"
          style={{
            transformStyle: 'preserve-3d',
            transform: face === 'login' ? 'rotateY(0deg)' : 'rotateY(180deg)',
            transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {/* FACE FRONTAL: LOGIN */}
          <CardFace>
            <Header eyebrow="Acesso restrito"
                    title="Entrar na plataforma"
                    subtitle="Use suas credenciais corporativas para continuar." />
            <form onSubmit={handleLogin} className="px-8 py-7 space-y-5">
              <Field label="Usuário">
                <Input type="text" autoComplete="username" placeholder="seu.usuario" required
                  value={username} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setUsername(e.target.value)}
                  className={inputCls}/>
              </Field>
              <Field label="Senha">
                <Input type="password" autoComplete="current-password" placeholder="••••••••" required
                  value={senha} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setSenha(e.target.value)}
                  className={inputCls}/>
              </Field>
              {erro && <ErrorBox>{erro}</ErrorBox>}
              <PrimaryButton disabled={carregando}>
                {carregando ? 'Autenticando…' : 'Entrar'}
              </PrimaryButton>
              <div className="flex items-center justify-between pt-1">
                <button type="button" onClick={()=>setFace('trocar')}
                  className="text-xs text-slate-500 hover:text-[#21508f] transition-colors">
                  Trocar minha senha →
                </button>
              </div>
            </form>
          </CardFace>

          {/* FACE TRASEIRA: TROCA DE SENHA OBRIGATÓRIA */}
          <CardFace back>
            <Header eyebrow="Segurança obrigatória"
                    title="Definir Nova Senha"
                    subtitle="Este é seu primeiro acesso. Por favor atualize suas credenciais." />
            <form onSubmit={handleTrocarSenha} className="px-8 py-7 space-y-5">
              <Field label="Senha atual (padrão)">
                <Input type="password" required value={senhaAtual}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setSenhaAtual(e.target.value)} className={inputCls}/>
              </Field>
              <Field label="Nova senha">
                <Input type="password" placeholder="Mínimo 8 caracteres" required value={novaSenha}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setNovaSenha(e.target.value)} className={inputCls}/>
              </Field>
              <Field label="Confirmar nova senha">
                <Input type="password" placeholder="Repita a nova senha" required value={confirmarNovaSenha}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setConfirmarNovaSenha(e.target.value)} className={inputCls}/>
              </Field>
              {erroTroca && <ErrorBox>{erroTroca}</ErrorBox>}
              <PrimaryButton disabled={salvando}>
                {salvando ? 'Salvando…' : 'Salvar nova senha'}
              </PrimaryButton>
              <div className="flex items-center justify-between pt-1">
                <button type="button" onClick={()=>setFace('login')}
                  className="text-xs text-slate-500 hover:text-[#1e3a5f] transition-colors">
                  ← Voltar para login
                </button>
              </div>
            </form>
          </CardFace>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%,100% { transform: translate3d(0,0,0) scale(1); }
          50%     { transform: translate3d(30px,-24px,0) scale(1.06); }
        }
      `}</style>
    </div>
  );
}

interface CardFaceProps {
  children: React.ReactNode;
  back?: boolean;
}

interface HeaderProps {
  eyebrow: string;
  title: string;
  subtitle: string;
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

interface ErrorBoxProps {
  children: React.ReactNode;
}

interface PrimaryButtonProps {
  children: React.ReactNode;
  disabled?: boolean;
}

const inputCls = "w-full h-11 bg-white/90 border-slate-200 focus:border-[#1e3a5f]/60 focus:ring-2 focus:ring-[#1e3a5f]/15";

function CardFace({ children, back = false }: CardFaceProps) {
  return (
    <div
      className={`${back ? 'absolute inset-0' : 'relative'}`}
      style={{
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transform: back ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}
    >
      <div className="absolute -inset-px rounded-2xl opacity-70 blur"
           style={{ background:'linear-gradient(135deg, #1e3a5f33, #3b6fa033)' }} aria-hidden/>
      <div className="relative bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-[0_20px_60px_-25px_rgba(30,58,95,0.35)] overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function Header({ eyebrow, title, subtitle }: HeaderProps) {
  return (
    <div className="px-8 pt-8 pb-6 border-b border-slate-100">
      <div className="flex items-center gap-2 mb-4">
        <span className="h-2 w-2 rounded-full bg-[#3b6fa0]" />
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">{eyebrow}</span>
      </div>
      <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function Field({ label, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase tracking-wider text-slate-600">{label}</label>
      {children}
    </div>
  );
}

function ErrorBox({ children }: ErrorBoxProps) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-rose-200/70 bg-rose-50/70 px-3 py-2 text-xs text-rose-700">
      <span className="mt-0.5">⚠</span><span>{children}</span>
    </div>
  );
}

function PrimaryButton({ children, disabled }: PrimaryButtonProps) {
  return (
    <Button type="submit" variant="primary" disabled={disabled}
      className="w-full h-11 text-sm font-medium tracking-wide text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-blue-500/35 disabled:opacity-60"
      style={{ background:'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)' }}>
      {children}
    </Button>
  );
}