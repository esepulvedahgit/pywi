import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Red de seguridad de último recurso: si un crash de render escapa a cualquier otra
 * defensa (ej. un futuro bug de estado corrupto), evita que React desmonte todo el
 * árbol y deje una pantalla en blanco irrecuperable. Ofrece un botón para limpiar el
 * estado local sospechoso y recargar, sin que el usuario tenga que borrar datos del
 * sitio a mano.
 */
export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('Uncaught render error:', error, info.componentStack);
  }

  handleRecover = () => {
    // Limpia claves conocidas por poder quedar en un estado corrupto y fuerza
    // una recarga limpia — recupera al usuario sin tocar su sesión ni proyectos.
    localStorage.removeItem('py_ide_lang');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const english = localStorage.getItem('py_ide_lang') === 'en';
      return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950 text-slate-100 p-6">
          <div className="max-w-sm w-full text-center space-y-4">
            <p className="text-2xl">⚠️</p>
            <h1 className="text-base font-bold">{english ? 'An unexpected error occurred' : 'Ocurrió un error inesperado'}</h1>
            <p className="text-sm text-slate-400">
              {english ? 'Something went wrong while displaying the application. Reload to try again.' : 'Algo falló al mostrar la aplicación. Recarga para intentarlo de nuevo.'}
            </p>
            <button
              onClick={this.handleRecover}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {english ? 'Reload' : 'Recargar'}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
