import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Default resume data structure - matches the schema from lib/schema
const defaultResumeData = {
  basics: {
    name: "",
    headline: "",
    email: "",
    phone: "",
    location: "",
    url: { label: "", href: "" },
    customFields: [],
    picture: { url: "", size: 64, aspectRatio: 1, borderRadius: 0, effects: { hidden: false, border: false, grayscale: false } },
  },
  sections: {
    summary: { id: "summary", name: "Summary", columns: 1, separateLinks: true, visible: true, content: "" },
    awards: { id: "awards", name: "Awards", columns: 1, separateLinks: true, visible: true, items: [] },
    certifications: { id: "certifications", name: "Certifications", columns: 1, separateLinks: true, visible: true, items: [] },
    education: { id: "education", name: "Education", columns: 1, separateLinks: true, visible: true, items: [] },
    experience: { id: "experience", name: "Experience", columns: 1, separateLinks: true, visible: true, items: [] },
    volunteer: { id: "volunteer", name: "Volunteering", columns: 1, separateLinks: true, visible: true, items: [] },
    interests: { id: "interests", name: "Interests", columns: 1, separateLinks: true, visible: true, items: [] },
    languages: { id: "languages", name: "Languages", columns: 1, separateLinks: true, visible: true, items: [] },
    profiles: { id: "profiles", name: "Profiles", columns: 1, separateLinks: true, visible: true, items: [] },
    projects: { id: "projects", name: "Projects", columns: 1, separateLinks: true, visible: true, items: [] },
    publications: { id: "publications", name: "Publications", columns: 1, separateLinks: true, visible: true, items: [] },
    references: { id: "references", name: "References", columns: 1, separateLinks: true, visible: true, items: [] },
    skills: { id: "skills", name: "Skills", columns: 1, separateLinks: true, visible: true, items: [] },
    custom: {},
  },
  metadata: {
    template: "rhyhorn",
    layout: [
      [["profiles", "summary", "experience", "education", "projects", "volunteer", "references"], ["skills", "interests", "certifications", "awards", "publications", "languages"]],
    ],
    css: { value: "", visible: false },
    page: { margin: 18, format: "a4", options: { breakLine: true, pageNumbers: true } },
    theme: { background: "#ffffff", text: "#000000", primary: "#dc2626" },
    typography: { font: { family: "IBM Plex Sans", subset: "latin", variants: ["regular", "italic", "600"], size: 14 }, lineHeight: 1.5, hideIcons: false, underlineLinks: true },
    notes: "",
  },
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const create = mutation({
  args: {
    title: v.string(),
    slug: v.optional(v.string()),
    visibility: v.optional(v.union(v.literal("private"), v.literal("public"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const slug = args.slug || slugify(args.title);

    // Check for duplicate slug
    const existing = await ctx.db
      .query("resumes")
      .withIndex("by_user_slug", (q) => q.eq("userId", user._id).eq("slug", slug))
      .first();

    if (existing) throw new Error("Resume slug already exists");

    // Create resume with user data populated
    const data = {
      ...defaultResumeData,
      basics: {
        ...defaultResumeData.basics,
        name: user.name,
        email: user.email,
        picture: {
          ...defaultResumeData.basics.picture,
          url: user.picture ?? "",
        },
      },
    };

    const resumeId = await ctx.db.insert("resumes", {
      title: args.title,
      slug,
      data,
      visibility: args.visibility || "private",
      locked: false,
      userId: user._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create statistics record
    await ctx.db.insert("statistics", {
      resumeId,
      views: 0,
      downloads: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return resumeId;
  },
});

export const list = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return [];

    return await ctx.db
      .query("resumes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("resumes") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null; // Return null instead of throwing when not authenticated

    const resume = await ctx.db.get(id);
    if (!resume) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || resume.userId !== user._id) {
      return null; // Return null instead of throwing when unauthorized
    }

    return resume;
  },
});

export const getPublicByUsernameSlug = query({
  args: { username: v.string(), slug: v.string() },
  handler: async (ctx, { username, slug }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .first();

    if (!user) return null;

    const resume = await ctx.db
      .query("resumes")
      .withIndex("by_user_slug", (q) => q.eq("userId", user._id).eq("slug", slug))
      .first();

    if (!resume || resume.visibility !== "public") {
      return null;
    }

    // Redact private notes
    const data = { ...resume.data };
    if (data.metadata) {
      data.metadata = { ...data.metadata, notes: "" };
    }

    return { ...resume, data, user: { name: user.name, username: user.username } };
  },
});

export const update = mutation({
  args: {
    id: v.id("resumes"),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    visibility: v.optional(v.union(v.literal("private"), v.literal("public"))),
    data: v.optional(v.any()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const resume = await ctx.db.get(id);
    if (!resume) throw new Error("Resume not found");

    if (resume.locked) throw new Error("Resume is locked");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || resume.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    const patchData: Record<string, unknown> = { updatedAt: Date.now() };

    if (updates.title !== undefined) patchData.title = updates.title;
    if (updates.slug !== undefined) patchData.slug = updates.slug;
    if (updates.visibility !== undefined) patchData.visibility = updates.visibility;
    if (updates.data !== undefined) patchData.data = updates.data;

    await ctx.db.patch(id, patchData);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("resumes") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const resume = await ctx.db.get(id);
    if (!resume) throw new Error("Resume not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || resume.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    // Delete statistics
    const stats = await ctx.db
      .query("statistics")
      .withIndex("by_resume", (q) => q.eq("resumeId", id))
      .first();

    if (stats) await ctx.db.delete(stats._id);

    await ctx.db.delete(id);
  },
});

export const lock = mutation({
  args: { id: v.id("resumes"), locked: v.boolean() },
  handler: async (ctx, { id, locked }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const resume = await ctx.db.get(id);
    if (!resume) throw new Error("Resume not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || resume.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(id, { locked, updatedAt: Date.now() });
  },
});

// Internal query for getting a resume by ID (for API routes that handle their own auth)
export const getByIdInternal = query({
  args: { id: v.id("resumes") },
  handler: async (ctx, { id }) => {
    const resume = await ctx.db.get(id);
    return resume;
  },
});

export const duplicate = mutation({
  args: { id: v.id("resumes") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const resume = await ctx.db.get(id);
    if (!resume) throw new Error("Resume not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || resume.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    // Generate unique slug
    let newSlug = `${resume.slug}-copy`;
    let counter = 1;
    while (true) {
      const existing = await ctx.db
        .query("resumes")
        .withIndex("by_user_slug", (q) => q.eq("userId", user._id).eq("slug", newSlug))
        .first();

      if (!existing) break;
      newSlug = `${resume.slug}-copy-${counter}`;
      counter++;
    }

    const newResumeId = await ctx.db.insert("resumes", {
      title: `${resume.title} (Copy)`,
      slug: newSlug,
      data: resume.data,
      visibility: "private",
      locked: false,
      userId: user._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create statistics record
    await ctx.db.insert("statistics", {
      resumeId: newResumeId,
      views: 0,
      downloads: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return newResumeId;
  },
});
