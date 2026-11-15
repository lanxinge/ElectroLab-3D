import React, { useEffect, useState } from 'react';
import { useAuthStore } from './store/useAuthStore';
import { useCircuitStore } from './store/useCircuitStore';
import { HeaderBar } from './components/HeaderBar';
import { ComponentPalette } from './components/ComponentPalette';
import { Workbench3DView } from './components/Workbench3DView';
import { Schematic2DSidebar } from './components/Schematic2DSidebar';
import { PropertyInspector } from './components/PropertyInspector';
import { BottomAnalysisDock } from './components/BottomAnalysisDock';
import { ForumView } from './components/ForumView';
import { AuthModal } from './components/AuthModal';
import { PublishCircuitModal } from './components/PublishCircuitModal';
import { MyProjectsModal } from './components/MyProjectsModal';
import { PonderHoverOverlay } from './components/PonderHoverOverlay';
import { PonderModal } from './components/PonderModal';

export function App() {
  const [activeView, setActiveView] = useState<'simulator' | 'forum'>('simulator');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [forumRefreshTrigger, setForumRefreshTrigger] = useState(0);

  const initAuth = useAuthStore((s) => s.initAuth);
  const sidebarMode = useCircuitStore((s) => s.sidebarMode);
  const setSidebarMode = useCircuitStore((s) => s.setSidebarMode);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      <HeaderBar
        activeView={activeView}
        onChangeView={setActiveView}
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenPublish={() => setShowPublishModal(true)}
        onOpenProjects={() => setShowProjectsModal(true)}
      />

      {activeView === 'forum' ? (
        <ForumView
          refreshTrigger={forumRefreshTrigger}
          onForkToSimulator={() => setActiveView('simulator')}
          onOpenPublish={() => setShowPublishModal(true)}
          onOpenAuth={() => setShowAuthModal(true)}
        />
      ) : (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Left Component Library */}
            <ComponentPalette />

            {/* Center 3D Workbench */}
            {sidebarMode !== '2d-only' && <Workbench3DView />}

            {/* Right Sidebar: Property Inspector + 2D Classical Schematic */}
            <aside
              className={`flex flex-col border-l border-slate-800 bg-slate-900/95 shrink-0 ${
                sidebarMode === '2d-only'
                  ? 'flex-1'
                  : sidebarMode === '3d-only'
                  ? 'w-72'
                  : 'w-[420px] xl:w-[480px]'
              }`}
            >
              <PropertyInspector />
              {sidebarMode !== '3d-only' && (
                <div className="flex-1 min-h-0">
                  <Schematic2DSidebar
                    onExpandToggle={() =>
                      setSidebarMode(sidebarMode === '2d-only' ? 'split' : '2d-only')
                    }
                  />
                </div>
              )}
            </aside>
          </div>

          {/* Bottom Real-Time Telemetry + Oscilloscope + Digital Truth Table & Karnaugh Map */}
          <BottomAnalysisDock />
        </div>
      )}

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      {showPublishModal && (
        <PublishCircuitModal
          onClose={() => setShowPublishModal(false)}
          onPublished={() => {
            setForumRefreshTrigger((n) => n + 1);
            setActiveView('forum');
          }}
        />
      )}
      {showProjectsModal && (
        <MyProjectsModal
          onClose={() => setShowProjectsModal(false)}
          onOpenAuth={() => {
            setShowProjectsModal(false);
            setShowAuthModal(true);
          }}
        />
      )}
      <PonderHoverOverlay />
      <PonderModal />
    </div>
  );
}

export default App;
