import { CodeViewer } from './components/CodeViewer';
import { ControlPanel } from './components/ControlPanel';
import { Visualizer } from './components/Visualizer';

export function App() {
  return (
    <div className="min-h-screen bg-industrial-900 text-slate-100">
      <header className="border-b border-industrial-700 px-6 py-4">
        <h1 className="text-xl font-semibold">Parking Garage Gate Controller</h1>
      </header>
      <main className="grid gap-4 p-6 lg:grid-cols-3">
        <Visualizer />
        <ControlPanel />
        <CodeViewer />
      </main>
    </div>
  );
}

export default App;
