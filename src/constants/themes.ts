export interface Theme {
  id: string;
  name: string;
  background: string;
  card: string;
  text: string;
  accent: string;
  button: string;
  buttonText: string;
}

export const THEMES: Record<string, Theme> = {
  default: {
    id: 'default',
    name: 'Minimalist',
    background: 'bg-white',
    card: 'bg-white border-gray-100',
    text: 'text-black',
    accent: 'bg-black',
    button: 'bg-black hover:bg-gray-800',
    buttonText: 'text-white'
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    background: 'bg-slate-950',
    card: 'bg-slate-900 border-slate-800',
    text: 'text-slate-100',
    accent: 'bg-indigo-500',
    button: 'bg-indigo-600 hover:bg-indigo-500',
    buttonText: 'text-white'
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Glow',
    background: 'bg-orange-50',
    card: 'bg-white/80 backdrop-blur-sm border-orange-100',
    text: 'text-orange-950',
    accent: 'bg-orange-500',
    button: 'bg-orange-600 hover:bg-orange-500',
    buttonText: 'text-white'
  },
  forest: {
    id: 'forest',
    name: 'Deep Forest',
    background: 'bg-emerald-950',
    card: 'bg-emerald-900/50 backdrop-blur-sm border-emerald-800',
    text: 'text-emerald-50',
    accent: 'bg-emerald-500',
    button: 'bg-emerald-600 hover:bg-emerald-500',
    buttonText: 'text-white'
  },
  cyber: {
    id: 'cyber',
    name: 'Cyberpunk',
    background: 'bg-black',
    card: 'bg-black border-fuchsia-500/50 shadow-[0_0_15px_rgba(217,70,239,0.2)]',
    text: 'text-fuchsia-50',
    accent: 'bg-fuchsia-500',
    button: 'bg-fuchsia-600 hover:bg-fuchsia-500',
    buttonText: 'text-white'
  }
};
