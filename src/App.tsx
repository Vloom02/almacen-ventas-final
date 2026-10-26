import React, { Suspense, lazy } from 'react';
import { LockClosedIcon } from './components/ui/icons';
import { IonApp, IonRouterOutlet, IonTabs, IonTabBar, IonTabButton, IonLabel, IonSpinner, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route, Redirect } from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';
import { VentasProvider } from './context/VentasContext';
import { ThemeProvider } from './context/ThemeContext';
import { FontScaleProvider } from './context/FontScaleContext';
import { OwnerProvider } from './context/OwnerContext';
import { EmpleadoProvider, useEmpleado } from './context/EmpleadoContext';
import OwnerGuard from './components/OwnerGuard';
import LoginScreen from './components/LoginScreen';
import OnboardingVentas from './components/OnboardingVentas';
import CajeroGate from './components/CajeroGate';
import { OfertaHuellaPendiente } from './lib/useHuella';
import VentaPage from './pages/VentaPage'; // eager: es la pantalla de inicio
// Páginas secundarias: lazy → bundle inicial más liviano / arranque más rápido
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const StockPage     = lazy(() => import('./pages/StockPage'));
const CierrePage    = lazy(() => import('./pages/CierrePage'));
const HistorialPage = lazy(() => import('./pages/HistorialPage'));
const DeudasPage    = lazy(() => import('./pages/DeudasPage'));
const CajerosPage   = lazy(() => import('./pages/CajerosPage'));
const MasPage       = lazy(() => import('./pages/MasPage'));
const CajeroCierrePage = lazy(() => import('./pages/CajeroCierrePage'));
const CajaTurnoPage = lazy(() => import('./pages/CajaTurnoPage'));
const EstadisticasPage = lazy(() => import('./pages/EstadisticasPage'));
const PromosPage    = lazy(() => import('./pages/PromosPage'));

import { ShoppingCartIcon, CubeIcon } from './components/ui/icons';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
// Fuentes self-hosted (offline-first, sin round-trip a Google Fonts al arrancar).
// Atkinson Hyperlegible: diseñada para baja visión (letras que no se confunden: Il1, O0).
import '@fontsource-variable/atkinson-hyperlegible-next';
import '@fontsource-variable/atkinson-hyperlegible-mono';
import './theme/variables.css';
import './theme/motion.css';

setupIonicReact();

// Fallback mientras carga una página lazy
const PageLoader: React.FC = () => (
  <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <IonSpinner name="crescent" style={{ color: 'var(--color-primary)' }} />
  </div>
);

// Tab icon wrapper (Heroicons → Ionic tab)
const TabIcon: React.FC<{ Icon: React.FC<{size?:number;color?:string}>; active?: boolean }> = ({ Icon }) => (
  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={22} /></span>
);

// Ícono "Más" (grilla 2x2)
const EllipsisIcon: React.FC<{ size?: number; color?: string }> = ({ size = 22, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

const Tabs: React.FC = () => (
  <IonTabs>
    <IonRouterOutlet>
      <Route path="/venta"      component={VentaPage}      exact />
      <Route path="/dashboard"  exact render={() => <Suspense fallback={<PageLoader />}><OwnerGuard titulo="Resumen del día"><DashboardPage /></OwnerGuard></Suspense>} />
      <Route path="/stock"      exact render={() => <Suspense fallback={<PageLoader />}><StockPage /></Suspense>} />
      <Route path="/caja"       exact render={() => <Suspense fallback={<PageLoader />}><OwnerGuard titulo="Caja"><CierrePage /></OwnerGuard></Suspense>} />
      <Route path="/historial"  exact render={() => <Suspense fallback={<PageLoader />}><OwnerGuard titulo="Ventas anteriores"><HistorialPage /></OwnerGuard></Suspense>} />
      <Route path="/deudas"     exact render={() => <Suspense fallback={<PageLoader />}><OwnerGuard titulo="Fiado"><DeudasPage /></OwnerGuard></Suspense>} />
      <Route path="/cajeros"    exact render={() => <Suspense fallback={<PageLoader />}><OwnerGuard titulo="Empleados de caja"><CajerosPage /></OwnerGuard></Suspense>} />
      <Route path="/estadisticas" exact render={() => <Suspense fallback={<PageLoader />}><OwnerGuard titulo="Lo más vendido"><EstadisticasPage /></OwnerGuard></Suspense>} />
      <Route path="/promos"     exact render={() => <Suspense fallback={<PageLoader />}><OwnerGuard titulo="Ofertas"><PromosPage /></OwnerGuard></Suspense>} />
      <Route path="/mas"        exact render={() => <Suspense fallback={<PageLoader />}><MasPage /></Suspense>} />
      <Route path="/cerrar-caja" exact render={() => <Suspense fallback={<PageLoader />}><CajeroCierrePage /></Suspense>} />
      <Route path="/caja-turno"  exact render={() => <Suspense fallback={<PageLoader />}><CajaTurnoPage /></Suspense>} />
      <Route path="/" exact><Redirect to="/venta" /></Route>
    </IonRouterOutlet>

    {/* Barra despejada: lo de todos los días (Venta, Stock) + hub "Más" con lo del dueño */}
    <IonTabBar slot="bottom" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
      <IonTabButton tab="venta" href="/venta">
        <TabIcon Icon={ShoppingCartIcon} />
        <IonLabel style={{ fontSize: 15 }}>Vender</IonLabel>
      </IonTabButton>
      <IonTabButton tab="stock" href="/stock">
        <TabIcon Icon={CubeIcon} />
        <IonLabel style={{ fontSize: 15 }}>Productos</IonLabel>
      </IonTabButton>
      <IonTabButton tab="mas" href="/mas">
        <TabIcon Icon={EllipsisIcon} />
        <IonLabel style={{ fontSize: 15 }}>Más</IonLabel>
      </IonTabButton>
    </IonTabBar>
  </IonTabs>
);

// Gate: login → plan check → app
const Gate: React.FC = () => {
  const { user, loading, planBloqueado, comercio } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      </div>
    );
  }

  if (!user) return <IonReactRouter><LoginScreen /></IonReactRouter>;

  if (planBloqueado) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24, textAlign: 'center' }}>
        <div style={{ marginBottom: 12, color: 'var(--text-2)' }}><LockClosedIcon size={48} /></div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
          {comercio?.plan === 'suspendido' ? 'Cuenta suspendida' : 'Tu prueba terminó'}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-2)', maxWidth: 280, lineHeight: 1.6 }}>
          {comercio?.plan === 'suspendido'
            ? `El plan de ${comercio?.nombre} está suspendido. Contactá a soporte para reactivarlo.`
            : `Terminó la prueba gratuita de ${comercio?.nombre}. Tus datos siguen guardados: activá tu suscripción para seguir vendiendo.`}
        </p>
      </div>
    );
  }

  return (
    <VentasProvider>
      <OwnerProvider>
        <EmpleadoProvider>
          <AppConCajero />
        </EmpleadoProvider>
      </OwnerProvider>
    </VentasProvider>
  );
};

// Si el comercio tiene cajeros definidos, exige iniciar turno antes de usar la app.
const AppConCajero: React.FC = () => {
  const { cajero, hayEmpleados, cargando } = useEmpleado();

  if (cargando) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      </div>
    );
  }

  // Sin internet no se puede validar el legajo: NO bloqueamos (evita dejar al
  // cajero trabado si cerró turno offline). Cuando vuelve la red, el gate exige.
  if (hayEmpleados && !cajero && navigator.onLine) {
    return <IonReactRouter><CajeroGate /></IonReactRouter>;
  }

  return (
    <>
      <IonReactRouter>
        <Tabs />
      </IonReactRouter>
      <OnboardingVentas />
      <OfertaHuellaPendiente />
    </>
  );
};

const App: React.FC = () => (
  <IonApp>
    <ThemeProvider>
      <FontScaleProvider>
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </FontScaleProvider>
    </ThemeProvider>
  </IonApp>
);

export default App;
