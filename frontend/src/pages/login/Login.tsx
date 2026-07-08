import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import Button from '../home/components/ui/Button.js';
import Input from '../home/components/ui/Input.js';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [senha, setSenha] = useState('');
  const [precisaMudarSenha, setPrecisaMudarSenha] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      const response = await api.post('/auth/login', { username, senha });
      const { token, precisaMudarSenha: deveMudar, username: userRetornado } = response.data;

      localStorage.setItem('wms_token', token);
      localStorage.setItem('wms_user', userRetornado);

      if (deveMudar) {
        setPrecisaMudarSenha(true);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setErro(err.response?.data?.error || 'Erro ao tentar realizar login.');
      localStorage.clear();
    } finally {
      setCarregando(false);
    }
  };

  const handleTrocaSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (novaSenha !== confirmarNovaSenha) {
      return setErro('As senhas não coincidem!');
    }
    if (novaSenha.length < 4) {
      return setErro('A nova senha precisa ter no menos 4 caracteres.');
    }

    setCarregando(true);
    try {
      await api.post('/auth/alterar-senha', { username, novaSenha });
      alert('Senha atualizada com sucesso! Faça login com suas novas credenciais.');
      
      localStorage.clear();
      setPrecisaMudarSenha(false);
      setSenha('');
      setNovaSenha('');
      setConfirmarNovaSenha('');
    } catch (err: any) {
      setErro(err.response?.data?.error || 'Erro ao redefinir a senha.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#F6F8FC] text-slate-800 antialiased flex items-center justify-center p-4 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.12),transparent_70%)] blur-3xl" />
        <div className="absolute -bottom-52 right-1/4 w-[650px] h-[650px] rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08),transparent_70%)] blur-3xl" />
      </div>

      <div className="relative bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl max-w-sm w-full p-6 space-y-6 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.1)]">
        
        <div className="space-y-1.5 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            {!precisaMudarSenha ? 'Acessar o Armazém' : 'Atualizar Senha Padrão'}
          </h2>
          <p className="text-xs text-slate-500">
            {!precisaMudarSenha 
              ? 'Insira suas credenciais operacionais abaixo.' 
              : 'Por segurança, mude sua senha no primeiro acesso.'}
          </p>
        </div>

        {erro && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium text-center">
            ⚠️ {erro}
          </div>
        )}

        {!precisaMudarSenha ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <Input 
              label="Usuário" 
              placeholder="Ex: joão.silva" 
              required 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
            />
            <Input 
              label="Senha" 
              type="password" 
              placeholder="••••••••" 
              required 
              value={senha} 
              onChange={(e) => setSenha(e.target.value)} 
            />
            <Button type="submit" variant="primary" className="w-full h-11 mt-2" disabled={carregando}>
              {carregando ? 'Verificando...' : 'Entrar no Sistema'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleTrocaSenha} className="space-y-4">
            <Input 
              label="Nova Senha" 
              type="password" 
              placeholder="Defina sua nova senha" 
              required 
              value={novaSenha} 
              onChange={(e) => setNovaSenha(e.target.value)} 
            />
            <Input 
              label="Confirmar Nova Senha" 
              type="password" 
              placeholder="Repita a nova senha" 
              required 
              value={confirmarNovaSenha} 
              onChange={(e) => setConfirmarNovaSenha(e.target.value)} 
            />
            <Button type="submit" variant="primary" className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 mt-2" disabled={carregando}>
              {carregando ? 'Salvando...' : 'Salvar Nova Senha'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}