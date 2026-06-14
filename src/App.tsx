import React, { Suspense, lazy } from 'react';
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
import VentaPage from './pages/VentaPage'; // eager: es la pantalla de inicio
// Páginas secundarias: lazy → bundle inicial más liviano / arranque más rápido
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const StockPage     = lazy(() => import('./pages/StockPage'));
const CierrePage    = lazy(() => import('./pages/CierrePage'));
const HistorialPage = lazy(() => import('./pages/HistorialPage'));
const DeudasPage    = lazy(() => import('./pages/DeudasPage'));
const CajerosPage   = lazy(() => import('./pages/CajerosPage'));

import { ShoppingCartIcon, ChartBarIcon, CubeIcon, ClipboardIcon, BookOpenIcon, BanknotesIcon } from './components/ui/icons';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import './theme/variables.css';

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

const Tabs: React.FC = () => (
  <IonTabs>
    <IonRouterOutlet>
      <Route path="/venta"      component={VentaPage}      exact />
      <Route path="/dashboard"  exact render={() => <Suspense fallback={<PageLoader />}><OwnerGuard titulo="Dashboard"><DashboardPage /></OwnerGuard></Suspense>} />
      <Route path="/stock"      exact render={() => <Suspense fallback={<PageLoader />}><StockPage /></Suspense>} />
      <Route path="/caja"       exact render={() => <Suspense fallback={<PageLoader />}><OwnerGuard titulo="Cierre de caja"><CierrePage /></OwnerGuard></Suspense>} />
      <Route path="/historial"  exact render={() => <Suspense fallback={<PageLoader />}><OwnerGuard titulo="Historial"><HistorialPage /></OwnerGuard></Suspense>} />
      <Route path="/deudas"     exact render={() => <Suspense fallback={<PageLoader />}><OwnerGuard titulo="Deudas"><DeudasPage /></OwnerGuard></Suspense>} />
      <Route path="/cajeros"    exact render={() => <Suspense fallback={<PageLoader />}><OwnerGuard titulo="Cajeros"><CajerosPage /></OwnerGuard></Suspense>} />
      <Route path="/" exact><Redirect to="/venta" /></Route>
    </IonRouterOutlet>

    <IonTabBar slot="bottom" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
      <IonTabButton tab="venta" href="/venta">
        <TabIcon Icon={ShoppingCartIcon} />
        <IonLabel style={{ fontSize: 10 }}>Venta</IonLabel>
      </IonTabButton>
      <IonTabButton tab="dashboard" href="/dashboard">
        <TabIcon Icon={ChartBarIcon} />
        <IonLabel style={{ fontSize: 10 }}>Dashboard</IonLabel>
      </IonTabButton>
      <IonTabButton tab="stock" href="/stock">
        <TabIcon Icon={CubeIcon} />
        <IonLabel style={{ fontSize: 10 }}>Stock</IonLabel>
      </IonTabButton>
      <IonTabButton tab="caja" href="/caja">
        <TabIcon Icon={BanknotesIcon} />
        <IonLabel style={{ fontSize: 10 }}>Caja</IonLabel>
      </IonTabButton>
      <IonTabButton tab="historial" href="/historial">
        <TabIcon Icon={ClipboardIcon} />
        <IonLabel style={{ fontSize: 10 }}>Historial</IonLabel>
      </IonTabButton>
      <IonTabButton tab="deudas" href="/deudas">
        <TabIcon Icon={BookOpenIcon} />
        <IonLabel style={{ fontSize: 10 }}>Deudas</IonLabel>
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
        <div style={{ fontSize: 48, marginBottom: 12 }}>⏸️</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Cuenta suspendida</h2>
        <p style={{ fontSize: 14, color: 'var(--text-2)', maxWidth: 280, lineHeight: 1.6 }}>
          El plan de {comercio?.nombre} está suspendido. Contactá a soporte para reactivarlo.
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

  if (hayEmpleados && !cajero) {
    return <IonReactRouter><CajeroGate /></IonReactRouter>;
  }

  return (
    <>
      <IonReactRouter>
        <Tabs />
      </IonReactRouter>
      <OnboardingVentas />
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
