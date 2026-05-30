import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  X, 
  RefreshCw, 
  Plus, 
  Check, 
  AlertTriangle,
  Terminal,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';

interface PackageManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTheme?: 'light' | 'vibrant-dark' | 'midnight-obsidian';
}

interface VenvStatus {
  hasPython: boolean;
  created: boolean;
  installingBase: boolean;
  error: string | null;
  installedCount: number;
}

interface PythonLib {
  name: string;
  version: string;
}

export default function PackageManagerModal({ isOpen, onClose, activeTheme = 'light' }: PackageManagerModalProps) {
  const [status, setStatus] = useState<VenvStatus | null>(null);
  const [packages, setPackages] = useState<PythonLib[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [installInput, setInstallInput] = useState('');
  const [isInstalling, setIsInstalling] = useState(false);
  const [isUninstalling, setIsUninstalling] = useState(false);
  const [showUninstallConfirm, setShowUninstallConfirm] = useState(false);
  const [installOutput, setInstallOutput] = useState<string | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set());

  // Common packages suggestion catalog
  const popularPackages = [
    { name: 'scipy', desc: 'Funciones avanzadas de álgebra, cálculo y estadística.' },
    { name: 'sympy', desc: 'Cálculo matemático simbólico (álgebra, límites, derivadas).' },
    { name: 'scikit-image', desc: 'Procesamiento de imágenes y visión computacional.' },
    { name: 'nltk', desc: 'Procesamiento de Lenguaje Natural (NLP/textos).' },
    { name: 'openpyxl', desc: 'Lógica para leer y escribir planillas de cálculo Excel.' },
    { name: 'plotly', desc: 'Gráficos científicos altamente interactivos y dinámicos.' },
    { name: 'requests', desc: 'Llamados HTTP y descargas externas de APIs en vivo.' }
  ];

  const fetchStatusAndPackages = async () => {
    try {
      const resStatus = await fetch('/api/pip/status');
      const dataStatus = await resStatus.json();
      setStatus(dataStatus);

      const resPkgs = await fetch('/api/pip/packages');
      const dataPkgs = await resPkgs.json();
      if (dataPkgs.success && Array.isArray(dataPkgs.packages)) {
        setPackages(dataPkgs.packages);
      }
    } catch (err) {
      console.error('Error fetching environment data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePackage = (packageName: string) => {
    const newSelected = new Set(selectedPackages);
    if (newSelected.has(packageName)) {
      newSelected.delete(packageName);
    } else {
      newSelected.add(packageName);
    }
    setSelectedPackages(newSelected);
  };

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetchStatusAndPackages();
      // Periodically refresh if venv base packages are installing in the background
      const interval = setInterval(async () => {
        try {
          const res = await fetch('/api/pip/status');
          const data = await res.json();
          setStatus(data);
          if (!data.installingBase) {
            // Once base packages installation finishes, pull the updated library list and stop interval
            const resPkgs = await fetch('/api/pip/packages');
            const dataPkgs = await resPkgs.json();
            if (dataPkgs.success && Array.isArray(dataPkgs.packages)) {
              setPackages(dataPkgs.packages);
            }
            clearInterval(interval);
          }
        } catch (e) {
          // ignore
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleInstallPackage = async (name: string) => {
    if (!name.trim() || isInstalling) return;
    setIsInstalling(true);
    setInstallOutput(null);
    setInstallError(null);

    try {
      const token = localStorage.getItem('py_ide_token');
      const res = await fetch('/api/pip/install', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ packageName: name.trim() })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setInstallOutput(data.stdout || `¡Librería ${name} instalada exitosamente!`);
        // clear input after success if user typed it
        if (name.toLowerCase() === installInput.toLowerCase()) {
          setInstallInput('');
        }
        await fetchStatusAndPackages();
      } else {
        setInstallError(data.error || data.stderr || 'Ocurrió un error inesperado al descargar la librería.');
        if (data.stdout || data.stderr) {
          setInstallOutput((data.stdout || '') + '\n' + (data.stderr || ''));
        }
      }
    } catch (err: any) {
      setInstallError(err.message || 'Error de conexión con el host de instalación.');
    } finally {
      setIsInstalling(false);
    }
  };

  if (!isOpen) return null;

  // Theming classes adaptation
  const isLight = activeTheme === 'light';
  const isVibrant = activeTheme === 'vibrant-dark';
  
  const c = {
    overlay: 'fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4',
    card: isLight
      ? 'bg-white text-slate-800 border class-slate-200 shadow-2xl w-full max-w-3xl h-[85vh] rounded-2xl flex flex-col overflow-hidden'
      : isVibrant
      ? 'bg-slate-900 text-slate-200 border border-slate-800 shadow-2xl w-full max-w-3xl h-[85vh] rounded-2xl flex flex-col overflow-hidden'
      : 'bg-neutral-950 text-neutral-200 border border-neutral-900 shadow-2xl w-full max-w-3xl h-[85vh] rounded-2xl flex flex-col overflow-hidden',
    header: isLight ? 'bg-slate-50 border-b border-slate-200 p-4 shrink-0' : 'bg-slate-950/60 border-b border-slate-850 p-4 shrink-0',
    title: isLight ? 'text-slate-800' : 'text-white',
    subText: isLight ? 'text-slate-500' : 'text-slate-400',
    closeBtn: isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800',
    statusBadge: isLight ? 'bg-indigo-50 border border-indigo-150 text-indigo-700' : 'bg-indigo-950/20 border border-indigo-900/60 text-indigo-300',
    statusInstalledBg: isLight ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/40',
    input: isLight ? 'bg-slate-50 border-slate-250 text-slate-800 placeholder-slate-400' : 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600',
    cardItem: isLight ? 'bg-slate-50 border border-slate-200/80 hover:bg-slate-100/60' : 'bg-slate-950/50 border border-slate-850 hover:bg-slate-900/40',
    terminal: isLight ? 'bg-slate-900 text-slate-100' : 'bg-black text-emerald-400 border border-slate-850',
    btnPrimary: 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold',
    btnSecondary: isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-250'
  };

  const filteredPackages = packages.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={c.overlay} id="package-manager-overlay-container" onClick={onClose}>
      <div className={c.card} id="package-manager-modal-card" onClick={e => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className={c.header}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-xs">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h2 className={`text-base font-bold tracking-tight ${c.title}`}>Gestor de Entorno Virtual Pip (.venv)</h2>
                <p className={`text-[11px] ${c.subText}`}>Instala librerías científicas, de análisis y Machine Learning en tiempo real.</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors ${c.closeBtn}`}
              id="close-pkg-modal-btn"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {/* Status Bar */}
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <RefreshCw className="h-6 w-6 text-indigo-500 animate-spin mr-2" />
              <span className="text-xs font-semibold">Cargando estado del entorno virtual...</span>
            </div>
          ) : (
            <div className={`p-3.5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 ${c.statusBadge}`}>
              <div className="flex items-start gap-2.5">
                <Layers className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold flex items-center gap-1.5">
                    {status?.hasPython ? 'Entorno Virtual Activo (.venv)' : 'Ejecutor Local Virtual/Simulado'}
                    {status?.installingBase && (
                      <span className="animate-pulse bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                        Preinstalando dependencias en segundo plano...
                      </span>
                    )}
                  </p>
                  <p className={`text-[11px] font-medium leading-relaxed opacity-90 mt-0.5`}>
                    {status?.hasPython 
                      ? 'Nuestra plataforma provee aislamiento de dependencias. Los scripts que ejecutes utilizarán las librerías instaladas abajo.'
                      : 'El software está corriendo en un sandbox sin Python nativo. Las librerías agregadas serán simuladas en nuestro ejecutor lógico.'
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 md:self-center">
                <div className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${c.statusInstalledBg}`}>
                  Librerías: {status?.installingBase ? 'Instalando...' : status?.installedCount || 0}
                </div>
                <button 
                  onClick={fetchStatusAndPackages}
                  title="Refrescar estado de librerías"
                  className="p-1.5 hover:bg-indigo-350/15 rounded-md transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Quick Installation form input with pip command prefix */}
          <div className="space-y-2">
            <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${c.title}`}>
              <Terminal className="h-4 w-4 text-slate-400" /> Descargar nueva librería desde PyPI
            </h3>
            <div className="flex gap-2">
              <div className="relative flex-1 group">
                <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono select-none">
                  pip install
                </span>
                <input
                  type="text"
                  placeholder="ej. scipy, sympy, plotly, requests, openpyxl"
                  value={installInput}
                  onChange={e => setInstallInput(e.target.value)}
                  disabled={isInstalling}
                  onKeyDown={e => e.key === 'Enter' && handleInstallPackage(installInput)}
                  className={`w-full py-2 pl-24 pr-3 ${c.input} rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all`}
                  id="pip-install-package-input"
                />
              </div>
              <button
                disabled={isInstalling || !installInput.trim()}
                onClick={() => handleInstallPackage(installInput)}
                className={`px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
                  isInstalling || !installInput.trim()
                    ? 'bg-slate-250 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    : c.btnPrimary
                }`}
                id="btn-run-pip-install"
              >
                {isInstalling ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Instalando...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    <span>Instalar</span>
                  </>
                )}
              </button>
              <button
                disabled={selectedPackages.size === 0 || isUninstalling || isInstalling}
                onClick={() => setShowUninstallConfirm(true)}
                className={`px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
                  selectedPackages.size === 0 || isUninstalling || isInstalling
                    ? 'bg-slate-250 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
                id="btn-uninstall-packages"
              >
                {isUninstalling ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Desinstalando...</span>
                  </>
                ) : (
                  <>
                    <X className="h-3.5 w-3.5" />
                    <span>Eliminar ({selectedPackages.size})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Visual stdout terminal log stream for pip operations */}
          {(installOutput || installError) && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400 flex items-center justify-between">
                <span>Salida del Log (Pip Terminal)</span>
                <button 
                  onClick={() => { setInstallOutput(null); setInstallError(null); }}
                  className="text-indigo-400 hover:text-rose-400 transition-colors text-[9px] font-semibold"
                >
                  Limpiar terminal
                </button>
              </p>
              <div className={`p-3.5 rounded-xl font-mono text-[11px] leading-relaxed max-h-[140px] overflow-y-auto whitespace-pre-wrap select-text ${c.terminal}`} id="pip-output-terminal">
                {installError && (
                  <div className="text-rose-400 mb-1 flex items-start gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>Error: {installError}</span>
                  </div>
                )}
                {installOutput || 'Descargando paquetes de PyPI y resolviendo dependencias...'}
              </div>
            </div>
          )}

          {/* Grid Layout: Recommended libraries & Installed Libraries Catalog */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-1.5">
            
            {/* Catalog list section */}
            <div className="col-span-1 md:col-span-12 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${c.title}`}>
                  <Package className="h-4 w-4 text-emerald-500" /> Librerías Instaladas en tu Entorno
                </h3>
                
                {/* Search query input */}
                <div className="relative max-w-sm w-full sm:w-[240px]">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrar librerías..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className={`w-full py-1.5 pl-8 pr-2.5 ${c.input} rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-505`}
                    id="search-installed-packages-input"
                  />
                </div>
              </div>

              {/* Installed Libraries Section */}
              <div className="space-y-2">
                <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${c.title}`}>
                  <Check className="h-4 w-4 text-emerald-500" /> Librerías Instaladas ({filteredPackages.length})
                </h3>
                {filteredPackages.length === 0 ? (
                  <div className={`p-3.5 rounded-lg text-xs text-center ${c.cardItem}`}>
                    {packages.length === 0 ? 'Sin librerías instaladas aún.' : 'Sin coincidencias en la búsqueda.'}
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
                    {filteredPackages.map(pkg => (
                      <div
                        key={pkg.name}
                        className={`p-3 rounded-lg flex items-center gap-3 transition-all ${c.cardItem}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedPackages.has(pkg.name)}
                          onChange={() => handleTogglePackage(pkg.name)}
                          className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                          disabled={isInstalling}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{pkg.name}</p>
                          <p className="text-[10px] text-slate-500">{pkg.version || 'version desconocida'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Popular packages suggestions bento block */}
            <div className="col-span-1 md:col-span-12 space-y-3 pt-2">
              <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${c.title}`}>
                <Sparkles className="h-4 w-4 text-indigo-400" /> Librerías científicas y de IA sugeridas
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {popularPackages.map((pkg) => {
                  const alreadyInstalled = packages.some(p => p.name.toLowerCase() === pkg.name.toLowerCase());
                  return (
                    <div 
                      key={pkg.name} 
                      className={`p-3 rounded-xl transition-all flex flex-col justify-between gap-1.5 ${c.cardItem}`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-indigo-500">{pkg.name}</span>
                          {alreadyInstalled ? (
                            <span className="text-[9px] font-bold text-emerald-500 flex items-center gap-0.5 select-none bg-emerald-500/10 dark:bg-emerald-950/30 px-1 py-0.5 rounded border border-emerald-500/20">
                              <Check className="h-2.5 w-2.5" /> Instalado
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setInstallInput(pkg.name);
                                handleInstallPackage(pkg.name);
                              }}
                              disabled={isInstalling}
                              className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 active:scale-95 transition-all"
                            >
                              Descargar
                            </button>
                          )}
                        </div>
                        <p className={`text-[11px] leading-relaxed ${c.subText} mt-1`} style={{ fontSize: '10px' }}>
                          {pkg.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className={`p-4 border-t ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-850'} flex justify-end shrink-0`}>
          <button
            onClick={onClose}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${c.btnPrimary}`}
            id="close-package-manager-foot-btn"
          >
            Aceptar
          </button>
        </div>

      </div>
    </div>
  );
}
