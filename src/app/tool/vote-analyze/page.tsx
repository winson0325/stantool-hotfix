"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Search,
  ShieldAlert,
  Activity,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";

export default function VoteAnalyzePage() {
  const [activeTab, setActiveTab] = useState<
    | "submission"
    | "ip"
    | "abnormal"
    | "filterSingle"
    | "filterAll"
    | "userBehavior"
  >("submission");
  const [searchQuery, setSearchQuery] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(true);
  const [isSubmissionSummaryOpen, setIsSubmissionSummaryOpen] = useState(true);
  const [isFilterSummaryOpen, setIsFilterSummaryOpen] = useState(true);
  const [includeInvalidEmails, setIncludeInvalidEmails] = useState(false);

  const [submissionData, setSubmissionData] = useState<any>(null);
  const [ipData, setIpData] = useState<any>(null);
  const [abnormalData, setAbnormalData] = useState<any>(null);
  const [filterSingleData, setFilterSingleData] = useState<any>(null);
  const [filterProgress, setFilterProgress] = useState<{
    current: number;
    total: number;
    checking: string;
  } | null>(null);

  const [filterAllData, setFilterAllData] = useState<any[] | null>(null);
  const [filterAllProgress, setFilterAllProgress] = useState<{
    current: number;
    total: number;
    checking: string;
  } | null>(null);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [saveAllMessage, setSaveAllMessage] = useState("");
  const [expandedSubmissions, setExpandedSubmissions] = useState<
    Record<string, boolean>
  >({});

  const [userBehaviorQuery, setUserBehaviorQuery] = useState("");
  const [userBehaviorData, setUserBehaviorData] = useState<any[] | null>(null);

  const toggleSubmissionExpand = (id: string) => {
    setExpandedSubmissions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchFilterAll = async () => {
    setIsLoading(true);
    setFilterAllData(null);
    setFilterAllProgress({ current: 0, total: 1, checking: "正在過濾..." });
    setSaveAllMessage("");

    try {
      const res = await fetch("/api/vote-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "filterAllStream" }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");
      const decoder = new TextDecoder();

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const lines = part.split("\n");
          let event = "";
          let dataStr = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) event = line.slice(7);
            if (line.startsWith("data: ")) dataStr = line.slice(6);
          }

          if (event === "progress") {
            setFilterAllProgress(JSON.parse(dataStr));
          } else if (event === "complete") {
            setFilterAllData(JSON.parse(dataStr).results);
            setFilterAllProgress(null);
          } else if (event === "error") {
            console.error("Stream error:", dataStr);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      setFilterAllProgress(null);
    }
  };

  const saveFilterAll = async () => {
    if (!filterAllData) return;
    setIsSavingAll(true);
    setSaveAllMessage("正在儲存至資料庫...");
    try {
      const res = await fetch("/api/vote-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveFilterAll",
          results: filterAllData,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveAllMessage("✅ 儲存成功！已準備好給功能 6 使用");
      } else {
        setSaveAllMessage("❌ 儲存失敗");
      }
    } catch (e) {
      setSaveAllMessage("❌ 儲存發生錯誤");
    } finally {
      setIsSavingAll(false);
    }
  };

  const fetchFilterSingle = async (specificId?: string) => {
    if (!searchQuery && !specificId) return;
    setIsLoading(true);
    setFilterSingleData(null);
    setFilterProgress({ current: 0, total: 1, checking: "準備中..." });

    try {
      const res = await fetch("/api/vote-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "filterSingle",
          query: searchQuery,
          submissionId: specificId,
        }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");
      const decoder = new TextDecoder();

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const lines = part.split("\n");
          let event = "";
          let dataStr = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) event = line.slice(7);
            if (line.startsWith("data: ")) dataStr = line.slice(6);
          }

          if (event === "progress") {
            setFilterProgress(JSON.parse(dataStr));
          } else if (event === "complete") {
            setFilterSingleData(JSON.parse(dataStr));
            setFilterProgress(null);
          } else if (event === "error") {
            console.error("Stream error:", dataStr);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      setFilterProgress(null);
    }
  };

  const fetchSubmission = async (specificId?: string) => {
    if (!searchQuery && !specificId) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/vote-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getBySubmission",
          query: searchQuery,
          submissionId: specificId,
        }),
      });
      setSubmissionData(await res.json());
    } finally {
      setIsLoading(false);
    }
  };

  const fetchIp = async () => {
    if (!ipAddress) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/vote-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getByIp", ip: ipAddress }),
      });
      setIpData(await res.json());
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserBehavior = async () => {
    if (!userBehaviorQuery) return;
    setIsLoading(true);
    setUserBehaviorData(null);
    try {
      const res = await fetch("/api/vote-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "searchUserBehavior",
          query: userBehaviorQuery,
        }),
      });
      setUserBehaviorData(await res.json());
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAbnormal = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/vote-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "detectAbnormal" }),
      });
      setAbnormalData(await res.json());
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-6 md:p-12 selection:bg-rose-500 selection:text-white">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation */}
        <Link
          href="/"
          className="inline-flex items-center text-slate-400 hover:text-white transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> 回到工具列表
        </Link>

        {/* Header */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500"></div>

          <div className="relative z-10 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white flex items-center mb-2">
                <ShieldAlert className="w-8 h-8 mr-3 text-rose-500" />{" "}
                投票異常分析系統
              </h1>
              <p className="text-slate-400 font-light">
                快速查詢稿件票數、追蹤特定 IP 行為，並自動偵測異常行為
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab("submission")}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center whitespace-nowrap ${activeTab === "submission" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "bg-slate-900/50 text-slate-400 hover:bg-slate-800"}`}
          >
            <Users className="w-4 h-4 mr-2" /> 稿件票數分析
          </button>
          <button
            onClick={() => setActiveTab("ip")}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center whitespace-nowrap ${activeTab === "ip" ? "bg-orange-500/20 text-orange-300 border border-orange-500/30" : "bg-slate-900/50 text-slate-400 hover:bg-slate-800"}`}
          >
            <Activity className="w-4 h-4 mr-2" /> 特定 IP 追蹤
          </button>
          <button
            onClick={() => {
              setActiveTab("abnormal");
              fetchAbnormal();
            }}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center whitespace-nowrap ${activeTab === "abnormal" ? "bg-red-500/20 text-red-300 border border-red-500/30" : "bg-slate-900/50 text-slate-400 hover:bg-slate-800"}`}
          >
            <ShieldAlert className="w-4 h-4 mr-2" /> 異常檢測
          </button>
          <button
            onClick={() => setActiveTab("filterSingle")}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center whitespace-nowrap ${activeTab === "filterSingle" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-slate-900/50 text-slate-400 hover:bg-slate-800"}`}
          >
            <ShieldAlert className="w-4 h-4 mr-2" /> 稿件單一異常過濾
          </button>
          <button
            onClick={() => setActiveTab("filterAll")}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center whitespace-nowrap ${activeTab === "filterAll" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "bg-slate-900/50 text-slate-400 hover:bg-slate-800"}`}
          >
            <Users className="w-4 h-4 mr-2" /> 全站過濾 (雙榜)
          </button>
          <button
            onClick={() => setActiveTab("userBehavior")}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center whitespace-nowrap ${activeTab === "userBehavior" ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" : "bg-slate-900/50 text-slate-400 hover:bg-slate-800"}`}
          >
            <Activity className="w-4 h-4 mr-2" /> 使用者行為追蹤
          </button>
        </div>

        {/* Content Area */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-6 min-h-[400px]">
          {/* Tab 1: Submission */}
          {activeTab === "submission" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex gap-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="輸入投稿 ID 或是稿件標題 (例如: 馬爾地夫)"
                  className="flex-grow bg-slate-950/50 border border-slate-700 text-white px-5 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <button
                  onClick={() => fetchSubmission()}
                  disabled={isLoading}
                  className="bg-rose-600 hover:bg-rose-500 text-white px-6 rounded-xl font-bold transition-all flex items-center shadow-lg shadow-rose-500/20"
                >
                  <Search className="w-5 h-5 mr-2" /> 搜尋
                </button>
              </div>

              {submissionData && (
                <div className="space-y-4">
                  {submissionData.matches &&
                  submissionData.matches.length > 0 ? (
                    <>
                      {submissionData.matches.length > 1 && (
                        <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl mb-4">
                          <p className="text-sm text-slate-400 mb-3">
                            找到多筆相關稿件，請點擊切換查看：
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {submissionData.matches.map((m: any) => (
                              <button
                                key={m.id}
                                onClick={() => fetchSubmission(m.id)}
                                className={`px-4 py-2 rounded-lg text-sm transition-all ${submissionData.selectedId === m.id ? "bg-rose-500 text-white shadow-md" : "bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-700"}`}
                              >
                                {m.title} ({m.id})
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-rose-300">
                            總共投票數：{submissionData.total} 票
                          </h3>
                          <p className="text-sm text-rose-200/60 mt-1">
                            目前顯示稿件：{submissionData.selectedTitle} (ID:{" "}
                            {submissionData.selectedId})
                          </p>
                        </div>
                      </div>

                      {submissionData.ipStats && (
                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl overflow-hidden mt-6 animate-in fade-in slide-in-from-top-4 duration-500">
                          <button
                            onClick={() =>
                              setIsSubmissionSummaryOpen(
                                !isSubmissionSummaryOpen,
                              )
                            }
                            className="w-full p-4 flex items-center justify-between hover:bg-rose-500/10 transition-colors"
                          >
                            <div className="flex items-center">
                              <h3 className="text-lg font-bold text-rose-300">
                                📊 稿件投票來源統計
                              </h3>
                            </div>
                            {isSubmissionSummaryOpen ? (
                              <ChevronUp className="w-5 h-5 text-rose-300" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-rose-300" />
                            )}
                          </button>

                          {isSubmissionSummaryOpen && (
                            <div className="p-6 border-t border-rose-500/20 bg-slate-900/30 space-y-8">
                              <div>
                                <h4 className="text-rose-200 font-bold mb-4 flex items-center">
                                  <span className="bg-rose-500/20 p-1.5 rounded-lg mr-2">
                                    🥇
                                  </span>{" "}
                                  狂熱 IP 排行榜
                                </h4>
                                <div className="flex flex-wrap gap-3">
                                  {submissionData.ipStats.map(
                                    (item: any, idx: number) => (
                                      <div
                                        key={idx}
                                        className="bg-slate-800/50 border border-slate-700 px-4 py-2 rounded-lg flex items-center space-x-3 hover:border-rose-500/50 transition-colors"
                                      >
                                        <span className="font-mono text-slate-300 text-sm">
                                          {item.ip}
                                        </span>
                                        <span className="bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded text-xs font-bold">
                                          {item.count} 票
                                        </span>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                              <div>
                                <h4 className="text-rose-200 font-bold mb-4 flex items-center">
                                  <span className="bg-rose-500/20 p-1.5 rounded-lg mr-2">
                                    📅
                                  </span>{" "}
                                  每日戰況明細
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {submissionData.dateStats.map(
                                    (day: any, idx: number) => (
                                      <div
                                        key={idx}
                                        className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 hover:border-rose-500/50 transition-colors"
                                      >
                                        <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-700">
                                          <span className="font-bold text-slate-200">
                                            {day.date}
                                          </span>
                                          <span className="bg-rose-500 text-white text-xs font-bold px-2 py-1 rounded-md">
                                            單日共 {day.total} 票
                                          </span>
                                        </div>
                                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-2">
                                          {day.ips.map(
                                            (ipData: any, i: number) => (
                                              <div
                                                key={i}
                                                className="flex justify-between text-sm items-center"
                                              >
                                                <span className="font-mono text-slate-400 text-xs">
                                                  {ipData.ip}
                                                </span>
                                                <span className="text-rose-300/80 font-mono text-xs">
                                                  {ipData.count} 票
                                                </span>
                                              </div>
                                            ),
                                          )}
                                        </div>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="overflow-x-auto rounded-xl border border-slate-800 mt-6">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-slate-800 text-slate-300">
                            <tr>
                              <th className="px-4 py-3">時間</th>
                              <th className="px-4 py-3">IP</th>
                              <th className="px-4 py-3">用戶名</th>
                              <th className="px-4 py-3">User ID</th>
                              <th className="px-4 py-3">Email</th>
                              <th className="px-4 py-3 w-1/3">裝置</th>
                            </tr>
                          </thead>
                          <tbody>
                            {submissionData.details.map((d: any, i: number) => (
                              <tr
                                key={i}
                                className="border-b border-slate-800 hover:bg-slate-800/50"
                              >
                                <td className="px-4 py-3 whitespace-nowrap text-slate-400">
                                  {d.time}
                                </td>
                                <td className="px-4 py-3 font-mono text-rose-200">
                                  {d.ip}
                                </td>
                                <td className="px-4 py-3">{d.userName}</td>
                                <td className="px-4 py-3 text-slate-400">
                                  {d.userId}
                                </td>
                                <td className="px-4 py-3 text-slate-400">
                                  {d.email}
                                </td>
                                <td
                                  className="px-4 py-3 text-xs text-slate-500 truncate max-w-xs"
                                  title={d.device}
                                >
                                  {d.device}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-xl text-center text-slate-400">
                      找不到符合條件的稿件喔！
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: IP */}
          {activeTab === "ip" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex gap-4">
                <input
                  type="text"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  placeholder="輸入 IP 地址 (例如: 123.205.139.64)"
                  className="flex-grow bg-slate-950/50 border border-slate-700 text-white px-5 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  onClick={fetchIp}
                  disabled={isLoading}
                  className="bg-orange-600 hover:bg-orange-500 text-white px-6 rounded-xl font-bold transition-all flex items-center shadow-lg shadow-orange-500/20"
                >
                  <Search className="w-5 h-5 mr-2" /> 搜尋
                </button>
              </div>

              {ipData && (
                <div className="space-y-4">
                  {ipData.summary && ipData.summary.length > 0 && (
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl overflow-hidden mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
                      <button
                        onClick={() => setIsSummaryOpen(!isSummaryOpen)}
                        className="w-full p-4 flex items-center justify-between hover:bg-orange-500/10 transition-colors"
                      >
                        <div className="flex items-center">
                          <h3 className="text-lg font-bold text-orange-300">
                            📊 該 IP 投票統計摘要
                          </h3>
                        </div>
                        {isSummaryOpen ? (
                          <ChevronUp className="w-5 h-5 text-orange-300" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-orange-300" />
                        )}
                      </button>

                      {isSummaryOpen && (
                        <div className="p-4 border-t border-orange-500/20 bg-slate-900/30">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {ipData.summary.map((item: any, idx: number) => (
                              <div
                                key={idx}
                                className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 hover:border-orange-500/50 transition-colors"
                              >
                                <div className="flex justify-between items-start mb-3">
                                  <h4 className="font-bold text-slate-200 line-clamp-2 pr-2">
                                    {item.title} (ID: {item.id})
                                  </h4>
                                  <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-md whitespace-nowrap">
                                    總計 {item.totalVotes} 票
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  {Object.entries(item.dates).map(
                                    ([date, count]: any) => (
                                      <div
                                        key={date}
                                        className="flex justify-between text-sm text-slate-400 border-b border-slate-700/50 pb-1 last:border-0"
                                      >
                                        <span>{date}</span>
                                        <span className="font-mono text-orange-200">
                                          {count} 票
                                        </span>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl">
                    <h3 className="text-xl font-bold text-orange-300">
                      該 IP 總行為數：{ipData.total} 次
                    </h3>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-800 text-slate-300">
                        <tr>
                          <th className="px-4 py-3">時間</th>
                          <th className="px-4 py-3">動作 (Action)</th>
                          <th className="px-4 py-3">稿件 ID</th>
                          <th className="px-4 py-3">稿件標題</th>
                          <th className="px-4 py-3">User ID</th>
                          <th className="px-4 py-3">Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ipData.activities.map((d: any, i: number) => (
                          <tr
                            key={i}
                            className="border-b border-slate-800 hover:bg-slate-800/50"
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-slate-400">
                              {d["Date"]}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 rounded text-xs ${d["Action"] === "vote" ? "bg-orange-500/20 text-orange-300" : "bg-slate-700 text-slate-300"}`}
                              >
                                {d["Action"]}
                              </span>
                            </td>
                            <td className="px-4 py-3">{d["Submission ID"]}</td>
                            <td className="px-4 py-3 text-slate-300 truncate max-w-xs">
                              {d["Submission Title"]}
                            </td>
                            <td className="px-4 py-3 text-slate-400">
                              {d["User ID"]}
                            </td>
                            <td className="px-4 py-3 text-slate-400">
                              {d["User email"]}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Abnormal */}
          {activeTab === "abnormal" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {isLoading ? (
                <div className="py-12 text-center text-slate-400 animate-pulse">
                  正在為您運算龐大數據...🕵️‍♀️
                </div>
              ) : abnormalData ? (
                <div className="space-y-6">
                  <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-2xl flex items-center">
                    <ShieldAlert className="w-12 h-12 text-red-500 mr-4" />
                    <div>
                      <h2 className="text-2xl font-bold text-red-400">
                        總計異常灌票：{abnormalData.totalAbnormalVotes} 票
                      </h2>
                      <p className="text-red-300/70 text-sm mt-1">
                        規則：同一天、同 IP、同裝置、同分類 (男神/女神) 超過 10
                        票，多出來的即算作異常票數。
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-800 text-slate-300">
                        <tr>
                          <th className="px-4 py-3">日期</th>
                          <th className="px-4 py-3">嫌疑 IP</th>
                          <th className="px-4 py-3">類別</th>
                          <th className="px-4 py-3 text-center text-red-400 font-bold">
                            單日投票數
                          </th>
                          <th className="px-4 py-3 w-1/3">裝置特徵</th>
                        </tr>
                      </thead>
                      <tbody>
                        {abnormalData.abnormalGroups.map(
                          (g: any, i: number) => (
                            <tr
                              key={i}
                              className="border-b border-slate-800 hover:bg-slate-800/50"
                            >
                              <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                                {g.date}
                              </td>
                              <td className="px-4 py-3 font-mono text-orange-300">
                                {g.ip}
                              </td>
                              <td className="px-4 py-3">
                                <span className="bg-slate-700 px-2 py-1 rounded text-xs">
                                  {g.category}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-red-400">
                                {g.count}
                              </td>
                              <td
                                className="px-4 py-3 text-xs text-slate-500 truncate max-w-xs"
                                title={g.device}
                              >
                                {g.device}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Tab 4: Filter Single */}
          {activeTab === "filterSingle" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row gap-4">
                <input
                  type="text"
                  placeholder="輸入稿件 ID 或名稱（支援模糊搜尋）..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchFilterSingle()}
                  className="flex-1 bg-slate-900/80 border border-slate-700 rounded-xl px-6 py-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
                <button
                  onClick={() => fetchFilterSingle()}
                  disabled={isLoading}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2" /> 異常過濾
                    </>
                  )}
                </button>
              </div>

              {filterProgress && (
                <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl mt-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-emerald-400 font-bold text-sm flex items-center">
                      <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin mr-2"></div>
                      正在以光速驗證信箱真實性...
                    </span>
                    <span className="text-emerald-500/70 font-mono text-xs">
                      {filterProgress.current} / {filterProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 mb-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(2, (filterProgress.current / filterProgress.total) * 100)}%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-slate-500 text-xs font-mono truncate">
                    目前檢查：{filterProgress.checking}
                  </p>
                </div>
              )}

              {filterSingleData && (
                <div className="space-y-4 mt-6">
                  {filterSingleData.matches &&
                  filterSingleData.matches.length > 0 ? (
                    <>
                      {filterSingleData.matches.length > 1 && (
                        <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl mb-4">
                          <p className="text-sm text-slate-400 mb-3">
                            找到多筆相關稿件，請點擊切換查看：
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {filterSingleData.matches.map((m: any) => (
                              <button
                                key={m.id}
                                onClick={() => fetchFilterSingle(m.id)}
                                className={`px-4 py-2 rounded-lg text-sm transition-all ${filterSingleData.selectedId === m.id ? "bg-emerald-500 text-white shadow-md" : "bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-700"}`}
                              >
                                {m.title} ({m.id})
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Dashboard Card */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700"></div>
                          <p className="text-sm text-slate-400 mb-1">
                            包含假信箱與灌票的
                          </p>
                          <h3 className="text-4xl font-black text-slate-300">
                            {filterSingleData.totalOriginal}{" "}
                            <span className="text-lg font-medium text-slate-500">
                              票
                            </span>
                          </h3>
                        </div>
                        <div className="bg-emerald-500/10 border border-emerald-500/30 p-6 rounded-xl relative overflow-hidden group flex flex-col justify-between">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700"></div>
                          <div className="flex justify-between items-start z-10 relative">
                            <div>
                              <p className="text-sm text-emerald-200/60 mb-1 font-bold">
                                ✨ 剔除無效票後的最終成績
                              </p>
                              <h3 className="text-4xl font-black text-emerald-400 drop-shadow-md">
                                {includeInvalidEmails
                                  ? filterSingleData.finalValid +
                                    (filterSingleData.dailyStats?.reduce(
                                      (sum: number, day: any) =>
                                        sum + day.emailDeducted,
                                      0,
                                    ) || 0)
                                  : filterSingleData.finalValid}{" "}
                                <span className="text-lg font-medium text-emerald-500/70">
                                  真票
                                </span>
                              </h3>
                            </div>
                            <label className="flex items-center space-x-2 bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-700 cursor-pointer hover:bg-slate-800 transition-colors">
                              <input
                                type="checkbox"
                                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-800 border-slate-600"
                                checked={includeInvalidEmails}
                                onChange={(e) =>
                                  setIncludeInvalidEmails(e.target.checked)
                                }
                              />
                              <span className="text-sm text-slate-300 font-medium whitespace-nowrap">
                                加回無效信箱
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl overflow-hidden mt-6">
                        <button
                          onClick={() =>
                            setIsFilterSummaryOpen(!isFilterSummaryOpen)
                          }
                          className="w-full p-4 flex items-center justify-between hover:bg-emerald-500/10 transition-colors"
                        >
                          <div className="flex items-center">
                            <h3 className="text-lg font-bold text-emerald-400">
                              📊 每日淨化明細
                            </h3>
                          </div>
                          {isFilterSummaryOpen ? (
                            <ChevronUp className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-emerald-400" />
                          )}
                        </button>

                        {isFilterSummaryOpen && (
                          <div className="p-6 border-t border-emerald-500/10 bg-slate-900/50">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {filterSingleData.dailyStats.map(
                                (day: any, idx: number) => {
                                  const hasDeductions =
                                    day.ipDeducted > 0 || day.emailDeducted > 0;
                                  return (
                                    <div
                                      key={idx}
                                      className={`border rounded-xl overflow-hidden transition-all ${hasDeductions ? "bg-slate-800/80 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.1)] scale-[1.02] z-10 relative" : "bg-slate-900 border-slate-700"}`}
                                    >
                                      <div
                                        className={`${hasDeductions ? "bg-rose-500/20 border-rose-500/30" : "bg-slate-800 border-slate-700"} px-4 py-3 border-b flex justify-between items-center`}
                                      >
                                        <span
                                          className={`font-bold ${hasDeductions ? "text-rose-200" : "text-slate-200"}`}
                                        >
                                          {hasDeductions && "⚠️ "} {day.date}
                                        </span>
                                        <span
                                          className={`text-xs ${hasDeductions ? "text-rose-300/80" : "text-slate-400"}`}
                                        >
                                          原 {day.originalCount} 票
                                        </span>
                                      </div>
                                      <div className="p-4 space-y-4">
                                        <div
                                          className={
                                            day.ipDeducted === 0
                                              ? "opacity-50 grayscale"
                                              : ""
                                          }
                                        >
                                          <div className="flex justify-between items-end mb-2">
                                            <span className="text-sm font-bold text-orange-400">
                                              ❌ 異常 IP 灌票
                                            </span>
                                            <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded font-mono">
                                              扣 {day.ipDeducted} 票
                                            </span>
                                          </div>
                                          {day.ipDeducted > 0 && (
                                            <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                                              {Object.entries(
                                                day.ipDetails,
                                              ).map(([ip, count]: any) => (
                                                <div
                                                  key={ip}
                                                  className="flex justify-between text-xs"
                                                >
                                                  <span className="font-mono text-slate-400">
                                                    {ip}
                                                  </span>
                                                  <span className="text-orange-500/90 font-bold">
                                                    -{count}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>

                                        <div
                                          className={`pt-3 border-t ${day.emailDeducted === 0 ? "border-slate-800 opacity-50 grayscale" : "border-rose-500/20"}`}
                                        >
                                          <div className="flex justify-between items-end mb-2">
                                            <span className="text-sm font-bold text-rose-400">
                                              ✉️ 免洗/無效信箱
                                            </span>
                                            <span className="text-xs bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded font-mono">
                                              扣 {day.emailDeducted} 票
                                            </span>
                                          </div>
                                          {day.emailDeducted > 0 && (
                                            <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                                              {day.invalidEmails.map(
                                                (email: string, i: number) => (
                                                  <div
                                                    key={i}
                                                    className="text-xs font-mono text-rose-300/70 truncate"
                                                    title={email}
                                                  >
                                                    {email}
                                                  </div>
                                                ),
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                },
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-xl text-center text-slate-400">
                      找不到符合條件的稿件喔！
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab 5: Filter All (Dual Board) */}
          {activeTab === "filterAll" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <button
                  onClick={fetchFilterAll}
                  disabled={isLoading}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center disabled:opacity-50 w-full md:w-auto"
                >
                  {isLoading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Activity className="w-5 h-5 mr-2" /> 開始全站異常過濾
                    </>
                  )}
                </button>

                {filterAllData && (
                  <div className="flex items-center gap-4 flex-1 justify-end w-full">
                    {saveAllMessage && (
                      <span className="text-sm font-bold text-cyan-300 animate-pulse bg-cyan-900/50 px-4 py-2 rounded-lg">
                        {saveAllMessage}
                      </span>
                    )}
                    <button
                      onClick={saveFilterAll}
                      disabled={isSavingAll}
                      className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-4 rounded-xl font-bold transition-all shadow-lg shadow-purple-500/25 flex items-center justify-center disabled:opacity-50"
                    >
                      {isSavingAll ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-5 h-5 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                          />
                        </svg>
                      )}
                      儲存結果至資料庫
                    </button>
                  </div>
                )}
              </div>

              {filterAllProgress && (
                <div className="bg-slate-900 border border-cyan-500/30 p-4 rounded-xl mt-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-cyan-400 font-bold text-sm flex items-center">
                      <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mr-2"></div>
                      正在全站掃描過濾... (這可能會花一點時間)
                    </span>
                    <span className="text-cyan-500/70 font-mono text-xs">
                      {filterAllProgress.current} / {filterAllProgress.total}{" "}
                      篇稿件
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 mb-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-blue-400 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(2, (filterAllProgress.current / filterAllProgress.total) * 100)}%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-slate-500 text-xs font-mono truncate">
                    目前檢查：{filterAllProgress.checking}
                  </p>
                </div>
              )}

              {filterAllData && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                  {/* Male God */}
                  <div className="bg-blue-900/10 border border-blue-500/30 rounded-xl overflow-hidden shadow-lg shadow-blue-900/20">
                    <div className="bg-gradient-to-r from-blue-900/50 to-blue-800/30 p-4 border-b border-blue-500/30 flex justify-between items-center">
                      <h3 className="text-xl font-bold text-blue-300 flex items-center">
                        <span className="text-2xl mr-2">🤴</span> 男神排行榜
                      </h3>
                      <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-1 rounded font-mono">
                        ID: 1785
                      </span>
                    </div>
                    <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                      {filterAllData
                        .filter((d) => d.contestId === "1785")
                        .map((item, index) => {
                          const hasAbnormal =
                            item.totalOriginal > item.finalValid;
                          const isExpanded = !!expandedSubmissions[item.id];
                          return (
                            <div
                              key={item.id}
                              className={`bg-slate-900/80 border p-4 rounded-xl flex flex-col transition-colors ${hasAbnormal ? "border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.1)]" : "border-slate-700/80 hover:bg-slate-800"}`}
                            >
                              <div
                                className="flex items-center justify-between cursor-pointer"
                                onClick={() => toggleSubmissionExpand(item.id)}
                              >
                                <div className="flex items-center gap-4">
                                  <span className="text-2xl font-black text-blue-500/40 w-8 text-center">
                                    {index + 1}
                                  </span>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p
                                        className="font-bold text-slate-200 line-clamp-1"
                                        title={item.title}
                                      >
                                        {item.title}
                                      </p>
                                      {hasAbnormal && (
                                        <span className="bg-rose-500/20 text-rose-400 text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap border border-rose-500/30">
                                          ⚠️ 異常
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-500 font-mono mt-1">
                                      ID: {item.id}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right flex items-center gap-4">
                                  <div>
                                    <p className="text-2xl font-black text-emerald-400 drop-shadow-sm">
                                      {item.finalValid}
                                    </p>
                                    {hasAbnormal ? (
                                      <p className="text-xs text-rose-500/70 line-through">
                                        原 {item.totalOriginal}
                                      </p>
                                    ) : (
                                      <p className="text-xs text-slate-500">
                                        原 {item.totalOriginal}
                                      </p>
                                    )}
                                  </div>
                                  {isExpanded ? (
                                    <ChevronUp className="w-5 h-5 text-slate-500" />
                                  ) : (
                                    <ChevronDown className="w-5 h-5 text-slate-500" />
                                  )}
                                </div>
                              </div>

                              {/* Expanded Details */}
                              {isExpanded && item.dailyStats && (
                                <div
                                  className="mt-4 pt-4 border-t border-slate-700/50 space-y-3 cursor-default"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {item.dailyStats.map(
                                    (day: any, idx: number) => {
                                      const dayHasDeductions =
                                        day.ipDeducted > 0 ||
                                        day.emailDeducted > 0;
                                      if (!dayHasDeductions) return null;
                                      return (
                                        <div
                                          key={idx}
                                          className="bg-slate-950/50 border border-slate-800 rounded-lg p-3 text-sm"
                                        >
                                          <div className="font-bold text-slate-300 mb-2">
                                            {day.date}
                                          </div>
                                          <div className="grid grid-cols-2 gap-4">
                                            {day.ipDeducted > 0 && (
                                              <div>
                                                <span className="text-xs font-bold text-orange-400">
                                                  ❌ IP 灌票 ({day.ipDeducted})
                                                </span>
                                                <div className="mt-1 space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                                  {Object.entries(
                                                    day.ipDetails,
                                                  ).map(([ip, count]: any) => (
                                                    <div
                                                      key={ip}
                                                      className="flex justify-between text-[10px]"
                                                    >
                                                      <span className="font-mono text-slate-500">
                                                        {ip}
                                                      </span>
                                                      <span className="text-orange-500/70">
                                                        -{count}
                                                      </span>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                            {day.emailDeducted > 0 && (
                                              <div>
                                                <span className="text-xs font-bold text-rose-400">
                                                  ✉️ 異常信箱 (
                                                  {day.emailDeducted})
                                                </span>
                                                <div className="mt-1 space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                                  {day.invalidEmails.map(
                                                    (
                                                      email: string,
                                                      i: number,
                                                    ) => (
                                                      <div
                                                        key={i}
                                                        className="text-[10px] font-mono text-rose-300/70 truncate"
                                                        title={email}
                                                      >
                                                        {email}
                                                      </div>
                                                    ),
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    },
                                  )}
                                  {item.dailyStats.every(
                                    (d: any) =>
                                      d.ipDeducted === 0 &&
                                      d.emailDeducted === 0,
                                  ) && (
                                    <div className="text-center text-slate-500 text-xs py-2">
                                      完全無異常紀錄 ✨
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      {filterAllData.filter((d) => d.contestId === "1785")
                        .length === 0 && (
                        <div className="text-center text-slate-500 py-8">
                          無男神相關稿件資料
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Female God */}
                  <div className="bg-pink-900/10 border border-pink-500/30 rounded-xl overflow-hidden shadow-lg shadow-pink-900/20">
                    <div className="bg-gradient-to-r from-pink-900/50 to-pink-800/30 p-4 border-b border-pink-500/30 flex justify-between items-center">
                      <h3 className="text-xl font-bold text-pink-300 flex items-center">
                        <span className="text-2xl mr-2">👸</span> 女神排行榜
                      </h3>
                      <span className="bg-pink-500/20 text-pink-300 text-xs px-2 py-1 rounded font-mono">
                        ID: 1647
                      </span>
                    </div>
                    <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                      {filterAllData
                        .filter((d) => d.contestId === "1647")
                        .map((item, index) => {
                          const hasAbnormal =
                            item.totalOriginal > item.finalValid;
                          const isExpanded = !!expandedSubmissions[item.id];
                          return (
                            <div
                              key={item.id}
                              className={`bg-slate-900/80 border p-4 rounded-xl flex flex-col transition-colors ${hasAbnormal ? "border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.1)]" : "border-slate-700/80 hover:bg-slate-800"}`}
                            >
                              <div
                                className="flex items-center justify-between cursor-pointer"
                                onClick={() => toggleSubmissionExpand(item.id)}
                              >
                                <div className="flex items-center gap-4">
                                  <span className="text-2xl font-black text-pink-500/40 w-8 text-center">
                                    {index + 1}
                                  </span>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p
                                        className="font-bold text-slate-200 line-clamp-1"
                                        title={item.title}
                                      >
                                        {item.title}
                                      </p>
                                      {hasAbnormal && (
                                        <span className="bg-rose-500/20 text-rose-400 text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap border border-rose-500/30">
                                          ⚠️ 異常
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-500 font-mono mt-1">
                                      ID: {item.id}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right flex items-center gap-4">
                                  <div>
                                    <p className="text-2xl font-black text-emerald-400 drop-shadow-sm">
                                      {item.finalValid}
                                    </p>
                                    {hasAbnormal ? (
                                      <p className="text-xs text-rose-500/70 line-through">
                                        原 {item.totalOriginal}
                                      </p>
                                    ) : (
                                      <p className="text-xs text-slate-500">
                                        原 {item.totalOriginal}
                                      </p>
                                    )}
                                  </div>
                                  {isExpanded ? (
                                    <ChevronUp className="w-5 h-5 text-slate-500" />
                                  ) : (
                                    <ChevronDown className="w-5 h-5 text-slate-500" />
                                  )}
                                </div>
                              </div>

                              {/* Expanded Details */}
                              {isExpanded && item.dailyStats && (
                                <div
                                  className="mt-4 pt-4 border-t border-slate-700/50 space-y-3 cursor-default"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {item.dailyStats.map(
                                    (day: any, idx: number) => {
                                      const dayHasDeductions =
                                        day.ipDeducted > 0 ||
                                        day.emailDeducted > 0;
                                      if (!dayHasDeductions) return null;
                                      return (
                                        <div
                                          key={idx}
                                          className="bg-slate-950/50 border border-slate-800 rounded-lg p-3 text-sm"
                                        >
                                          <div className="font-bold text-slate-300 mb-2">
                                            {day.date}
                                          </div>
                                          <div className="grid grid-cols-2 gap-4">
                                            {day.ipDeducted > 0 && (
                                              <div>
                                                <span className="text-xs font-bold text-orange-400">
                                                  ❌ IP 灌票 ({day.ipDeducted})
                                                </span>
                                                <div className="mt-1 space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                                  {Object.entries(
                                                    day.ipDetails,
                                                  ).map(([ip, count]: any) => (
                                                    <div
                                                      key={ip}
                                                      className="flex justify-between text-[10px]"
                                                    >
                                                      <span className="font-mono text-slate-500">
                                                        {ip}
                                                      </span>
                                                      <span className="text-orange-500/70">
                                                        -{count}
                                                      </span>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                            {day.emailDeducted > 0 && (
                                              <div>
                                                <span className="text-xs font-bold text-rose-400">
                                                  ✉️ 異常信箱 (
                                                  {day.emailDeducted})
                                                </span>
                                                <div className="mt-1 space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                                  {day.invalidEmails.map(
                                                    (
                                                      email: string,
                                                      i: number,
                                                    ) => (
                                                      <div
                                                        key={i}
                                                        className="text-[10px] font-mono text-rose-300/70 truncate"
                                                        title={email}
                                                      >
                                                        {email}
                                                      </div>
                                                    ),
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    },
                                  )}
                                  {item.dailyStats.every(
                                    (d: any) =>
                                      d.ipDeducted === 0 &&
                                      d.emailDeducted === 0,
                                  ) && (
                                    <div className="text-center text-slate-500 text-xs py-2">
                                      完全無異常紀錄 ✨
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      {filterAllData.filter((d) => d.contestId === "1647")
                        .length === 0 && (
                        <div className="text-center text-slate-500 py-8">
                          無女神相關稿件資料
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 6: User Behavior Tracker */}
          {activeTab === "userBehavior" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="輸入姓名、Email、USER ID、帳號或 IP..."
                  className="flex-1 bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  value={userBehaviorQuery}
                  onChange={(e) => setUserBehaviorQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchUserBehavior()}
                />
                <button
                  onClick={fetchUserBehavior}
                  disabled={isLoading || !userBehaviorQuery}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/25 flex items-center disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    "全面追蹤"
                  )}
                </button>
              </div>

              {userBehaviorData && (
                <div className="bg-indigo-900/10 border border-indigo-500/30 rounded-xl overflow-hidden shadow-lg shadow-indigo-900/20">
                  <div className="bg-gradient-to-r from-indigo-900/50 to-indigo-800/30 p-4 border-b border-indigo-500/30 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-indigo-300 flex items-center">
                      <span className="text-2xl mr-2"></span> 行為追蹤報告
                    </h3>
                    <span className="bg-indigo-500/20 text-indigo-300 text-sm px-3 py-1 rounded-full font-mono">
                      共找到 {userBehaviorData.length} 筆紀錄
                    </span>
                  </div>

                  {userBehaviorData.length > 0 ? (
                    <div className="p-6 relative">
                      {/* Timeline Line */}
                      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-indigo-500/20"></div>

                      <div className="space-y-6 relative">
                        {userBehaviorData.map((row, index) => (
                          <div key={index} className="flex gap-4">
                            {/* Timeline Node */}
                            <div className="w-4 h-4 rounded-full bg-indigo-500 border-4 border-slate-900 shadow-[0_0_10px_rgba(99,102,241,0.5)] mt-1 z-10 shrink-0 relative -left-[7px]"></div>

                            {/* Content Card */}
                            <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-4 flex-1 hover:border-indigo-500/50 hover:bg-slate-800 transition-all">
                              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div>
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className="text-indigo-400 font-bold">
                                      {row["Date"]}
                                    </span>
                                    <span className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded uppercase tracking-wider font-bold">
                                      {row["Action"]}
                                    </span>
                                  </div>

                                  <div className="space-y-1 mt-3">
                                    {row["Submission Title"] && (
                                      <p className="text-slate-200">
                                        <span className="text-slate-500 text-sm mr-2">
                                          目標稿件:
                                        </span>
                                        <span className="font-bold text-blue-300">
                                          {row["Submission Title"]}
                                        </span>
                                      </p>
                                    )}
                                    {row["User name"] && (
                                      <p className="text-slate-300 text-sm">
                                        <span className="text-slate-500 mr-2">
                                          姓名:
                                        </span>
                                        {row["User name"]}
                                      </p>
                                    )}
                                    {row["User email"] && (
                                      <p className="text-slate-300 text-sm">
                                        <span className="text-slate-500 mr-2">
                                          Email:
                                        </span>
                                        {row["User email"]}
                                      </p>
                                    )}
                                    {(row["User login"] || row["User ID"]) && (
                                      <p className="text-slate-400 text-sm font-mono">
                                        <span className="text-slate-500 font-sans mr-2">
                                          帳號/ID:
                                        </span>
                                        {row["User login"]} / {row["User ID"]}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <div className="inline-flex items-center bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                                    <span className="text-slate-500 text-xs mr-2">
                                      IP
                                    </span>
                                    <span className="text-orange-400 font-mono text-sm">
                                      {row["IP"]}
                                    </span>
                                  </div>
                                  <div
                                    className="text-xs text-slate-500 mt-2 max-w-[200px] truncate"
                                    title={row["Browser"]}
                                  >
                                    {row["Browser"]}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-12 text-center text-slate-500">
                      <div className="text-4xl mb-4">👻</div>
                      查無任何相關行為紀錄
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
