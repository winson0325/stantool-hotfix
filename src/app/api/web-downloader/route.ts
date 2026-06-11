import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import JSZip from "jszip";
import sharp from "sharp";
import { Document, Packer, Paragraph, TextRun, ImageRun } from "docx";

export const maxDuration = 60; // Next.js Vercel max duration
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const docBothElements: any[] = [];
    const docTextElements: any[] = [];
    
    const zip = new JSZip();
    let imgCounter = 1;

    // Find all h1, h2, h3, p, img
    const tags = $("h1, h2, h3, p, img");

    if (tags.length === 0) {
      return NextResponse.json({ error: "這個網頁好像找不到任何標題、段落或圖片耶，要不要換個網址試試看呢。(>_<)" }, { status: 400 });
    }

    // Process tags
    for (let i = 0; i < tags.length; i++) {
      const el = tags[i];
      const tagName = el.name.toLowerCase();

      if (['h1', 'h2', 'h3', 'p'].includes(tagName)) {
        const text = $(el).text().trim();
        if (text) {
          docBothElements.push(new Paragraph({ children: [new TextRun({ text, size: tagName === 'p' ? 24 : 32, bold: tagName !== 'p' })] }));
          docTextElements.push(new Paragraph({ children: [new TextRun({ text, size: tagName === 'p' ? 24 : 32, bold: tagName !== 'p' })] }));
        }
      } else if (tagName === 'img') {
        let imgUrl = $(el).attr('data-breeze') || 
                     $(el).attr('data-src') || 
                     $(el).attr('data-original') || 
                     $(el).attr('data-lazy-src') || 
                     $(el).attr('src');
        
        if (imgUrl && !imgUrl.startsWith('data:image')) {
          try {
            const fullImgUrl = new URL(imgUrl, url).href;
            const imgRes = await fetch(fullImgUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": url
              }
            });
            if (imgRes.ok) {
              const arrayBuffer = await imgRes.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              
              // 1. Add to ZIP
              let baseFilename = imgUrl.split('/').pop()?.split('?')[0];
              if (!baseFilename || baseFilename.length < 3) {
                baseFilename = `image_${imgCounter}.jpg`;
              }
              const zipFilename = `${String(imgCounter).padStart(2, '0')}_${baseFilename}`;
              zip.file(zipFilename, buffer);

              // 2. Add to docBoth (convert if needed)
              let finalImageBuffer: any = buffer;
              try {
                const metadata = await sharp(buffer).metadata();
                if (metadata.format === 'webp' || !['jpeg', 'png'].includes(metadata.format || '')) {
                   finalImageBuffer = (await sharp(buffer).png().toBuffer()) as any;
                }
                
                const width = 400;
                const ratio = (metadata.width && metadata.height) ? metadata.height / metadata.width : 0.75;
                const height = Math.round(width * ratio);

                docBothElements.push(new Paragraph({
                  children: [
                    new ImageRun({
                      data: finalImageBuffer,
                      transformation: { width, height }
                    })
                  ]
                }));
              } catch (e) {
                // Fallback for docx image insertion failure
              }

              imgCounter++;
            }
          } catch (err) {
            // ignore fetch errors for individual images
          }
        }
      }
    }

    const docBoth = new Document({ sections: [{ properties: {}, children: docBothElements }] });
    const docText = new Document({ sections: [{ properties: {}, children: docTextElements }] });

    const bothBuffer = await Packer.toBuffer(docBoth);
    const textBuffer = await Packer.toBuffer(docText);
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    return NextResponse.json({
      both_docx: bothBuffer.toString("base64"),
      text_docx: textBuffer.toString("base64"),
      images_zip: zipBuffer.toString("base64"),
    });

  } catch (error: any) {
    console.error("Scraper Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
