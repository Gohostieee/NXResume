import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string; slug: string }> }
) {
  try {
    const { username, slug } = await params;

    const resume = await convex.query(api.resumes.getPublicByUsernameSlug, {
      username,
      slug,
    });

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    return NextResponse.json(resume.data);
  } catch (error) {
    console.error("Raw resume error:", error);
    return NextResponse.json(
      { error: "Failed to load resume data" },
      { status: 500 }
    );
  }
}
