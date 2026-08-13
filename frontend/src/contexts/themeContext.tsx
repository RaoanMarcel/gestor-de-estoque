import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

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
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('wms_theme') as Theme) || 'ocean');
  const [radius, setRadius] = useState<Radius>(() => (localStorage.getItem('wms_radius') as Radius) || 'modern');

  // Salva no LocalStorage e injeta na raiz do HTML para o CSS capturar
  useEffect(() => {
    localStorage.setItem('wms_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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