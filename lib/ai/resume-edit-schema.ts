import { z } from "zod";

const urlSchema = z.object({
  label: z.string(),
  href: z.string(),
});

const itemSchema = z.object({
  id: z.string(),
  visible: z.boolean(),
});

const sectionSchema = z.object({
  name: z.string(),
  columns: z.number(),
  separateLinks: z.boolean(),
  visible: z.boolean(),
});

const basicsSchema = z.object({
  name: z.string(),
  headline: z.string(),
  email: z.string(),
  phone: z.string(),
  location: z.string(),
  url: urlSchema,
  customFields: z.array(
    z.object({
      id: z.string(),
      icon: z.string(),
      name: z.string(),
      value: z.string(),
    }),
  ),
  picture: z.object({
    url: z.string(),
    size: z.number(),
    aspectRatio: z.number(),
    borderRadius: z.number(),
    effects: z.object({
      hidden: z.boolean(),
      border: z.boolean(),
      grayscale: z.boolean(),
    }),
  }),
});

const awardSchema = itemSchema.extend({
  title: z.string(),
  awarder: z.string(),
  date: z.string(),
  summary: z.string(),
  url: urlSchema,
});

const certificationSchema = itemSchema.extend({
  name: z.string(),
  issuer: z.string(),
  date: z.string(),
  summary: z.string(),
  url: urlSchema,
});

const educationSchema = itemSchema.extend({
  institution: z.string(),
  studyType: z.string(),
  area: z.string(),
  score: z.string(),
  date: z.string(),
  summary: z.string(),
  url: urlSchema,
});

const experienceSchema = itemSchema.extend({
  company: z.string(),
  position: z.string(),
  location: z.string(),
  date: z.string(),
  summary: z.string(),
  url: urlSchema,
});

const volunteerSchema = itemSchema.extend({
  organization: z.string(),
  position: z.string(),
  location: z.string(),
  date: z.string(),
  summary: z.string(),
  url: urlSchema,
});

const interestSchema = itemSchema.extend({
  name: z.string(),
  keywords: z.array(z.string()),
});

const languageSchema = itemSchema.extend({
  name: z.string(),
  description: z.string(),
  level: z.number(),
});

const profileSchema = itemSchema.extend({
  network: z.string(),
  username: z.string(),
  icon: z.string(),
  url: urlSchema,
});

const projectSchema = itemSchema.extend({
  name: z.string(),
  description: z.string(),
  date: z.string(),
  summary: z.string(),
  keywords: z.array(z.string()),
  url: urlSchema,
});

const publicationSchema = itemSchema.extend({
  name: z.string(),
  publisher: z.string(),
  date: z.string(),
  summary: z.string(),
  url: urlSchema,
});

const referenceSchema = itemSchema.extend({
  name: z.string(),
  description: z.string(),
  summary: z.string(),
  url: urlSchema,
});

const skillSchema = itemSchema.extend({
  name: z.string(),
  description: z.string(),
  level: z.number(),
  keywords: z.array(z.string()),
});

const customSectionItemSchema = itemSchema.extend({
  name: z.string(),
  description: z.string(),
  date: z.string(),
  location: z.string(),
  summary: z.string(),
  keywords: z.array(z.string()),
  url: urlSchema,
});

const customSectionGroupSchema = sectionSchema.extend({
  id: z.string(),
  items: z.array(customSectionItemSchema),
});

const customSectionRecordSchema = z
  .object({})
  .catchall(customSectionGroupSchema);

const sectionsSchema = z.object({
  summary: sectionSchema.extend({
    id: z.literal("summary"),
    content: z.string(),
  }),
  awards: sectionSchema.extend({
    id: z.literal("awards"),
    items: z.array(awardSchema),
  }),
  certifications: sectionSchema.extend({
    id: z.literal("certifications"),
    items: z.array(certificationSchema),
  }),
  education: sectionSchema.extend({
    id: z.literal("education"),
    items: z.array(educationSchema),
  }),
  experience: sectionSchema.extend({
    id: z.literal("experience"),
    items: z.array(experienceSchema),
  }),
  volunteer: sectionSchema.extend({
    id: z.literal("volunteer"),
    items: z.array(volunteerSchema),
  }),
  interests: sectionSchema.extend({
    id: z.literal("interests"),
    items: z.array(interestSchema),
  }),
  languages: sectionSchema.extend({
    id: z.literal("languages"),
    items: z.array(languageSchema),
  }),
  profiles: sectionSchema.extend({
    id: z.literal("profiles"),
    items: z.array(profileSchema),
  }),
  projects: sectionSchema.extend({
    id: z.literal("projects"),
    items: z.array(projectSchema),
  }),
  publications: sectionSchema.extend({
    id: z.literal("publications"),
    items: z.array(publicationSchema),
  }),
  references: sectionSchema.extend({
    id: z.literal("references"),
    items: z.array(referenceSchema),
  }),
  skills: sectionSchema.extend({
    id: z.literal("skills"),
    items: z.array(skillSchema),
  }),
  custom: customSectionRecordSchema,
});

const metadataSchema = z.object({
  template: z.string(),
  layout: z.array(z.array(z.array(z.string()))),
  css: z.object({
    value: z.string(),
    visible: z.boolean(),
  }),
  page: z.object({
    margin: z.number(),
    format: z.enum(["a4", "letter"]),
    options: z.object({
      breakLine: z.boolean(),
      pageNumbers: z.boolean(),
    }),
  }),
  theme: z.object({
    background: z.string(),
    text: z.string(),
    primary: z.string(),
  }),
  typography: z.object({
    font: z.object({
      family: z.string(),
      subset: z.string(),
      variants: z.array(z.string()),
      size: z.number(),
    }),
    lineHeight: z.number(),
    hideIcons: z.boolean(),
    underlineLinks: z.boolean(),
  }),
  notes: z.string(),
});

export const resumeEditSchema = z.object({
  basics: basicsSchema,
  sections: sectionsSchema,
  metadata: metadataSchema,
});
