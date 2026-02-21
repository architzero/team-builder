export default function ThemeToggle({ theme, toggleTheme }) {
  return (
    <button 
      onClick={toggleTheme} 
      className="theme-toggle-float" 
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
