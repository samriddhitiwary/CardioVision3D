import { Activity } from 'lucide-react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <section className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex items-center gap-3">
          <Activity className="h-8 w-8 text-rose-400" aria-hidden="true" />
          <span className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            IIT Hackathon
          </span>
        </div>

        <div className="max-w-3xl">
          <h1 className="text-4xl font-bold tracking-normal text-white sm:text-5xl">
            Cardio 3D AI
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-300">
            AI-powered cardiovascular risk prediction and interactive 3D heart visualization.
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">
          Frontend scaffold is ready. Dashboard, prediction forms, and 3D heart views will be
          implemented in later feature branches.
        </div>
      </section>
    </main>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
