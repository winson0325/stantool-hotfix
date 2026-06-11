import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import Papa from "papaparse";
import dns from "dns";
import disposableDomains from "disposable-email-domains";

export const dynamic = 'force-dynamic';

dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const domainCache = new Map<string, boolean>();
const disposableSet = new Set(disposableDomains);

async function checkDomainMx(domain: string): Promise<boolean> {
  if (disposableSet.has(domain)) return false;
  if (domainCache.has(domain)) return domainCache.get(domain)!;
  try {
    const addresses = await dns.promises.resolveMx(domain);
    const isValid = addresses && addresses.length > 0;
    domainCache.set(domain, isValid);
    return isValid;
  } catch (e: any) {
    // If MX lookup fails (e.g. ECONNREFUSED by ISP or no MX record), 
    // fallback to checking if the domain even exists via normal lookup.
    try {
      const addr = await dns.promises.lookup(domain);
      const isValid = !!addr;
      domainCache.set(domain, isValid);
      return isValid;
    } catch (lookupErr) {
      domainCache.set(domain, false);
      return false;
    }
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, submissionId, ip } = body;
    
    // Path to CSV
    const csvPath = path.join(process.cwd(), "src", "assest", "votelog", "totalcontest-export-log-2026-06-11-140445.csv");
    
    if (!fs.existsSync(csvPath)) {
      return NextResponse.json({ error: "CSV file not found" }, { status: 404 });
    }

    const fileContent = fs.readFileSync(csvPath, "utf-8");
    
    // The CSV has `sep=;` on the first line. Papaparse might stumble if we don't handle it.
    let cleanContent = fileContent;
    if (cleanContent.startsWith("sep=;")) {
      cleanContent = cleanContent.substring(cleanContent.indexOf("\n") + 1);
    }

    const { data, errors } = Papa.parse(cleanContent, {
      header: true,
      delimiter: ";",
      skipEmptyLines: true,
    });

    if (action === "getBySubmission") {
      const { query, submissionId } = body;
      
      // Find all unique submissions matching the query (either ID or Title)
      const matchingMap = new Map<string, string>();
      data.forEach((row: any) => {
        const title = row["Submission Title"] || "";
        const sid = row["Submission ID"] || "";
        if (sid === query || title.includes(query)) {
           matchingMap.set(sid, title);
        }
      });
      
      const matches = Array.from(matchingMap.entries()).map(([id, title]) => ({ id, title }));
      
      if (matches.length === 0) {
        return NextResponse.json({ matches: [], total: 0, details: [] });
      }
      
      const targetId = submissionId || matches[0].id;

      const votes = data.filter((row: any) => row["Action"] === "vote" && row["Submission ID"] === String(targetId));
      const details = votes.map((row: any) => ({
        time: row["Date"],
        ip: row["IP"],
        device: row["Browser"],
        userName: row["User name"],
        userId: row["User ID"],
        email: row["User email"]
      }));

      const summaryByIp: Record<string, number> = {};
      const summaryByDate: Record<string, { total: number, ips: Record<string, number> }> = {};

      votes.forEach((row: any) => {
        const rowIp = row["IP"];
        const dateStr = row["Date"] ? row["Date"].split(" ")[0] : "unknown";

        summaryByIp[rowIp] = (summaryByIp[rowIp] || 0) + 1;

        if (!summaryByDate[dateStr]) {
          summaryByDate[dateStr] = { total: 0, ips: {} };
        }
        summaryByDate[dateStr].total += 1;
        summaryByDate[dateStr].ips[rowIp] = (summaryByDate[dateStr].ips[rowIp] || 0) + 1;
      });

      const ipStats = Object.entries(summaryByIp)
        .map(([ip, count]) => ({ ip, count }))
        .sort((a, b) => b.count - a.count);

      const dateStats = Object.entries(summaryByDate)
        .map(([date, data]) => ({
          date,
          total: data.total,
          ips: Object.entries(data.ips)
            .map(([ip, count]) => ({ ip, count }))
            .sort((a, b) => b.count - a.count)
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      return NextResponse.json({ 
        matches, 
        selectedId: targetId,
        selectedTitle: matchingMap.get(targetId) || "",
        total: votes.length, 
        details,
        ipStats,
        dateStats
      });

    } else if (action === "getByIp") {
      const activities = data.filter((row: any) => row["IP"] === ip);
      
      const summaryMap: Record<string, any> = {};
      
      activities.forEach((row: any) => {
        if (row["Action"] === "vote") {
          const sId = row["Submission ID"];
          const sTitle = row["Submission Title"] || "Unknown";
          const dateStr = row["Date"] ? row["Date"].split(" ")[0] : "unknown";
          
          const key = `${sId}_${sTitle}`;
          if (!summaryMap[key]) {
            summaryMap[key] = {
              title: sTitle,
              id: sId,
              totalVotes: 0,
              dates: {}
            };
          }
          
          summaryMap[key].totalVotes += 1;
          summaryMap[key].dates[dateStr] = (summaryMap[key].dates[dateStr] || 0) + 1;
        }
      });
      
      const summary = Object.values(summaryMap).sort((a: any, b: any) => b.totalVotes - a.totalVotes);

      return NextResponse.json({ total: activities.length, activities, summary });

    } else if (action === "filterSingle") {
      const query = String(body.query || "").trim();

      if (!query) {
        return NextResponse.json({ error: "No query provided" }, { status: 400 });
      }

      const matchingMap = new Map<string, string>();
      data.forEach((row: any) => {
        const title = row["Submission Title"] || "";
        const sid = row["Submission ID"] || "";
        if (sid === query || title.includes(query)) {
           matchingMap.set(sid, title);
        }
      });
      
      const matches = Array.from(matchingMap.entries()).map(([id, title]) => ({ id, title }));
      
      if (matches.length === 0) {
        return NextResponse.json({ matches: [], totalOriginal: 0, finalValid: 0 });
      }
      
      const targetId = body.submissionId || matches[0].id;
      const votes = data.filter((row: any) => row["Action"] === "vote" && row["Submission ID"] === String(targetId));

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const sendEvent = (event: string, eventData: any) => {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(eventData)}\n\n`));
          };

          try {
            const dailyStatsMap: Record<string, {
              date: string;
              originalCount: number;
              ipDeducted: number;
              emailDeducted: number;
              invalidEmails: string[];
              ipDetails: Record<string, number>;
            }> = {};

            const voteGroups: Record<string, any[]> = {};
            votes.forEach((v: any) => {
              const dateStr = v["Date"] ? v["Date"].split(" ")[0] : "unknown";
              const rowIp = v["IP"];
              const device = v["Browser"];
              const groupKey = `${dateStr}|${rowIp}|${device}`;
              if (!voteGroups[groupKey]) voteGroups[groupKey] = [];
              voteGroups[groupKey].push(v);
              
              if (!dailyStatsMap[dateStr]) {
                dailyStatsMap[dateStr] = {
                  date: dateStr,
                  originalCount: 0,
                  ipDeducted: 0,
                  emailDeducted: 0,
                  invalidEmails: [],
                  ipDetails: {}
                };
              }
              dailyStatsMap[dateStr].originalCount += 1;
            });

            const validStage1Votes: any[] = [];

            for (const [groupKey, groupVotes] of Object.entries(voteGroups)) {
              const [dateStr, rowIp] = groupKey.split("|");
              if (groupVotes.length > 10) {
                validStage1Votes.push(groupVotes[0]);
                dailyStatsMap[dateStr].ipDeducted += (groupVotes.length - 1);
                dailyStatsMap[dateStr].ipDetails[rowIp] = (dailyStatsMap[dateStr].ipDetails[rowIp] || 0) + (groupVotes.length - 1);
              } else {
                validStage1Votes.push(...groupVotes);
              }
            }

            let finalValidVotesCount = 0;
            const chunkSize = 20;

            for (let i = 0; i < validStage1Votes.length; i += chunkSize) {
              const chunk = validStage1Votes.slice(i, i + chunkSize);
              
              sendEvent("progress", {
                current: i,
                total: validStage1Votes.length,
                checking: chunk.length > 0 ? chunk[0]["User email"] : ""
              });

              await Promise.all(chunk.map(async (v) => {
                const email = String(v["User email"] || "").toLowerCase().trim();
                const dateStr = v["Date"] ? v["Date"].split(" ")[0] : "unknown";
                
                const atIndex = email.indexOf("@");
                if (atIndex <= 0) {
                  dailyStatsMap[dateStr].emailDeducted += 1;
                  dailyStatsMap[dateStr].invalidEmails.push(email);
                  return;
                }
                
                const domain = email.substring(atIndex + 1);
                const isValid = await checkDomainMx(domain);
                
                if (!isValid) {
                  dailyStatsMap[dateStr].emailDeducted += 1;
                  dailyStatsMap[dateStr].invalidEmails.push(email);
                } else {
                  finalValidVotesCount += 1;
                }
              }));
            }

            sendEvent("progress", {
              current: validStage1Votes.length,
              total: validStage1Votes.length,
              checking: "完成！"
            });

            const dailyStats = Object.values(dailyStatsMap).sort((a: any, b: any) => a.date.localeCompare(b.date));

            sendEvent("complete", { 
              matches, 
              selectedId: targetId,
              selectedTitle: matchingMap.get(targetId) || "",
              totalOriginal: votes.length, 
              finalValid: finalValidVotesCount,
              dailyStats
            });

            controller.close();
          } catch (err: any) {
            sendEvent("error", { message: err.message });
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive"
        }
      });

    } else if (action === "filterAllStream") {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const sendEvent = (event: string, eventData: any) => {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(eventData)}\n\n`));
          };

          try {
            const submissionsMap: Record<string, { id: string, title: string, contestId: string, votes: any[], finalValid: number, totalOriginal: number }> = {};
            
            data.filter((row: any) => row["Action"] === "vote").forEach((v: any) => {
              const sid = v["Submission ID"];
              if (!submissionsMap[sid]) {
                submissionsMap[sid] = {
                  id: sid,
                  title: v["Submission Title"] || "",
                  contestId: v["Contest ID"] || "",
                  votes: [],
                  finalValid: 0,
                  totalOriginal: 0
                };
              }
              submissionsMap[sid].votes.push(v);
              submissionsMap[sid].totalOriginal++;
            });

            const allSubmissions = Object.values(submissionsMap);
            let processedSubmissions = 0;

            for (const sub of allSubmissions) {
              const dailyStatsMap: Record<string, any> = {};
              const voteGroups: Record<string, any[]> = {};
              
              sub.votes.forEach(v => {
                const dateStr = v["Date"] ? v["Date"].split(" ")[0] : "unknown";
                const rowIp = v["IP"];
                const device = v["Browser"];
                const groupKey = `${dateStr}|${rowIp}|${device}`;
                if (!voteGroups[groupKey]) voteGroups[groupKey] = [];
                voteGroups[groupKey].push(v);

                if (!dailyStatsMap[dateStr]) {
                  dailyStatsMap[dateStr] = {
                    date: dateStr,
                    originalCount: 0,
                    ipDeducted: 0,
                    emailDeducted: 0,
                    invalidEmails: [],
                    ipDetails: {}
                  };
                }
                dailyStatsMap[dateStr].originalCount += 1;
              });

              const validStage1Votes: any[] = [];
              for (const [groupKey, groupVotes] of Object.entries(voteGroups)) {
                const [dateStr, rowIp] = groupKey.split("|");
                if (groupVotes.length > 10) {
                  validStage1Votes.push(groupVotes[0]);
                  dailyStatsMap[dateStr].ipDeducted += (groupVotes.length - 1);
                  dailyStatsMap[dateStr].ipDetails[rowIp] = (dailyStatsMap[dateStr].ipDetails[rowIp] || 0) + (groupVotes.length - 1);
                } else {
                  validStage1Votes.push(...groupVotes);
                }
              }

              let finalValidVotesCount = 0;
              const chunkSize = 50;
              
              for (let i = 0; i < validStage1Votes.length; i += chunkSize) {
                const chunk = validStage1Votes.slice(i, i + chunkSize);
                
                await Promise.all(chunk.map(async (v) => {
                  const email = String(v["User email"] || "").toLowerCase().trim();
                  const dateStr = v["Date"] ? v["Date"].split(" ")[0] : "unknown";

                  const atIndex = email.indexOf("@");
                  if (atIndex <= 0) {
                    dailyStatsMap[dateStr].emailDeducted += 1;
                    dailyStatsMap[dateStr].invalidEmails.push(email);
                    return;
                  }
                  
                  const domain = email.substring(atIndex + 1);
                  const isValid = await checkDomainMx(domain);
                  if (isValid) {
                    finalValidVotesCount += 1;
                  } else {
                    dailyStatsMap[dateStr].emailDeducted += 1;
                    dailyStatsMap[dateStr].invalidEmails.push(email);
                  }
                }));
              }
              
              sub.finalValid = finalValidVotesCount;
              (sub as any).dailyStats = Object.values(dailyStatsMap).sort((a: any, b: any) => a.date.localeCompare(b.date));
              processedSubmissions++;
              
              sendEvent("progress", {
                current: processedSubmissions,
                total: allSubmissions.length,
                checking: sub.title
              });
            }

            const finalResults = allSubmissions.map(s => ({
              id: s.id,
              title: s.title,
              contestId: s.contestId,
              totalOriginal: s.totalOriginal,
              finalValid: s.finalValid,
              dailyStats: Object.keys((s as any).dailyStats).length > 0 ? (s as any).dailyStats : []
            }));
            
            finalResults.sort((a, b) => b.finalValid - a.finalValid);

            sendEvent("complete", { results: finalResults });
            controller.close();
          } catch (err: any) {
            sendEvent("error", { message: err.message });
            controller.close();
          }
        }
      });
      return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" } });

    } else if (action === "saveFilterAll") {
      const fs = require("fs");
      const path = require("path");
      const targetPath = path.join(process.cwd(), "src/assest/votelog", "purified_all_results.json");
      await fs.promises.writeFile(targetPath, JSON.stringify(body.results, null, 2), "utf8");
      return NextResponse.json({ success: true, path: targetPath });

    } else if (action === "searchUserBehavior") {
      const { query } = body;
      if (!query) {
        return NextResponse.json({ error: "Missing query" }, { status: 400 });
      }
      const q = String(query).toLowerCase().trim();
      const results = data.filter((row: any) => {
        return (
          (row["IP"] && row["IP"].toLowerCase().includes(q)) ||
          (row["User email"] && row["User email"].toLowerCase().includes(q)) ||
          (row["User name"] && row["User name"].toLowerCase().includes(q)) ||
          (row["User ID"] && String(row["User ID"]).toLowerCase() === q) ||
          (row["User login"] && row["User login"].toLowerCase().includes(q))
        );
      });
      
      results.sort((a: any, b: any) => {
        const dateA = a["Date"] || "";
        const dateB = b["Date"] || "";
        return dateA.localeCompare(dateB); // Ascending order (oldest first) for chronological timeline
      });
      
      return NextResponse.json(results);

    } else if (action === "detectAbnormal") {
      const voteRows = data.filter((row: any) => row["Action"] === "vote");
      const groupMap: Record<string, number> = {};
      
      voteRows.forEach((row: any) => {
        const dateStr = row["Date"] ? row["Date"].split(" ")[0] : "";
        const rowIp = row["IP"];
        const device = row["Browser"];
        const title = row["Submission Title"] || "";
        let category = "unknown";
        if (title.includes("男神")) category = "男神";
        else if (title.includes("女神")) category = "女神";
        
        const key = `${dateStr}|${rowIp}|${device}|${category}`;
        groupMap[key] = (groupMap[key] || 0) + 1;
      });

      let totalAbnormalVotes = 0;
      const abnormalGroups: any[] = [];

      for (const [key, count] of Object.entries(groupMap)) {
        if (count > 10) {
          const invalidCount = count - 10;
          totalAbnormalVotes += invalidCount;
          const [dateStr, gIp, gDevice, gCat] = key.split("|");
          abnormalGroups.push({ date: dateStr, ip: gIp, device: gDevice, category: gCat, count, invalidCount });
        }
      }

      abnormalGroups.sort((a, b) => b.invalidCount - a.invalidCount);

      return NextResponse.json({
        totalAbnormalVotes,
        abnormalGroups
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
