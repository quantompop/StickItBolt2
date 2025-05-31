/**
 * Generates a random ID
 */
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 10);
};

/**
 * Determines if text color should be light or dark based on background color
 * @param color - Color name
 * @returns "text-white" or "text-gray-800"
 */
export const getTextColorForBackground = (color: string): string => {
  // Map of color names to text colors
  const colorTextMap: Record<string, string> = {
    yellow: 'text-gray-800',
    blue: 'text-white',
    green: 'text-white',
    pink: 'text-gray-800',
    purple: 'text-white',
    orange: 'text-gray-800',
    red: 'text-white',
    teal: 'text-white',
    indigo: 'text-white',
    lime: 'text-gray-800',
    amber: 'text-gray-800',
    cyan: 'text-gray-800',
    rose: 'text-white',
    sky: 'text-white',
    emerald: 'text-white',
    fuchsia: 'text-white',
    violet: 'text-white',
    gray: 'text-white'
  };
  
  return colorTextMap[color] || 'text-gray-800';
};

/**
 * Maps color names to Tailwind background classes
 * @param color - Color name
 * @returns Tailwind class string
 */
export const getNoteColorClass = (color: string): string => {
  const colorMap: Record<string, string> = {
    yellow: 'bg-amber-200',
    blue: 'bg-blue-400',
    green: 'bg-green-400',
    pink: 'bg-pink-300',
    purple: 'bg-purple-400',
    orange: 'bg-orange-300',
    red: 'bg-red-400',
    teal: 'bg-teal-400',
    indigo: 'bg-indigo-400',
    lime: 'bg-lime-300',
    amber: 'bg-amber-300',
    cyan: 'bg-cyan-300',
    rose: 'bg-rose-400',
    sky: 'bg-sky-400',
    emerald: 'bg-emerald-400',
    fuchsia: 'bg-fuchsia-400',
    violet: 'bg-violet-400',
    gray: 'bg-gray-400'
  };
  
  return colorMap[color] || 'bg-amber-200';
};

/**
 * Get hover color class based on base color
 */
export const getHoverColorClass = (color: string): string => {
  const hoverMap: Record<string, string> = {
    yellow: 'hover:bg-amber-300',
    blue: 'hover:bg-blue-500',
    green: 'hover:bg-green-500',
    pink: 'hover:bg-pink-400',
    purple: 'hover:bg-purple-500',
    orange: 'hover:bg-orange-400',
    red: 'hover:bg-red-500',
    teal: 'hover:bg-teal-500',
    indigo: 'hover:bg-indigo-500',
    lime: 'hover:bg-lime-400',
    amber: 'hover:bg-amber-400',
    cyan: 'hover:bg-cyan-400',
    rose: 'hover:bg-rose-500',
    sky: 'hover:bg-sky-500',
    emerald: 'hover:bg-emerald-500',
    fuchsia: 'hover:bg-fuchsia-500',
    violet: 'hover:bg-violet-500',
    gray: 'hover:bg-gray-500'
  };
  
  return hoverMap[color] || 'hover:bg-amber-300';
};