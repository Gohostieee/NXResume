import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { connect } from "puppeteer-core";
import { PDFDocument } from "pdf-lib";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

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

    // Get the resume from Convex (using internal query since we handle auth ourselves)
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

    // Check ownership - compare Convex user IDs
    if (!user || resume.userId !== user._id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get browser connection settings
    const chromeUrl = process.env.CHROME_URL;
    const chromeToken = process.env.CHROME_TOKEN;

    if (!chromeUrl || !chromeToken) {
      return NextResponse.json(
        { error: "PDF generation is not configured. Please set CHROME_URL and CHROME_TOKEN." },
        { status: 500 }
      );
    }

    const browserWSEndpoint = `${chromeUrl}?token=${chromeToken}`;

    // Connect to browser
    const browser = await connect({
      browserWSEndpoint,
    });

    const page = await browser.newPage();

    // Get the app URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Navigate to the artboard page
    await page.goto(`${appUrl}/artboard/${id}`, {
      waitUntil: "domcontentloaded"
    });

    // Set the resume data via localStorage and reload
    await page.evaluate((data) => {
      window.localStorage.setItem("resume", JSON.stringify(data));
    }, resume.data);

    await Promise.all([
      page.reload({ waitUntil: "load" }),
      page.waitForSelector('[data-page="1"]', { timeout: 15_000 }),
    ]);

    // Get number of pages from the layout
    const numberPages = resume.data.metadata?.layout?.length || 1;
    const pagesBuffer: Buffer[] = [];

    // Process each page
    for (let index = 1; index <= numberPages; index++) {
      const pageElement = await page.$(`[data-page="${index}"]`);

      if (!pageElement) continue;

      const width = await pageElement.evaluate((el) => el.scrollWidth);
      const height = await pageElement.evaluate((el) => el.scrollHeight);

      // Clone this page element and render it alone
      const temporaryHtml = await page.evaluate((element: Element) => {
        const clonedElement = element.cloneNode(true) as HTMLDivElement;
        const temporaryHtml_ = document.body.innerHTML;
        document.body.innerHTML = clonedElement.outerHTML;
        return temporaryHtml_;
      }, pageElement);

      // Apply custom CSS if enabled
      const css = resume.data.metadata?.css;
      if (css?.visible && css?.value) {
        await page.evaluate((cssValue: string) => {
          const styleTag = document.createElement("style");
          styleTag.textContent = cssValue;
          document.head.append(styleTag);
        }, css.value);
      }

      // Generate PDF for this page
      const uint8array = await page.pdf({
        width,
        height,
        printBackground: true
      });
      pagesBuffer.push(Buffer.from(uint8array));

      // Restore original HTML
      await page.evaluate((html: string) => {
        document.body.innerHTML = html;
      }, temporaryHtml);
    }

    // Merge all pages into a single PDF using pdf-lib
    const pdf = await PDFDocument.create();

    for (const buffer of pagesBuffer) {
      const pdfDoc = await PDFDocument.load(buffer);
      const [copiedPage] = await pdf.copyPages(pdfDoc, [0]);
      pdf.addPage(copiedPage);
    }

    const pdfBytes = await pdf.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    // Close browser
    await page.close();
    await browser.disconnect();

    // Return the PDF
    return new NextResponse(pdfBuffer, {
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
