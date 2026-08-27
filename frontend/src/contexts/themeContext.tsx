import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

type Theme = 'ocean' | 'midnight' | 'coffee';
type Radius = 'sharp' | 'modern' | 'soft';

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  radius: Radius;
  setRadius: (r: Radius) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // 🚀 ALTERAÇÃO 1: Importamos o useLocation para o Contexto saber em qual tela estamos
  const location = useLocation();
  
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('wms_theme') as Theme) || 'ocean');
  const [radius, setRadius] = useState<Radius>(() => (localStorage.getItem('wms_radius') as Radius) || 'modern');

  // Salva no LocalStorage e injeta na raiz do HTML para o CSS capturar
  useEffect(() => {
    localStorage.setItem('wms_theme', theme);
    
    // 🚀 ALTERAÇÃO 2: Blindagem Absoluta da Tela de Login.
    // Se a rota for o login, ele força a tag <html> a usar o tema claro 'ocean'.
    // Quando o usuário logar e sair do /login, ele restaura automaticamente o 'theme' salvo!
    if (location.pathname === '/login') {
      document.documentElement.setAttribute('data-theme', 'ocean');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    
  }, [theme, location.pathname]); // Re-executa sempre que o usuário trocar de cor ou de rota

  useEffect(() => {
    localStorage.setItem('wms_radius', radius);
    document.documentElement.setAttribute('data-radius', radius);
  }, [radius]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, radius, setRadius }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme deve ser usado dentro do ThemeProvider");
  return context;
};