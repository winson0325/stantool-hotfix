import Link from "next/link";
import { ArrowRight, Download, Zap, ShieldAlert } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white font-sans p-8 md:p-24 selection:bg-purple-500 selection:text-white">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header Section */}
        <header className="space-y-4 text-center md:text-left">
          <div className="inline-block px-4 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-200 text-sm font-medium mb-4 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            ✨ StanTravle
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-200 via-fuchsia-300 to-white">
            StanTravle tool integrate
          </h1>
          <p className="text-lg md:text-xl text-purple-200/80 max-w-2xl font-light leading-relaxed">
            All your favorite tools seamlessly integrated into one beautiful,
            high-performance platform. Explore the collection below.
          </p>
        </header>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-8">
          {/* Tool Card 1 */}
          <Link href="/tool/web-downloader" className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-fuchsia-600 rounded-2xl blur opacity-20 group-hover:opacity-100 transition duration-500"></div>
            <div className="relative h-full bg-slate-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-2xl hover:bg-slate-800/50 transition-colors duration-300 flex flex-col items-start">
              <div className="p-3 bg-purple-500/20 rounded-xl mb-6 shadow-inner">
                <Download className="w-8 h-8 text-purple-300" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-purple-300 transition-colors">
                Web Downloader
              </h3>
              <p className="text-purple-100/60 font-light flex-grow mb-6 leading-relaxed">
                Extract text, titles, and images from any webpage. Export
                seamlessly to Word documents or ZIP archives.
              </p>
              <div className="flex items-center text-purple-400 font-medium text-sm group-hover:translate-x-1 transition-transform">
                Launch Tool <ArrowRight className="ml-2 w-4 h-4" />
              </div>
            </div>
          </Link>

          {/* Tool Card 2 */}
          <Link href="/tool/vote-analyze" className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-rose-500 to-orange-600 rounded-2xl blur opacity-20 group-hover:opacity-100 transition duration-500"></div>
            <div className="relative h-full bg-slate-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-2xl hover:bg-slate-800/50 transition-colors duration-300 flex flex-col items-start">
              <div className="p-3 bg-rose-500/20 rounded-xl mb-6 shadow-inner">
                <ShieldAlert className="w-8 h-8 text-rose-300" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-rose-300 transition-colors">
                Vote Analyzer
              </h3>
              <p className="text-rose-100/60 font-light flex-grow mb-6 leading-relaxed">
                Detect abnormal voting patterns, track specific IPs, and summarize submission votes in real-time.
              </p>
              <div className="flex items-center text-rose-400 font-medium text-sm group-hover:translate-x-1 transition-transform">
                Launch Tool <ArrowRight className="ml-2 w-4 h-4" />
              </div>
            </div>
          </Link>

          {/* Placeholder Card */}
          <div className="group relative opacity-60 cursor-not-allowed">
            <div className="relative h-full bg-slate-900/30 backdrop-blur-sm border border-white/5 p-8 rounded-2xl flex flex-col items-start border-dashed">
              <div className="p-3 bg-slate-800 rounded-xl mb-6">
                <Zap className="w-8 h-8 text-slate-500" />
              </div>
              <h3 className="text-2xl font-bold text-slate-400 mb-3">
                Coming Soon
              </h3>
              <p className="text-slate-500 font-light flex-grow mb-6 leading-relaxed">
                More powerful integrations are being forged in the lab. Stay
                tuned for updates.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
