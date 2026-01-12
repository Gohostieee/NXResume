import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import puppeteer from "puppeteer-core";
import { PDFDocument } from "pdf-lib";

type Browser = Awaited<ReturnType<typeof puppeteer.connect>>;
type Page = Awaited<ReturnType<Browser["newPage"]>>;

export const runtime = "nodejs";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generatePDFWithRetry(
  appUrl: string,
  id: string,
  resumeData: unknown,
  retryCount = 0
): Promise<Buffer> {
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    // Connect to Browserless.io
    const browserlessUrl = `${process.env.CHROME_URL}?token=${process.env.CHROME_TOKEN}`;
    browser = await puppeteer.connect({ browserWSEndpoint: browserlessUrl });

    page = await browser.newPage();

    // Set viewport for consistent rendering
    await page.setViewport({ width: 1200, height: 1600 });

    // First set up localStorage with resume data before navigating
    // We need to navigate to the domain first to set localStorage
    await page.goto(appUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });

    // Set the resume data in localStorage
    await page.evaluate((data) => {
      window.localStorage.setItem("resume", JSON.stringify(data));
    }, resumeData);

    // Now navigate to the artboard page - it will read from localStorage on load
    await page.goto(`${appUrl}/artboard/${id}?print=1`, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Wait for the page content to render
    await page.waitForSelector('[data-page="1"]', { timeout: 20000 });

    // Wait for custom font loading indicator
    await page
      .waitForFunction(
        () => {
          const indicator = document.querySelector("[data-font-loaded]");
          return indicator?.getAttribute("data-font-loaded") === "true";
        },
        { timeout: 10000 }
      )
      .catch(() => {
        // Font loading timeout - proceed anyway with fallback font
        console.warn("Font loading timeout, proceeding with fallback font");
      });

    // Move inline styles into the document head so they survive body swaps
    await page.evaluate(() => {
      const inlineStyles = Array.from(document.body.querySelectorAll("style"));
      for (const styleTag of inlineStyles) {
        document.head.appendChild(styleTag);
      }
    });

    // Ensure fonts are loaded before rendering
    await page.evaluate(() => document.fonts?.ready);

    // Give a bit more time for fonts and styles to load
    await sleep(500);

    // Get number of pages from the layout
    const numberPages = await page.evaluate(() => {
      const pages = document.querySelectorAll('[data-page]');
      return pages.length || 1;
    });

    const pagesBuffer: Buffer[] = [];

    // Process each page
    for (let index = 1; index <= numberPages; index++) {
      const pageElement = await page.$(`[data-page="${index}"]`);

      if (!pageElement) continue;

      const dimensions = await pageElement.evaluate((el) => ({
        width: el.scrollWidth,
        height: el.scrollHeight,
      }));

      // Clone this page element and render it alone
      const temporaryHtml = await page.evaluate((element: Element) => {
        const clonedElement = element.cloneNode(true) as HTMLDivElement;
        const temporaryHtml_ = document.body.innerHTML;
        document.body.innerHTML = clonedElement.outerHTML;
        return temporaryHtml_;
      }, pageElement);

      // Apply custom CSS if enabled
      const css = (resumeData as { metadata?: { css?: { visible?: boolean; value?: string } } })?.metadata?.css;
      if (css?.visible && css?.value) {
        await page.evaluate((cssValue: string) => {
          const styleTag = document.createElement("style");
          styleTag.textContent = cssValue;
          document.head.append(styleTag);
        }, css.value);
      }

      // Generate PDF for this page
      const uint8array = await page.pdf({
        width: dimensions.width,
        height: dimensions.height,
        printBackground: true,
      });
      pagesBuffer.push(Buffer.from(uint8array));

      // Restore original HTML for next page
      if (index < numberPages) {
        await page.evaluate((html: string) => {
          document.body.innerHTML = html;
        }, temporaryHtml);
      }
    }

    // Merge all pages into a single PDF using pdf-lib
    const pdf = await PDFDocument.create();

    for (const buffer of pagesBuffer) {
      const pdfDoc = await PDFDocument.load(buffer);
      const [copiedPage] = await pdf.copyPages(pdfDoc, [0]);
      pdf.addPage(copiedPage);
    }

    const pdfBytes = await pdf.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    const errorMessage = (error as Error).message || String(error);

    // Check if it's a retryable error
    const isRetryable =
      errorMessage.includes("frame was detached") ||
      errorMessage.includes("Target closed") ||
      errorMessage.includes("Session closed") ||
      errorMessage.includes("Protocol error") ||
      errorMessage.includes("WebSocket") ||
      errorMessage.includes("ECONNRESET");

    if (isRetryable && retryCount < MAX_RETRIES) {
      console.log(`PDF generation failed (attempt ${retryCount + 1}/${MAX_RETRIES}), retrying...`);
      await sleep(RETRY_DELAY * (retryCount + 1));
      return generatePDFWithRetry(appUrl, id, resumeData, retryCount + 1);
    }

    throw error;
  } finally {
    // Clean up
    try {
      if (page) await page.close().catch(() => {});
      if (browser) await browser.close().catch(() => {});
    } catch {
      // Ignore cleanup errors
    }
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get the resume from Convex
    const resume = await convex.query(api.resumes.getByIdInternal, {
      id: id as Id<"resumes">,
    });

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    // Get the user to check ownership
    const user = await convex.query(api.users.getByClerkId, {
      clerkId: clerkUserId,
    });

    // Check ownership
    if (!user || resume.userId !== user._id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Generate PDF with retry logic
    const pdfBuffer = await generatePDFWithRetry(
      appUrl,
      id,
      resume.data
    );

    // Return the PDF
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${resume.title || "resume"}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: (error as Error).message },
      { status: 500 }
    );
  }
}
