"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Wand2,
  FileText,
  Image as ImageIcon,
  FileCode2,
  Loader2,
} from "lucide-react";
import Link from "next/link";

export default function WebDownloaderPage() {
  const [url, setUrl] = useState("https://www.stan-travel.com/");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    both_docx: string;
    text_docx: string;
    images_zip: string;
  } | null>(null);

  const handleMagic = async () => {
    if (!url) {
      setError("請先輸入網址");
      return;
    }

    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/web-downloader", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "施展魔法時發生未知的錯誤...");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (
    base64Data: string,
    filename: string,
    mime: string,
  ) => {
    const link = document.createElement("a");
    link.href = `data:${mime};base64,${base64Data}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-6 md:p-12 selection:bg-fuchsia-500 selection:text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation */}
        <Link
          href="/"
          className="inline-flex items-center text-slate-400 hover:text-white transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Link>

        {/* Header */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-fuchsia-500 via-purple-500 to-blue-500"></div>

          <div className="relative z-10 space-y-6">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white flex items-center">
              <span className="text-4xl mr-4">📖</span> 網頁快速下載
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed font-light">
              轉換工具
              <br />
              只要輸入網址，本工具就能幫你把網頁上的 <strong>標題</strong>、
              <strong>文字段落</strong> 以及 <strong>美美的圖片</strong>{" "}
              通通抓下來，自動排版成美觀的 Word 檔案或 ZIP 圖片包！
            </p>

            {/* Input Section */}
            <div className="pt-6 space-y-4">
              <label className="text-sm font-medium text-fuchsia-300 ml-1">
                🔗 請輸入要轉換的網頁網址
              </label>
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-grow bg-slate-950/50 border border-slate-700 text-white px-5 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition-all shadow-inner text-lg"
                  placeholder="https://example.com"
                />
                <button
                  onClick={handleMagic}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-bold px-8 py-4 rounded-xl flex items-center justify-center transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(192,38,211,0.3)] hover:shadow-[0_0_30px_rgba(192,38,211,0.5)] whitespace-nowrap"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />{" "}
                      Running...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5 mr-2" /> START
                    </>
                  )}
                </button>
              </div>
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm flex items-center mt-2">
                  <span className="mr-2">⚠️</span> {error}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results Section */}
        {result && (
          <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h2 className="text-2xl font-bold text-center mb-8 flex items-center justify-center">
              <span className="text-3xl mr-3">✨</span> 成功！三種都準備好囉！
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Option 1 */}
              <button
                onClick={() =>
                  handleDownload(
                    result.both_docx,
                    "網頁圖文筆記.docx",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                  )
                }
                className="group bg-slate-800/50 border border-slate-700 p-6 rounded-2xl hover:bg-fuchsia-900/20 hover:border-fuchsia-500/50 transition-all text-left flex flex-col items-center text-center space-y-4"
              >
                <div className="p-4 bg-slate-700/50 rounded-full group-hover:bg-fuchsia-500/20 group-hover:scale-110 transition-all">
                  <FileCode2 className="w-8 h-8 text-fuchsia-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white mb-1">
                    🖼️+✍️ 圖文 Word
                  </h3>
                  <p className="text-sm text-slate-400">
                    完整保留圖文排版的筆記
                  </p>
                </div>
              </button>

              {/* Option 2 */}
              <button
                onClick={() =>
                  handleDownload(
                    result.text_docx,
                    "網頁純文字筆記.docx",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                  )
                }
                className="group bg-slate-800/50 border border-slate-700 p-6 rounded-2xl hover:bg-blue-900/20 hover:border-blue-500/50 transition-all text-left flex flex-col items-center text-center space-y-4"
              >
                <div className="p-4 bg-slate-700/50 rounded-full group-hover:bg-blue-500/20 group-hover:scale-110 transition-all">
                  <FileText className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white mb-1">
                    ✍️ 純文字 Word
                  </h3>
                  <p className="text-sm text-slate-400">
                    最純粹、加載超快的版本
                  </p>
                </div>
              </button>

              {/* Option 3 */}
              <button
                onClick={() =>
                  handleDownload(
                    result.images_zip,
                    "網頁圖片打包.zip",
                    "application/zip",
                  )
                }
                className="group bg-slate-800/50 border border-slate-700 p-6 rounded-2xl hover:bg-amber-900/20 hover:border-amber-500/50 transition-all text-left flex flex-col items-center text-center space-y-4"
              >
                <div className="p-4 bg-slate-700/50 rounded-full group-hover:bg-amber-500/20 group-hover:scale-110 transition-all">
                  <ImageIcon className="w-8 h-8 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white mb-1">
                    📦 純圖片 (ZIP)
                  </h3>
                  <p className="text-sm text-slate-400">
                    將網頁圖片打包一次下載
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
